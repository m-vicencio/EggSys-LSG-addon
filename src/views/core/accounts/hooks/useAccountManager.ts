import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { accountsApi } from "@/lib/api";
import { useAccounts as useCoreAccounts } from "@/views/core/dashboard/hooks/useAccounts";
import type { AppAccount } from "@/views/core/dashboard/interfaces/dashboard";

export type FormDataAccount = {
  id?: string;
  name: string;
  balance: string;
  currency: string;
  isSavings: boolean;
  savingGoal: string;
};

const defaultFormState: FormDataAccount = {
  name: "",
  balance: "",
  currency: "CLP",
  isSavings: false,
  savingGoal: "",
};

export function useAccountManagerLogic() {
  const { accounts, isLoading } = useCoreAccounts();
  const queryClient = useQueryClient();

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [formData, setFormData] = useState<FormDataAccount>(defaultFormState);
  const [error, setError] = useState<string | null>(null);

  const handleOpenCreate = () => {
    setFormData(defaultFormState);
    setError(null);
    setIsSheetOpen(true);
  };

  const handleOpenEdit = (account: AppAccount) => {
    setFormData({
      id: account.id,
      name: account.name,
      balance: account.balance?.toString() ?? "",
      currency: account.currency ?? "CLP",
      isSavings: !!account.isSavings,
      savingGoal: account.savingGoal?.toString() ?? "",
    });
    setError(null);
    setIsSheetOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof accountsApi.create>[0]) =>
      accountsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      setIsSheetOpen(false);
      toast.success("Cuenta creada exitosamente"); // Agregado para mejor UX
    },
    onError: () => {
      setError("Error al crear la cuenta");
      toast.error("No se pudo crear la cuenta");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Parameters<typeof accountsApi.update>[1];
    }) => accountsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      setIsSheetOpen(false);
      toast.success("Cuenta actualizada");
    },
    onError: () => {
      setError("Error al actualizar la cuenta");
      toast.error("No se pudo actualizar la cuenta");
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: string | null) =>
      id ? accountsApi.setDefault(id) : accountsApi.unsetDefault(),
    onMutate: (id: string | null) => {
      if (id) {
        queryClient.setQueryData<AppAccount[] | undefined>(
          ["accounts"],
          (old) => old?.map((a) => ({ ...a, isDefault: a.id === id })) ?? old,
        );
      } else {
        queryClient.setQueryData<AppAccount[] | undefined>(
          ["accounts"],
          (old) => old?.map((a) => ({ ...a, isDefault: false })) ?? old,
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Cuenta predeterminada actualizada");
    },
    onError: () =>
      toast.error("Error", {
        description: "No se pudo actualizar la cuenta predeterminada",
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => accountsApi.delete(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ["accounts"] });
      const previous = queryClient.getQueryData<AppAccount[]>(["accounts"]);
      queryClient.setQueryData<AppAccount[]>(["accounts"], (old) =>
        old ? old.filter((a) => a.id !== id) : old,
      );
      return { previous };
    },
    onError: (_err, _id, context: any) => {
      if (context?.previous) {
        queryClient.setQueryData(["accounts"], context.previous);
      }
      toast.error("Error", {
        description: "No se pudo eliminar la cuenta",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
    onSuccess: () =>
      toast.success("Cuenta eliminada", {
        description: "La cuenta fue eliminada correctamente",
      }),
  });

  const handleSave = async () => {
    setError(null);

    if (
      formData.isSavings &&
      (!formData.savingGoal || Number(formData.savingGoal) <= 0)
    ) {
      setError("Debes ingresar una meta de ahorro válida.");
      return;
    }

    const name = formData.name.trim();
    const balance = Number.parseFloat(formData.balance) || 0;

    const payloadCreate: Parameters<typeof accountsApi.create>[0] = {
      name,
      balance,
      currency: formData.currency,
      isSavings: formData.isSavings,
      ...(formData.isSavings
        ? { savingGoal: Number(formData.savingGoal) }
        : {}),
    };

    const payloadUpdate: Parameters<typeof accountsApi.update>[1] = {
      name,
      balance,
      ...(formData.isSavings
        ? { savingGoal: Number(formData.savingGoal) }
        : {}),
    };

    if (formData.id) {
      updateMutation.mutate({ id: formData.id, data: payloadUpdate });
    } else {
      createMutation.mutate(payloadCreate);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return {
    accounts,
    isLoading,
    isSheetOpen,
    setIsSheetOpen,
    formData,
    setFormData,
    error,
    isSaving,
    handleOpenCreate,
    handleOpenEdit,
    handleSave,
    setDefaultAccount: (id: string | null) => setDefaultMutation.mutate(id),
    deleteAccount: (id: string) => deleteMutation.mutate(id),
  };
}
