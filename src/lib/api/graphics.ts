async function handleResponse<T>(
  res: Response | Promise<Response>,
): Promise<T> {
  const response = await res;
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.message ?? `Error ${response.status}`);
  }
  return response.json();
}

type ExpectationSlice = { category: string; valor: number };

export const graphicsApi = {
  getIncomeVsExpense: async (
    accountId?: string,
    month?: number,
    year?: number,
  ): Promise<{ date: string; ingreso: number; gasto: number }[]> => {
    const params = new URLSearchParams();
    if (accountId) params.set("accountId", accountId);
    if (month !== undefined) params.set("month", String(month));
    if (year !== undefined) params.set("year", String(year));
    const q = params.toString();
    const json = await handleResponse<{
      data: { date: string; ingreso: number; gasto: number }[];
    }>(fetch(`/api/graphics/income-vs-expense${q ? `?${q}` : ""}`));
    return json?.data ?? [];
  },
  getWeeklySpend: async (
    accountId?: string,
    month?: number,
    year?: number,
  ): Promise<{ semana: string; gasto: number }[]> => {
    const params = new URLSearchParams();
    if (accountId) params.set("accountId", accountId);
    if (month !== undefined) params.set("month", String(month));
    if (year !== undefined) params.set("year", String(year));
    const q = params.toString();
    const json = await handleResponse<{
      data: { semana: string; gasto: number }[];
    }>(fetch(`/api/graphics/weekly-spend${q ? `?${q}` : ""}`));
    return json?.data ?? [];
  },
  getTopCategories: async (
    accountId?: string,
    month?: number,
    year?: number,
    limit?: number,
  ): Promise<
    { categoryId: string; name: string; value: number; fill?: string }[]
  > => {
    const params = new URLSearchParams();
    if (accountId) params.set("accountId", accountId);
    if (month !== undefined) params.set("month", String(month));
    if (year !== undefined) params.set("year", String(year));
    if (limit !== undefined) params.set("limit", String(limit));
    const q = params.toString();
    const json = await handleResponse<{
      data: {
        categoryId: string;
        name: string;
        value: number;
        fill?: string;
      }[];
    }>(fetch(`/api/graphics/top-categories${q ? `?${q}` : ""}`));
    return json?.data ?? [];
  },
  getMoneyInOut: async (
    accountId?: string,
    month?: number,
    year?: number,
  ): Promise<{ categoria: string; esperado: number; real: number }[]> => {
    const params = new URLSearchParams();
    if (accountId) params.set("accountId", accountId);
    if (month !== undefined) params.set("month", String(month));
    if (year !== undefined) params.set("year", String(year));
    const q = params.toString();
    const json = await handleResponse<{
      data: { categoria: string; esperado: number; real: number }[];
    }>(fetch(`/api/graphics/money-in-out${q ? `?${q}` : ""}`));
    return json?.data ?? [];
  },
  getExpectationPie: async (
    accountId?: string,
    month?: number,
    year?: number,
  ): Promise<{ expected: ExpectationSlice[]; real: ExpectationSlice[] }> => {
    const params = new URLSearchParams();
    if (accountId) params.set("accountId", accountId);
    if (month !== undefined) params.set("month", String(month));
    if (year !== undefined) params.set("year", String(year));
    const q = params.toString();
    const json = await handleResponse<{
      data: { expected: ExpectationSlice[]; real: ExpectationSlice[] };
    }>(fetch(`/api/graphics/expectation-pie${q ? `?${q}` : ""}`));
    return json?.data ?? { expected: [], real: [] };
  },
  getCumulativeSpend: async (
    accountId?: string,
    month?: number,
    year?: number,
  ): Promise<{ date: string; ingreso: number; gasto: number }[]> => {
    const params = new URLSearchParams();
    if (accountId) params.set("accountId", accountId);
    if (month !== undefined) params.set("month", String(month));
    if (year !== undefined) params.set("year", String(year));
    const q = params.toString();
    const json = await handleResponse<{
      data: { date: string; ingreso: number; gasto: number }[];
    }>(fetch(`/api/graphics/cumulative-spend${q ? `?${q}` : ""}`));
    return json?.data ?? [];
  },
  getCategoryDetail: async (
    categoryId: string,
    accountId?: string,
    month?: number,
    year?: number,
  ): Promise<any[]> => {
    const params = new URLSearchParams();
    if (accountId) params.set("accountId", accountId);
    if (month !== undefined) params.set("month", String(month));
    if (year !== undefined) params.set("year", String(year));
    params.set("categoryId", categoryId);
    const q = params.toString();
    const json = await handleResponse<{ data: any[] }>(
      fetch(`/api/graphics/category-detail?${q}`),
    );
    return json?.data ?? [];
  },
  getBudgetsSummary: async (
    accountId?: string,
    month?: number,
    year?: number,
  ): Promise<
    {
      categoryId: string;
      label: string;
      type: string;
      expected: number;
      real: number;
    }[]
  > => {
    const params = new URLSearchParams();
    if (accountId) params.set("accountId", accountId);
    if (month !== undefined) params.set("month", String(month));
    if (year !== undefined) params.set("year", String(year));
    const q = params.toString();
    const json = await handleResponse<{
      data: {
        categoryId: string;
        label: string;
        type: string;
        expected: number;
        real: number;
      }[];
    }>(fetch(`/api/graphics/budgets-summary${q ? `?${q}` : ""}`));
    return json?.data ?? [];
  },
};
