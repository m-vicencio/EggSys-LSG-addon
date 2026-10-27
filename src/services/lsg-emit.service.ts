import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { flushOutbox, getConnection, lsgAddonEnabled } from "./lsg.service";
import { getSpentByCategory } from "./transaction.service";

/**
 * Detectores de conducta financiera → outbox LSG.
 *
 * EggSys solo DETECTA; el adaptador puntúa. Ningún payload contiene montos,
 * saldos ni texto libre del usuario. Toda llamada externa debe envolverse en
 * `.catch(() => {})`: el addon jamás puede romper una operación financiera.
 */

// ─── client_ref determinista (UUIDv5) ─────────────────────────────────────────

const LSG_NAMESPACE = "a5e0e6a2-8f4e-4b7a-9d1c-3f2a1b0c9d8e";

/** UUIDv5 (SHA-1) determinista: mismo evento → mismo UUID → idempotencia gratis. */
export function uuid5(name: string, namespace: string = LSG_NAMESPACE): string {
  const nsBytes = Buffer.from(namespace.replace(/-/g, ""), "hex");
  const hash = createHash("sha1")
    .update(nsBytes)
    .update(name)
    .digest()
    .subarray(0, 16);
  hash[6] = (hash[6] & 0x0f) | 0x50; // versión 5
  hash[8] = (hash[8] & 0x3f) | 0x80; // variante RFC 4122
  const hex = hash.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// ─── Emisión base ─────────────────────────────────────────────────────────────

type EmitInput = {
  userId: string;
  eventType: string;
  periodKey: string;
  payload: Record<string, string | number | boolean>;
  occurredAt?: Date;
};

/**
 * Inserta un evento en el outbox (idempotente vía clientRef determinista)
 * y dispara el flush fire-and-forget. No-op si el addon o el usuario no
 * están habilitados.
 */
async function emit(input: EmitInput): Promise<void> {
  if (!lsgAddonEnabled()) return;
  const connection = await getConnection(input.userId);
  if (!connection?.enabled) return;
  if (connection.disabledEvents.includes(input.eventType)) return;

  const clientRef = uuid5(
    `${input.eventType}:${input.periodKey}:${input.userId}`,
  );
  try {
    await prisma.lsgEventOutbox.create({
      data: {
        userId: input.userId,
        eventType: input.eventType,
        periodKey: input.periodKey,
        clientRef,
        payload: input.payload,
        occurredAt: input.occurredAt ?? new Date(),
      },
    });
  } catch {
    // Choque del @@unique: el evento ya fue emitido para este periodo → no-op
    return;
  }
  void flushOutbox(input.userId).catch(() => {});
}

// ─── Helpers de periodo ───────────────────────────────────────────────────────

/** Semana ISO, ej. "2026-W29". */
export function isoWeekKey(date: Date): string {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function isoWeekStart(date: Date): Date {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - (dayNum - 1));
  return d;
}

// ─── Detectores ───────────────────────────────────────────────────────────────

type TransactionLike = {
  id: string;
  userId: string;
  date: Date;
  tags: string[];
  comment: string | null;
};

/**
 * Llamado tras crear una transacción. Evalúa:
 *  - tx.descriptive_entry: ≥1 tag y comentario ≥20 caracteres, no repetido
 *  - streak.daily_logging: ≥5 días distintos con registro en la semana ISO
 *  - budget.month_met: evaluación perezosa del mes anterior (idempotente)
 */
async function transactionCreated(tx: TransactionLike): Promise<void> {
  if (!lsgAddonEnabled()) return;

  // Entrada descriptiva: solo señales (longitud/conteo), nunca el texto
  const comment = tx.comment?.trim() ?? "";
  if (tx.tags.length > 0 && comment.length >= 20) {
    const previous = await prisma.transaction.findFirst({
      where: { userId: tx.userId, id: { not: tx.id }, comment: { not: null } },
      orderBy: { createdAt: "desc" },
      select: { comment: true },
    });
    if (previous?.comment?.trim() !== comment) {
      await emit({
        userId: tx.userId,
        eventType: "tx.descriptive_entry",
        periodKey: `tx:${tx.id}`,
        payload: { tag_count: tx.tags.length, comment_length: comment.length },
        occurredAt: tx.date,
      });
    }
  }

  // Racha semanal: días distintos con registro en la semana ISO actual
  const weekStart = isoWeekStart(tx.date);
  const txs = await prisma.transaction.findMany({
    where: { userId: tx.userId, date: { gte: weekStart } },
    select: { date: true },
  });
  const distinctDays = new Set(
    txs.map((t) => t.date.toISOString().slice(0, 10)),
  );
  if (distinctDays.size >= 5) {
    await emit({
      userId: tx.userId,
      eventType: "streak.daily_logging",
      periodKey: isoWeekKey(tx.date),
      payload: {
        distinct_days: distinctDays.size,
        week_start: weekStart.toISOString().slice(0, 10),
      },
      occurredAt: tx.date,
    });
  }

  // Evaluador mensual perezoso: corre al registrar transacciones en vez de un
  // cron; el @@unique del outbox absorbe las repeticiones. Si algún día hay
  // scheduler real, mover esta llamada allí.
  await evaluatePreviousMonthBudgets(tx.userId);
}

/**
 * Evalúa los presupuestos del mes anterior: gasto ≤ idealAmount y presupuesto
 * creado ≥15 días antes del cierre del mes (evita presupuestos laxos de último
 * minuto). Idempotente por periodKey "YYYY-MM:budgetId".
 */
export async function evaluatePreviousMonthBudgets(
  userId: string,
): Promise<void> {
  if (!lsgAddonEnabled()) return;
  const now = new Date();
  const prev = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
  );
  const month = prev.getUTCMonth() + 1;
  const year = prev.getUTCFullYear();
  const monthEnd = new Date(Date.UTC(year, month, 1)); // primer día del mes siguiente
  const minCreatedAt = new Date(monthEnd.getTime() - 15 * 86400000);

  const budgets = await prisma.budget.findMany({
    where: { userId, createdAt: { lt: minCreatedAt } },
    select: { id: true, idealAmount: true, categoryId: true, accountId: true },
  });
  if (budgets.length === 0) return;

  const spent = await getSpentByCategory(userId, month, year);
  const spentByCategory = new Map(spent.map((s) => [s.categoryId, s.amount]));

  for (const budget of budgets) {
    const spentAmount = spentByCategory.get(budget.categoryId) ?? 0;
    if (spentAmount <= Number(budget.idealAmount)) {
      await emit({
        userId,
        eventType: "budget.month_met",
        periodKey: `${year}-${String(month).padStart(2, "0")}:${budget.id}`,
        payload: {
          // señal conductual: cumplimiento relativo, sin montos
          spent_ratio:
            Number(budget.idealAmount) > 0
              ? Math.round((spentAmount / Number(budget.idealAmount)) * 100) /
                100
              : 0,
          month: `${year}-${String(month).padStart(2, "0")}`,
        },
        occurredAt: monthEnd,
      });
    }
  }
}

/**
 * Llamado tras sincronizar la mascota de una cuenta de ahorro. Detecta cruces
 * de umbral (25/50/75/100 %) hacia arriba, actualiza SavingProgress.lastMilestone
 * y emite un evento por umbral cruzado (una vez por cuenta y umbral, para siempre).
 */
async function savingsMilestone(accountId: string): Promise<void> {
  const account = await prisma.appAccount.findUnique({
    where: { id: accountId },
    select: { userId: true, isSavings: true, savingGoal: true, balance: true },
  });
  if (!account?.isSavings || !account.savingGoal || !account.userId) return;

  const progressPercent = Math.min(
    100,
    Math.floor((Number(account.balance) / Number(account.savingGoal)) * 100),
  );

  const progress = await prisma.savingProgress.upsert({
    where: { accountId },
    create: { accountId, progressPercent, lastMilestone: 0 },
    update: { progressPercent, updatedAt: new Date() },
  });

  const milestones = [25, 50, 75, 100].filter(
    (m) => m > progress.lastMilestone && progressPercent >= m,
  );
  if (milestones.length === 0) return;

  await prisma.savingProgress.update({
    where: { accountId },
    data: { lastMilestone: milestones[milestones.length - 1] },
  });

  if (!lsgAddonEnabled()) return;
  for (const milestone of milestones) {
    await emit({
      userId: account.userId,
      eventType: "savings.milestone",
      periodKey: `${accountId}:${milestone}`,
      payload: { milestone, progress_percent: progressPercent },
    });
  }
}

export const emitLsgEvent = {
  transactionCreated,
  savingsMilestone,
};

// ─── Self-check mínimo (convención del repo: sin suite de tests) ──────────────
// Ejecutar con: npx tsx src/services/lsg-emit.service.ts
if (typeof require !== "undefined" && require.main === module) {
  const a = uuid5("streak.daily_logging:2026-W29:usr_abc");
  const b = uuid5("streak.daily_logging:2026-W29:usr_abc");
  const c = uuid5("streak.daily_logging:2026-W30:usr_abc");
  console.assert(a === b, "uuid5 debe ser determinista");
  console.assert(a !== c, "periodos distintos deben producir UUIDs distintos");
  console.assert(
    /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
      a,
    ),
    "formato UUIDv5",
  );
  console.assert(
    isoWeekKey(new Date(Date.UTC(2026, 0, 1))) === "2026-W01",
    "semana ISO de año nuevo",
  );
  console.assert(
    isoWeekKey(new Date(Date.UTC(2026, 6, 20))) === "2026-W30",
    "semana ISO de hoy",
  );
  console.log("✔ self-check lsg-emit OK", a);
}
