import type { Transfer } from "@/views/core/dashboard/interfaces/dashboard";

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

export type CreateTransferInput = {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date?: string;
  comment?: string;
};

export const transfersApi = {
  /** Obtiene transferencias donde la cuenta participa como origen o destino */
  getByAccount: async (accountId: string): Promise<Transfer[]> => {
    const json = await handleResponse<{ data: Transfer[] }>(
      fetch(`/api/transfers?accountId=${accountId}`),
    );
    return json?.data ?? [];
  },

  /** Crea una nueva transferencia entre cuentas */
  create: (data: CreateTransferInput) =>
    handleResponse<Transfer>(
      fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    ),
};
