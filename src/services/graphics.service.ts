import { prisma } from "@/lib/prisma";

export async function getWeeklySpend(
  userId: string,
  month: number,
  year: number,
  accountId?: string,
) {
  const txs = await prisma.transaction.findMany({
    where: {
      userId,
      type: "EXPENSE",
      month,
      year,
      ...(accountId ? { accountId } : {}),
    },
    select: { amount: true, date: true },
  });

  const buckets = [0, 0, 0, 0, 0];
  for (const t of txs) {
    const d = new Date(t.date);
    const day = d.getDate();
    const idx =
      day <= 7 ? 0 : day <= 14 ? 1 : day <= 21 ? 2 : day <= 28 ? 3 : 4;
    buckets[idx] += Number(t.amount);
  }

  return [
    { semana: "Días 1-7", gasto: Math.round(buckets[0]) },
    { semana: "Días 8-14", gasto: Math.round(buckets[1]) },
    { semana: "Días 15-21", gasto: Math.round(buckets[2]) },
    { semana: "Días 22-28", gasto: Math.round(buckets[3]) },
    { semana: "Días 29-31", gasto: Math.round(buckets[4]) },
  ];
}
export async function getTopCategories(
  userId: string,
  month: number,
  year: number,
  limit = 8,
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

  if (groups.length === 0) return [];
  const categoryIds = groups.map((g) => g.categoryId);
  const categories = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, name: true, iconName: true, color: true },
  });
  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const results = groups.map((g) => ({
    categoryId: g.categoryId,
    name: categoryMap.get(g.categoryId)?.name ?? "Sin categoría",
    iconName: categoryMap.get(g.categoryId)?.iconName ?? null,
    color: categoryMap.get(g.categoryId)?.color ?? null,
    value: Math.round(Number(g._sum.amount ?? 0)),
  }));

  return results.sort((a, b) => b.value - a.value).slice(0, limit);
}
export async function getMoneyInOut(
  userId: string,
  month: number,
  year: number,
  accountId?: string,
) {
  // real sums
  const income = await prisma.transaction.aggregate({
    where: {
      userId,
      type: "INCOME",
      month,
      year,
      ...(accountId ? { accountId } : {}),
    },
    _sum: { amount: true },
  });
  const expense = await prisma.transaction.aggregate({
    where: {
      userId,
      type: "EXPENSE",
      month,
      year,
      ...(accountId ? { accountId } : {}),
    },
    _sum: { amount: true },
  });

  // expected values: sum of budgets per category type for the account
  const budgets = await prisma.budget.findMany({
    where: { userId, ...(accountId ? { accountId } : {}) },
    include: { category: true },
  });

  const esperadoIngresos = budgets
    .filter((b) => b.category.type === "INCOME")
    .reduce((acc, b) => acc + Number(b.idealAmount ?? 0), 0);
  const esperadoGastos = budgets
    .filter((b) => b.category.type === "EXPENSE")
    .reduce((acc, b) => acc + Number(b.idealAmount ?? 0), 0);

  return [
    {
      categoria: "Ingresos",
      esperado: Math.round(esperadoIngresos),
      real: Math.round(Number(income._sum.amount ?? 0)),
    },
    {
      categoria: "Gastos",
      esperado: Math.round(esperadoGastos),
      real: Math.round(Number(expense._sum.amount ?? 0)),
    },
  ];
}
export async function getExpectationPie(
  userId: string,
  month: number,
  year: number,
  accountId?: string,
) {
  const budgets = await prisma.budget.findMany({
    where: {
      userId,
      ...(accountId ? { accountId } : {}),
      category: {
        type: "EXPENSE",
      },
    },
    include: { category: true },
  });

  const expected = budgets.map((b) => ({
    category: b.category.id,
    label: b.category.name,
    iconName: b.category.iconName ?? null,
    color: b.category.color ?? null,
    valor: Math.round(Number(b.idealAmount ?? 0)),
  }));

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

  if (groups.length === 0) {
    return { expected, real: [] };
  }
  const categoryIds = groups.map((g) => g.categoryId);
  const categories = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, name: true, iconName: true, color: true },
  });

  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  const real = groups.map((g) => ({
    category: g.categoryId,
    label: categoryMap.get(g.categoryId)?.name ?? "Sin categoría",
    iconName: categoryMap.get(g.categoryId)?.iconName ?? null,
    color: categoryMap.get(g.categoryId)?.color ?? null,
    valor: Math.round(Number(g._sum.amount ?? 0)),
  }));

  return { expected, real };
}
export async function getCumulativeSpend(
  userId: string,
  month: number,
  year: number,
  accountId?: string,
) {
  const txs = await prisma.transaction.findMany({
    where: { userId, month, year, ...(accountId ? { accountId } : {}) },
    orderBy: { date: "asc" },
    select: { amount: true, date: true, type: true },
  });

  const lastDay = new Date(year, month, 0).getDate();
  const result: { date: string; ingreso: number; gasto: number }[] = [];

  let cumIngreso = 0;
  let cumGasto = 0;
  let idx = 0;
  for (let day = 1; day <= lastDay; day++) {
    const currentDate = new Date(year, month - 1, day);
    while (idx < txs.length && new Date(txs[idx].date).getDate() === day) {
      const t = txs[idx];
      if (t.type === "INCOME") cumIngreso += Number(t.amount);
      else cumGasto += Number(t.amount);
      idx++;
    }
    result.push({
      date: currentDate.toISOString().slice(0, 10),
      ingreso: Math.round(cumIngreso),
      gasto: Math.round(cumGasto),
    });
  }

  return result;
}
export async function getIncomeVsExpense(
  userId: string,
  month: number,
  year: number,
  accountId?: string,
) {
  const txs = await prisma.transaction.findMany({
    where: { userId, month, year, ...(accountId ? { accountId } : {}) },
    orderBy: { date: "asc" },
    select: { amount: true, date: true, type: true },
  });
  const lastDay = new Date(year, month, 0).getDate();
  const result: { date: string; ingreso: number; gasto: number }[] = [];
  let idx = 0;
  for (let day = 1; day <= lastDay; day++) {
    const currentDate = new Date(year, month - 1, day);
    let dailyIngreso = 0;
    let dailyGasto = 0;
    while (idx < txs.length && new Date(txs[idx].date).getDate() === day) {
      const t = txs[idx];
      if (t.type === "INCOME") {
        dailyIngreso += Number(t.amount);
      } else {
        dailyGasto += Number(t.amount);
      }
      idx++;
    }

    result.push({
      date: currentDate.toISOString().slice(0, 10),
      ingreso: Math.round(dailyIngreso),
      gasto: Math.round(dailyGasto),
    });
  }

  return result;
}

export async function getCategoryDetail(
  userId: string,
  categoryId: string,
  month: number,
  year: number,
  accountId?: string,
) {
  const txs = await prisma.transaction.findMany({
    where: {
      userId,
      categoryId,
      month,
      year,
      ...(accountId ? { accountId } : {}),
    },
    orderBy: { date: "desc" },
  });

  return txs.map((t) => ({
    transactionId: t.id,
    date: t.date.toISOString(),
    amount: Math.round(Number(t.amount)),
    name: t.name,
    comment: t.comment,
  }));
}
export async function getBudgetsSummary(
  userId: string,
  month: number,
  year: number,
  accountId?: string,
) {
  // get budgets with category
  const budgets = await prisma.budget.findMany({
    where: { userId, ...(accountId ? { accountId } : {}) },
    include: { category: true },
  });

  // sum real amount by category for the month (INCOME and EXPENSE)
  const groups = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: {
      userId,
      // ELIMINAMOS EL FILTRO type: "EXPENSE" AQUÍ
      month,
      year,
      ...(accountId ? { accountId } : {}),
    },
    _sum: { amount: true },
  });

  const realMap = new Map<string, number>();
  for (const g of groups) {
    realMap.set(g.categoryId, Math.round(Number(g._sum.amount ?? 0)));
  }

  // build rows: include categories from budgets and also any category that has real transactions but no budget
  const rows: Array<{
    categoryId: string;
    label: string;
    iconName?: string | null;
    color?: string | null;
    type: string;
    expected: number;
    real: number;
  }> = [];

  for (const b of budgets) {
    rows.push({
      categoryId: b.categoryId,
      label: b.category.name,
      iconName: b.category.iconName ?? null,
      color: b.category.color ?? null,
      type: b.category.type,
      expected: Math.round(Number(b.idealAmount ?? 0)),
      real: realMap.get(b.categoryId) ?? 0,
    });
    realMap.delete(b.categoryId);
  }

  if (realMap.size > 0) {
    // fetch remaining category names
    const ids = Array.from(realMap.keys());
    const cats = await prisma.category.findMany({ where: { id: { in: ids } } });
    for (const c of cats) {
      rows.push({
        categoryId: c.id,
        label: c.name,
        iconName: c.iconName ?? null,
        color: c.color ?? null,
        type: c.type,
        expected: 0,
        real: realMap.get(c.id) ?? 0,
      });
    }
  }

  return rows.sort((a, b) => a.label.localeCompare(b.label));
}
