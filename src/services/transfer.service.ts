import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { syncPetProgressByAccount } from "./pet.service";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type CreateTransferInput = {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date?: string;
  comment?: string;
  userId: string;
};

// ─── Operaciones ──────────────────────────────────────────────────────────────

/** Lista las transferencias donde la cuenta es origen o destino */
export function getTransfersByAccount(userId: string, accountId?: string) {
  return prisma.transfer.findMany({
    where: {
      userId,
      ...(accountId
        ? { OR: [{ fromAccountId: accountId }, { toAccountId: accountId }] }
        : {}),
    },
    include: {
      fromAccount: { select: { id: true, name: true } },
      toAccount: { select: { id: true, name: true } },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
}

/**
 * Crea una transferencia entre dos cuentas del mismo usuario.
 * Ajusta ambos saldos atómicamente. Si la cuenta destino es una cuenta
 * de ahorro con meta, sincroniza el progreso de la mascota.
 */
export async function createTransfer(data: CreateTransferInput) {
  const { fromAccountId, toAccountId, amount, date, comment, userId } = data;

  // Verificar que ambas cuentas pertenecen al usuario
  const [fromAcc, toAcc] = await Promise.all([
    prisma.appAccount.findFirst({
      where: { id: fromAccountId, userId },
    }),
    prisma.appAccount.findFirst({
      where: { id: toAccountId, userId },
    }),
  ]);

  if (!fromAcc) throw new Error("Cuenta origen no encontrada");
  if (!toAcc) throw new Error("Cuenta destino no encontrada");
  if (fromAccountId === toAccountId)
    throw new Error("Las cuentas origen y destino deben ser distintas");
  if (Number(fromAcc.balance) < amount)
    throw new Error("Saldo insuficiente en la cuenta origen");

  // Crear transferencia y ajustar saldos en una transacción DB
  const transfer = await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      const created = await tx.transfer.create({
        data: {
          fromAccountId,
          toAccountId,
          amount,
          comment,
          userId,
          ...(date ? { date: new Date(date) } : {}),
        },
        include: {
          fromAccount: { select: { id: true, name: true } },
          toAccount: { select: { id: true, name: true } },
        },
      });

      // Restar de la cuenta origen
      await tx.appAccount.update({
        where: { id: fromAccountId },
        data: { balance: { decrement: amount } },
      });

      // Sumar a la cuenta destino
      await tx.appAccount.update({
        where: { id: toAccountId },
        data: { balance: { increment: amount } },
      });

      return created;
    },
  );

  await Promise.all([
    syncPetProgressByAccount(fromAccountId).catch(() => {
    }),
    syncPetProgressByAccount(toAccountId).catch(() => {
    }),
  ]);

  return transfer;
}
