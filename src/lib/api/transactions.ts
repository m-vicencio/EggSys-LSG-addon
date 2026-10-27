import type {
  Spent,
  Transaction,
} from "@/views/core/dashboard/interfaces/dashboard";

async function handleResponse<T>(
  res: Response | Promise<Response>,
): Promise<T> {
  const response = await res;
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.message ?? `Error ${response.status}`);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json();
}

export type CreateTransactionInput = {
  type: "INCOME" | "EXPENSE";
  amount: number;
  name: string;
  accountId: string;
  date: string;
  month: number;
  year: number;
  categoryId?: string;
  tags?: string[];
  comment?: string;
};

export type UpdateTransactionInput = Partial<CreateTransactionInput>;

export const transactionsApi = {
  /** Obtiene transacciones de una cuenta */
  getByAccount: async (accountId: string): Promise<Transaction[]> => {
    const json = await handleResponse<{ data: Transaction[] }>(
      fetch(`/api/transactions?accountId=${accountId}`),
    );
    return json?.data ?? [];
  },

  /** Obtiene una transacción por id */
  getById: async (id: string): Promise<Transaction> => {
    return handleResponse<Transaction>(fetch(`/api/transactions/${id}`));
  },

  /** Obtiene resumen de gasto por categoría para un mes dado */
  getSummaryByCategory: async (
    accountId?: string,
    month?: number,
    year?: number,
  ): Promise<Spent[]> => {
    const params = new URLSearchParams({ summaryByCategory: "1" });
    if (accountId) params.set("accountId", accountId);
    if (month) params.set("month", String(month));
    if (year) params.set("year", String(year));
    const json = await handleResponse<{ data: Spent[] }>(
      fetch(`/api/transactions?${params}`),
    );
    return json?.data ?? [];
  },

  /** Crea una nueva transacción */
  create: (data: CreateTransactionInput) =>
    handleResponse(
      fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    ),

  /** Actualiza una transacción existente */
  update: (id: string, data: UpdateTransactionInput) =>
    handleResponse(
      fetch(`/api/transactions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    ),

  /** Elimina una transacción */
  delete: (id: string) =>
    handleResponse(fetch(`/api/transactions/${id}`, { method: "DELETE" })),
};
