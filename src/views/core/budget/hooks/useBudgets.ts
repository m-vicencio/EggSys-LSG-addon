import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  budgetsApi,
  type CreateBudgetInput,
  type UpdateBudgetInput,
} from "@/lib/api";
import type { Budget } from "@/views/core/dashboard/interfaces/dashboard";

export function useBudgets(accountId?: string) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const cacheKey = ["budgets", accountId ?? "all"];

  const {
    data: budgets = [],
    isLoading,
    isError,
  } = useQuery<Budget[]>({
    queryKey: cacheKey,
    queryFn: () => budgetsApi.getByUser(accountId),
    enabled: !!session?.user?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => budgetsApi.delete(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: cacheKey });
      const previous = queryClient.getQueryData<Budget[]>(cacheKey);

      queryClient.setQueryData<Budget[]>(cacheKey, (old = []) =>
        old.filter((b) => b.id !== id),
      );

      return { previous };
    },
    onSuccess: () => {
      toast.success("Presupuesto eliminado", {
        description: "El presupuesto se eliminó correctamente.",
      });
    },
    onError: (_err, _variables, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(cacheKey, ctx.previous);
      }
      toast.error("Error al eliminar", {
        description:
          "No pudimos eliminar el presupuesto. Por favor, inténtalo de nuevo.",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
    },
  });

  const saveMutation = useMutation({
    mutationFn: (payload: {
      categoryId: string;
      amount: number;
      name: string;
      accountId: string;
      budgetId?: string;
    }) => {
      if (payload.budgetId) {
        return budgetsApi.update(payload.budgetId, {
          idealAmount: payload.amount,
          name: payload.name,
        } satisfies UpdateBudgetInput);
      }
      return budgetsApi.create({
        categoryId: payload.categoryId,
        idealAmount: payload.amount,
        name: payload.name,
        accountId: payload.accountId,
      } satisfies CreateBudgetInput);
    },
    onMutate: async (newBudget) => {
      await queryClient.cancelQueries({ queryKey: cacheKey });
      const previous = queryClient.getQueryData<Budget[]>(cacheKey);

      queryClient.setQueryData<Budget[]>(cacheKey, (old = []) => {
        if (newBudget.budgetId) {
          return old.map((b) =>
            b.id === newBudget.budgetId
              ? { ...b, idealAmount: newBudget.amount }
              : b,
          );
        }
        return [
          ...old,
          {
            id: "temp",
            name: newBudget.name,
            categoryId: newBudget.categoryId,
            accountId: newBudget.accountId,
            idealAmount: newBudget.amount,
          },
        ];
      });

      return { previous };
    },
    onSuccess: (_, variables) => {
      const isUpdate = !!variables.budgetId;
      toast.success(`Presupuesto ${isUpdate ? "actualizado" : "creado"}`, {
        description: `El presupuesto "${variables.name}" se guardó correctamente.`,
      });
    },
    onError: (_err, variables, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(cacheKey, ctx.previous);
      }
      toast.error("Error al guardar", {
        description: `No pudimos guardar el presupuesto "${variables.name}". Por favor, inténtalo de nuevo.`,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
    },
  });

  return {
    budgets,
    isLoading,
    isError,
    saveBudget: saveMutation.mutate,
    saveBudgetAsync: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    savingCategoryId: saveMutation.variables?.categoryId,
    deleteBudget: deleteMutation.mutate,
    deleteBudgetAsync: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    deletingBudgetId: deleteMutation.variables,
  };
}
