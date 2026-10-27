import { prisma } from "@/lib/prisma";

// Definido localmente para evitar dependencia del export de @prisma/client,
// que varía según versión/entorno. Debe coincidir con el enum del schema.
type TransactionType = "INCOME" | "EXPENSE";

import { adjustBalance } from "./account.service";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type CreateTransactionInput = {
  name: string;
  amount: number;
  date?: string;
  month: number;
  year: number;
  type: TransactionType;
  source?: string;
  accountId: string;
  categoryId: string;
  userId: string;
  tags?: string[];
  comment?: string;
};

export type UpdateTransactionInput = Partial<
  Omit<CreateTransactionInput, "userId">
>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** El delta que aplica al saldo: INCOME suma, EXPENSE resta */
function balanceDelta(amount: number, type: TransactionType) {
  return type === "INCOME" ? amount : -amount;
}

// ─── Operaciones ──────────────────────────────────────────────────────────────

export function getTransactions(userId: string, accountId?: string) {
  return prisma.transaction.findMany({
    where: { userId, ...(accountId ? { accountId } : {}) },
    include: { category: true, account: true },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
}

/** Agrupa gastos del mes actual por categoría */
export async function getSpentByCategory(
  userId: string,
  month: number,
  year: number,
  accountId?: string,
) {
  const groups = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: {
      userId,
      type: "EXPENSE",
      month,
      year,
      ...(accountId ? { accountId } : {}),
    },
    _sum: { amount: true },
  });
  type GroupResult = { categoryId: string; _sum: { amount: number | null } };
  const typed = groups as GroupResult[];
  return typed.map((g) => ({
    categoryId: g.categoryId,
    amount: Number(g._sum.amount ?? 0),
  }));
}

export function getTransactionById(id: string) {
  return prisma.transaction.findUnique({
    where: { id },
    include: { category: true, account: true },
  });
}

export async function createTransaction(data: CreateTransactionInput) {
  const transaction = await prisma.transaction.create({ data });
  // Ajustar saldo de la cuenta
  await adjustBalance(data.accountId, balanceDelta(data.amount, data.type));
  // Addon LSG: detectar conductas; jamás puede romper la transacción ni
  // demorar la respuesta (fire-and-forget, igual que flushOutbox adentro).
  const { emitLsgEvent } = await import("./lsg-emit.service");
  void emitLsgEvent.transactionCreated(transaction).catch(() => {});

  return transaction;
}

export async function updateTransaction(
  id: string,
  data: UpdateTransactionInput,
) {
  // Si cambia monto o tipo necesitamos revertir el efecto anterior
  const old = await prisma.transaction.findUniqueOrThrow({ where: { id } });

  const updated = await prisma.transaction.update({ where: { id }, data });

  const oldDelta = balanceDelta(Number(old.amount), old.type);
  const newAmount = data.amount ?? Number(old.amount);
  const newType = data.type ?? old.type;
  const newDelta = balanceDelta(newAmount, newType);

  const newAccountId =
    (data as { accountId?: string }).accountId ?? old.accountId;
  if (newAccountId === old.accountId) {
    await adjustBalance(old.accountId, newDelta - oldDelta);
  } else {
    await adjustBalance(old.accountId, -oldDelta); // revertir en cuenta antigua
    await adjustBalance(newAccountId, newDelta); // aplicar en cuenta nueva
  }

  return updated;
}

export async function deleteTransaction(id: string) {
  const old = await prisma.transaction.findUniqueOrThrow({ where: { id } });
  await prisma.transaction.delete({ where: { id } });
  // Revertir el efecto en el saldo
  await adjustBalance(
    old.accountId,
    -balanceDelta(Number(old.amount), old.type),
  );
  return old;
}
