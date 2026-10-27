/**
 * Benchmark de POST /api/transactions con el addon LSG apagado vs encendido.
 *
 * Uso:
 *   npx tsx scripts/perf-lsg.ts --run=OFF
 *   npx tsx scripts/perf-lsg.ts --run=ON
 *
 * Prerequisitos:
 *   - npx playwright install chromium   (una sola vez)
 *   - PERF_EMAIL / PERF_PASSWORD: usuario ya existente en EggSys.
 *     Para --run=ON además debe estar vinculado a LSG desde /lifesync.
 *   - PERF_BASE_URL: default http://localhost:3001
 *   - Para --run=ON: PERF_LSG_ADAPTER_URL (default http://localhost:14142) y
 *     PERF_LSG_INGEST_SECRET (= LSG_INGEST_SECRET del adaptador). El script
 *     relaja y restaura el tope por regla de tx.descriptive_entry solo.
 *   - Para --run=ON también hay que subir a mano CAP_DAILY/CAP_WEEKLY/
 *     CAP_MONTHLY en el .env del adaptador y reiniciar ese contenedor: son
 *     Settings de Pydantic, no hay endpoint admin para tocarlos en caliente
 *     (ver eggsys-lsg-adapter/app/core/config.py).
 *   - Reiniciar `npm run dev` con LSG_ADDON_ENABLED en false/true según el
 *     run antes de invocar este script (no se lee en caliente).
 *
 * Patrón por corrida: 5 iteraciones de calentamiento (descartadas) + 30
 * medidas. Cada transacción usa el mismo payload salvo el comentario, que
 * varía solo para no chocar con la deduplicación de tx.descriptive_entry en
 * lsg-emit.service.ts (evento se descarta si el comentario es igual al de la
 * transacción anterior del usuario).
 */
import "dotenv/config";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const WARMUP = 5;
const MEASURED = 30;
const OUT_DIR = join(process.cwd(), "perf-results");

// Defaults v1 de la regla tx.descriptive_entry (rules.py DEFAULT_RULES);
// se restauran al terminar la corrida ON.
const DEFAULT_TX_DESCRIPTIVE_CAPS = { max_per_day: 3, max_per_month: 30 };

type Row = {
  run: string;
  iteration: number;
  timestamp_iso: string;
  duration_ms: number | "";
  http_status: number | "";
  outcome: "success" | "http_error" | "no_response";
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function parseArgs(): {
  condition: "OFF" | "ON";
  run: string;
  delayMs: number;
} {
  const condition = process.argv
    .find((a) => a.startsWith("--run="))
    ?.split("=")[1]
    ?.toUpperCase();
  if (condition !== "OFF" && condition !== "ON") {
    console.error(
      "Uso: tsx scripts/perf-lsg.ts --run=OFF|ON [--label=sufijo] [--delay=ms]",
    );
    process.exit(1);
  }
  // --label distingue el nombre de archivo/fila sin afectar la lógica de
  // relajar/restaurar topes, que sigue mirando la condición OFF/ON real.
  const label = process.argv
    .find((a) => a.startsWith("--label="))
    ?.split("=")[1];
  // --delay: pausa entre iteraciones (incluido calentamiento), para separar
  // el costo por request del efecto de ráfaga sobre el pool de conexiones.
  const delayMs = Number(
    process.argv.find((a) => a.startsWith("--delay="))?.split("=")[1] ?? 0,
  );
  return {
    condition,
    run: label ? `${condition}-${label}` : condition,
    delayMs,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function patchDescriptiveEntryRule(
  adapterUrl: string,
  secret: string,
  overrides: Record<string, unknown>,
): Promise<void> {
  const res = await fetch(`${adapterUrl}/admin/rules/tx.descriptive_entry`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify(overrides),
  });
  if (!res.ok) {
    throw new Error(
      `PATCH /admin/rules/tx.descriptive_entry -> ${res.status}: ${await res.text()}`,
    );
  }
}

function summarize(run: string, rows: Row[]) {
  const durations = rows
    .filter((r) => r.outcome === "success")
    .map((r) => r.duration_ms as number);
  const n = durations.length;
  const sorted = [...durations].sort((a, b) => a - b);
  const mean = n ? durations.reduce((a, b) => a + b, 0) / n : 0;
  const median = !n
    ? 0
    : n % 2
      ? sorted[(n - 1) / 2]
      : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  const variance = n
    ? durations.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(n - 1, 1)
    : 0;
  return {
    run,
    n,
    min_ms: sorted[0] ?? "",
    max_ms: sorted[n - 1] ?? "",
    mean_ms: Math.round(mean * 100) / 100,
    median_ms: median,
    stdev_ms: Math.round(Math.sqrt(variance) * 100) / 100,
    success_count: rows.filter((r) => r.outcome === "success").length,
    error_count: rows.filter((r) => r.outcome !== "success").length,
  };
}

function writeCsvs(run: string, rows: Row[]): void {
  mkdirSync(OUT_DIR, { recursive: true });

  const rawHeader =
    "run,iteration,timestamp_iso,duration_ms,http_status,outcome";
  const rawLines = rows.map((r) =>
    [
      r.run,
      r.iteration,
      r.timestamp_iso,
      r.duration_ms,
      r.http_status,
      r.outcome,
    ].join(","),
  );
  writeFileSync(
    join(OUT_DIR, `raw_${run}.csv`),
    [rawHeader, ...rawLines].join("\n"),
  );

  const summary = summarize(run, rows);
  const summaryHeader =
    "run,n,min_ms,max_ms,mean_ms,median_ms,stdev_ms,success_count,error_count";
  const summaryPath = join(OUT_DIR, "summary.csv");
  const existing = existsSync(summaryPath)
    ? readFileSync(summaryPath, "utf8").trimEnd().split("\n")
    : [summaryHeader];
  const kept = existing.filter(
    (l) => !l.startsWith(`${run},`) && l !== summaryHeader,
  );
  writeFileSync(
    summaryPath,
    `${[summaryHeader, ...kept, Object.values(summary).join(",")].join("\n")}\n`,
  );

  console.log(`\n${rows.length} filas -> ${join(OUT_DIR, `raw_${run}.csv`)}`);
  console.table(summary);
}

async function main() {
  const { condition, run, delayMs } = parseArgs();
  const baseUrl = process.env.PERF_BASE_URL ?? "http://localhost:3001";
  const email = process.env.PERF_EMAIL;
  const password = process.env.PERF_PASSWORD;
  if (!email || !password) {
    console.error("Definir PERF_EMAIL y PERF_PASSWORD.");
    process.exit(1);
  }

  const adapterUrl =
    process.env.PERF_LSG_ADAPTER_URL ?? "http://localhost:14142";
  const ingestSecret = process.env.PERF_LSG_INGEST_SECRET;

  if (condition === "ON") {
    if (!ingestSecret) {
      console.error("Definir PERF_LSG_INGEST_SECRET para --run=ON.");
      process.exit(1);
    }
    console.warn(
      "[perf-lsg] Recordatorio: CAP_DAILY/CAP_WEEKLY/CAP_MONTHLY del adaptador deben " +
        "estar subidos y el contenedor reiniciado ANTES de correr esto, y " +
        "LSG_ADDON_ENABLED=true debe estar activo en el dev server de EggSys.",
    );
    await patchDescriptiveEntryRule(adapterUrl, ingestSecret, {
      max_per_day: null,
      max_per_month: null,
    });
  }

  const browser = await chromium.launch();
  const rows: Row[] = [];
  try {
    const context = await browser.newContext({ baseURL: baseUrl });
    const page = await context.newPage();

    await page.goto("/login");
    await page.getByLabel("Correo Electrónico").fill(email);
    await page.getByLabel("Contraseña").fill(password);
    await page.getByRole("button", { name: /entrar a mi cuenta/i }).click();
    await page.waitForURL(`${baseUrl}/`);

    const { data: accounts } = await (
      await context.request.get("/api/accounts")
    ).json();
    const { data: categories } = await (
      await context.request.get("/api/categories")
    ).json();
    const account = accounts[0];
    const category =
      categories.find((c: { type: string }) => c.type === "INCOME") ??
      categories[0];
    if (!account || !category) {
      throw new Error(
        "El usuario de prueba necesita al menos 1 cuenta y 1 categoría.",
      );
    }

    const total = WARMUP + MEASURED;
    for (let i = 1; i <= total; i++) {
      const isWarmup = i <= WARMUP;
      const now = new Date();
      const payload = {
        name: "Perf LSG test",
        amount: 1000,
        type: "INCOME",
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        accountId: account.id,
        categoryId: category.id,
        tags: ["perf-test"],
        comment: `Prueba de rendimiento LSG constante #${pad(i)}`,
      };

      try {
        // requestfinished (no waitForResponse): timing().responseEnd solo queda
        // poblado una vez que el body terminó de bajar, no cuando llegan cabeceras.
        const [request] = await Promise.all([
          page.waitForEvent("requestfinished", {
            predicate: (r) =>
              r.url().endsWith("/api/transactions") && r.method() === "POST",
            timeout: 15_000,
          }),
          page.evaluate(
            (body) =>
              fetch("/api/transactions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
              }),
            payload,
          ),
        ]);

        if (!isWarmup) {
          const timing = request.timing();
          const status = (await request.response())?.status() ?? 0;
          rows.push({
            run,
            iteration: i - WARMUP,
            timestamp_iso: now.toISOString(),
            duration_ms: Math.round(timing.responseEnd),
            http_status: status,
            outcome: status >= 200 && status < 300 ? "success" : "http_error",
          });
        }
      } catch {
        if (!isWarmup) {
          rows.push({
            run,
            iteration: i - WARMUP,
            timestamp_iso: now.toISOString(),
            duration_ms: "",
            http_status: "",
            outcome: "no_response",
          });
        }
      }

      if (delayMs > 0 && i < total) {
        await sleep(delayMs);
      }
    }
  } finally {
    await browser.close();
    if (condition === "ON" && ingestSecret) {
      await patchDescriptiveEntryRule(
        adapterUrl,
        ingestSecret,
        DEFAULT_TX_DESCRIPTIVE_CAPS,
      ).catch((err) =>
        console.error(
          "No se pudo restaurar el tope de tx.descriptive_entry:",
          err,
        ),
      );
    }
  }

  writeCsvs(run, rows);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
