import type { AppAccount } from "@/views/core/dashboard/interfaces/dashboard";

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

export const accountsApi = {
  /** Obtiene todas las cuentas del usuario autenticado */
  getAll: async (): Promise<AppAccount[]> => {
    const json = await handleResponse<{ data: AppAccount[] }>(
      await fetch("/api/accounts"),
    );
    return json?.data ?? [];
  },

  /** Crea una nueva cuenta */
  create: (data: {
    name: string;
    balance?: number;
    currency?: string;
    isSavings?: boolean;
    savingGoal?: number;
  }) =>
    handleResponse(
      fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    ),

  /** Actualiza una cuenta existente */
  update: (
    id: string,
    data: {
      name?: string;
      balance?: number;
      isSavings?: boolean;
      savingGoal?: number;
    },
  ) =>
    handleResponse(
      fetch(`/api/accounts/${id?.toString().trim()}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    ),

  /** Elimina una cuenta */
  delete: (id: string) =>
    handleResponse(
      fetch(`/api/accounts/${id?.toString().trim()}`, { method: "DELETE" }),
    ),

  /** Marca una cuenta como predeterminada */
  setDefault: (id: string) =>
    handleResponse(
      fetch(`/api/accounts/${id?.toString().trim()}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      }),
    ),
  unsetDefault: () =>
    handleResponse(
      fetch(`/api/accounts/default`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: false }),
      }),
    ),
};
