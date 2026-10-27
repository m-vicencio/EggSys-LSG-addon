import { prisma } from "@/lib/prisma";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type CreateBudgetInput = {
  name: string;
  idealAmount: number;
  categoryId: string;
  accountId: string;
  userId: string;
};

export type UpdateBudgetInput = Partial<Omit<CreateBudgetInput, "userId">>;

// ─── Operaciones ──────────────────────────────────────────────────────────────

export function getBudgetsByUser(userId: string, accountId?: string) {
  return prisma.budget.findMany({
    where: { userId, ...(accountId ? { accountId } : {}) },
    include: { category: true, account: { select: { currency: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export function getBudgetById(id: string) {
  return prisma.budget.findUnique({
    where: { id },
    include: { category: true },
  });
}

export function createBudget(data: CreateBudgetInput) {
  return prisma.budget.create({ data });
}

export function updateBudget(id: string, data: UpdateBudgetInput) {
  return prisma.budget.update({ where: { id }, data });
}

export function deleteBudget(id: string) {
  return prisma.budget.delete({ where: { id } });
}
