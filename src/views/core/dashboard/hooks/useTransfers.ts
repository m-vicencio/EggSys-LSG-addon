import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { transfersApi } from "@/lib/api";
import { useAccountStore } from "@/store/accountStore";
import type { Transfer } from "@/views/core/dashboard/interfaces/dashboard";

export function useTransfers(accountId: string | null) {
  const queryClient = useQueryClient();
  const adjustBalance = useAccountStore((s) => s.adjustBalance);

  const {
    data: transfers = [],
    isLoading,
    isError,
  } = useQuery<Transfer[]>({
    queryKey: ["transfers", accountId],
    queryFn: () => (accountId ? transfersApi.getByAccount(accountId) : []),
    enabled: !!accountId,
  });

  useEffect(() => {
    if (isError) {
      toast.error("Error al cargar las transferencias", {
        description:
          "No pudimos obtener el historial de transferencias. Por favor, intenta de nuevo.",
      });
    }
  }, [isError]);

  const createMutation = useMutation({
    mutationFn: (data: {
      fromAccountId: string;
      toAccountId: string;
      amount: number;
      date?: string;
      comment?: string;
    }) => transfersApi.create(data),
    onSuccess: (_, variables) => {
      adjustBalance(variables.fromAccountId, -variables.amount);
      adjustBalance(variables.toAccountId, variables.amount);

      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });

      toast.success("Transferencia exitosa", {
        description:
          "El dinero se ha transferido correctamente entre tus cuentas.",
      });
    },
    onError: () => {
      toast.error("Error en la transferencia", {
        description:
          "Hubo un problema al intentar procesar la transferencia. Revisa los datos e inténtalo nuevamente.",
      });
    },
  });

  return {
    transfers,
    isLoading,
    isError,
    createTransfer: createMutation.mutateAsync,
    isPending: createMutation.isPending,
  };
}
