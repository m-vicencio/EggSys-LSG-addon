import type { Budget } from "@/views/core/dashboard/interfaces/dashboard";

async function handleResponse<T>(
  res: Response | Promise<Response>,
): Promise<T> {
  const response = await res;
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.message ?? `Error ${response.status}`);
  }
  // Some endpoints (DELETE) return 204 No Content; calling response.json()
  // will throw on an empty body. Be tolerant: try to parse JSON but
  // return `undefined` when there is no JSON body.
  return response
    .json()
    .catch(() => undefined as unknown as T);
}

export type CreateBudgetInput = {
  categoryId: string;
  idealAmount: number;
  name: string;
  accountId: string;
};

export type UpdateBudgetInput = {
  idealAmount?: number;
  name?: string;
};

export const budgetsApi = {
  /** Obtiene todos los presupuestos del usuario (opcionalmente filtrado por cuenta) */
  getByUser: async (accountId?: string): Promise<Budget[]> => {
    const params = new URLSearchParams();
    if (accountId) params.set("accountId", accountId);
    const json = await handleResponse<{ data?: Budget[] } | Budget[]>(
      fetch(`/api/budgets${params.size ? `?${params}` : ""}`),
    );
    const raw = Array.isArray(json) ? json : (json?.data ?? []);
    return raw.map((b: Budget & { account?: { currency?: string } }) => ({
      ...b,
      idealAmount: Number(b.idealAmount),
      currency: b.account?.currency ?? b.currency ?? "CLP",
    }));
  },

  /** Crea un nuevo presupuesto */
  create: (data: CreateBudgetInput) =>
    handleResponse(
      fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    ),

  /** Actualiza un presupuesto existente */
  update: (id: string, data: UpdateBudgetInput) =>
    handleResponse(
      fetch(`/api/budgets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    ),

  /** Elimina un presupuesto */
  delete: (id: string) =>
    handleResponse(fetch(`/api/budgets/${id}`, { method: "DELETE" })),
};
