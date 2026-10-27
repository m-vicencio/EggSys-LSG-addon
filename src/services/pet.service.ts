import { prisma } from "@/lib/prisma";

// ─── Constantes de progresión ─────────────────────────────────────────────────

/** Número máximo de niveles. Nivel MAX = mascota completamente evolucionada. */
const MAX_LEVEL = 10;

/**
 * XP necesaria para pasar del nivel N al N+1.
 * Nivel 1→2 = 100 XP, nivel 9→10 = 900 XP.
 */
export function xpForLevel(level: number): number {
  return 100 * Math.min(level, MAX_LEVEL - 1);
}

/** XP total acumulada para completar todos los niveles: 100+200+…+900 = 4500. */
const TOTAL_XP_POOL = Array.from(
  { length: MAX_LEVEL - 1 },
  (_, i) => 100 * (i + 1),
).reduce((a, b) => a + b, 0);

// ─── Etapa según % de progreso hacia la meta ─────────────────────────────────

/**
 * Etapa de la mascota basada en el porcentaje de la meta de ahorro cubierto.
 *
 *  0– 9% → EGG
 * 10–29% → CRUZADA1
 * 30–49% → CRUZADA2
 * 50–79% → CRUZADA3
 * 80–99% → HATCHED
 *   100% → PET
 */
function stageNameForProgress(progressPercent: number): string {
  if (progressPercent >= 100) return "PET";
  if (progressPercent >= 80) return "HATCHED";
  if (progressPercent >= 50) return "CRUZADA3";
  if (progressPercent >= 30) return "CRUZADA2";
  if (progressPercent >= 10) return "CRUZADA1";
  return "EGG";
}

// ─── Operación principal ──────────────────────────────────────────────────────

/**
 * Recalcula nivel y XP del pet a partir del saldo actual y la meta.
 * Siempre refleja el estado real de la cuenta, sin acumulación per-transacción.
 *
 * Ejemplo: balance=$600.000, savingGoal=$1.000.000 (60%)
 *   → totalXp = 0.60 × 4500 = 2700
 *   → nivel 7, currentXp 600/700, etapa CRUZADA3
 */
export async function syncPetProgress(
  petId: string,
  balance: number,
  savingGoal: number,
): Promise<void> {
  if (savingGoal <= 0) return;

  const progressPercent = Math.min(100, (balance / savingGoal) * 100);

  // XP total equivalente al progreso actual
  const totalXp = Math.floor((progressPercent / 100) * TOTAL_XP_POOL);

  // Derivar nivel y XP del nivel actual a partir del XP total
  let level = 1;
  let remaining = totalXp;
  while (level < MAX_LEVEL && remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level);
    level++;
  }
  const currentXp = remaining;

  const newStageName = stageNameForProgress(progressPercent);
  const pet = await prisma.pet.findUniqueOrThrow({ where: { id: petId } });
  const stageDef = await prisma.petStageDefinition.findUnique({
    where: { name: newStageName },
  });

  await prisma.pet.update({
    where: { id: petId },
    data: {
      level,
      currentXp,
      ...(stageDef && stageDef.id !== pet.stageId
        ? { stageId: stageDef.id }
        : {}),
    },
  });
}

/**
 * Sincroniza la mascota asociada a una cuenta de ahorro en base al saldo/meta actuales.
 * Es segura para invocar en cualquier cambio de saldo/meta: si no hay mascota o no aplica,
 * simplemente no hace nada.
 */
export async function syncPetProgressByAccount(
  accountId: string,
): Promise<void> {
  const account = await prisma.appAccount.findUnique({
    where: { id: accountId },
    select: {
      isSavings: true,
      savingGoal: true,
      balance: true,
      pet: { select: { id: true } },
    },
  });

  if (!account?.isSavings || !account.savingGoal || !account.pet) return;

  await syncPetProgress(
    account.pet.id,
    Number(account.balance),
    Number(account.savingGoal),
  );

  // Addon LSG: hitos de ahorro (además mantiene SavingProgress.lastMilestone)
  const { emitLsgEvent } = await import("./lsg-emit.service");
  await emitLsgEvent.savingsMilestone(accountId).catch(() => {});
}
