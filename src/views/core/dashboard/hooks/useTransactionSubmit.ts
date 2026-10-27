"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { CreateTransactionInput, UpdateTransactionInput } from "@/lib/api";
import { transactionsApi } from "@/lib/api";
import { useAccountStore } from "@/store/accountStore";
import type { Transaction } from "@/views/core/dashboard/interfaces/dashboard";

export interface TransactionFormValues {
  type: "INCOME" | "EXPENSE";
  amount: string;
  name: string;
  categoryId: string;
  accountId: string;
  date: string;
}

interface UseTransactionSubmitOptions {
  transaction?: Transaction;
  onSuccess: () => void;
  onOpenChange: (open: boolean) => void;
}

interface UseTransactionDeleteOptions {
  transaction?: Transaction;
  onSuccess: () => void;
  onOpenChange: (open: boolean) => void;
}

export function useTransactionSubmit({
  transaction,
  onSuccess,
  onOpenChange,
}: UseTransactionSubmitOptions) {
  const queryClient = useQueryClient();
  const adjustBalance = useAccountStore((s) => s.adjustBalance);
  const isEditing = !!transaction?.id;

  const mutation = useMutation({
    mutationFn: async (formData: TransactionFormValues) => {
      const [yStr, mStr, dStr] = formData.date.split("-");
      const y = Number(yStr);
      const m = Number(mStr);
      const d = Number(dStr);
      const dateObj = new Date(y, m - 1, d, 12, 0, 0, 0);
      const dateString = dateObj.toISOString();
      const parsedAmount = Number.parseFloat(formData.amount) || 0;
      const month = dateObj.getMonth() + 1;
      const year = dateObj.getFullYear();

      if (isEditing && transaction) {
        const updatePayload: UpdateTransactionInput = {
          type: formData.type,
          amount: parsedAmount,
          name: formData.name,
          date: dateString,
          month,
          year,
          categoryId: formData.categoryId || undefined,
          accountId: formData.accountId,
        };
        return transactionsApi.update(transaction.id, updatePayload);
      }

      const createPayload: CreateTransactionInput = {
        type: formData.type,
        amount: parsedAmount,
        name: formData.name,
        accountId: formData.accountId,
        date: dateString,
        month,
        year,
        categoryId: formData.categoryId,
      };
      return transactionsApi.create(createPayload);
    },

    onSuccess: (_data, formData) => {
      const amount = Number.parseFloat(formData.amount) || 0;

      if (isEditing && transaction) {
        const oldAmount = Number(transaction.amount);
        const oldDelta = transaction.type === "INCOME" ? oldAmount : -oldAmount;
        const newAmount = Number.parseFloat(formData.amount) || 0;
        const newDelta = formData.type === "INCOME" ? newAmount : -newAmount;
        const oldAccountId = transaction.accountId;
        const newAccountId = formData.accountId;

        if (oldAccountId === newAccountId) {
          adjustBalance(newAccountId, newDelta - oldDelta);
        } else {
          adjustBalance(oldAccountId, -oldDelta); // Revertir
          adjustBalance(newAccountId, newDelta); // Aplicar
        }
      } else {
        const amount = Number.parseFloat(formData.amount) || 0;
        const delta = formData.type === "INCOME" ? amount : -amount;
        adjustBalance(formData.accountId, delta);
      }

      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["pet", formData.accountId] });
      if (isEditing) {
        toast.success("Transacción actualizada");
      } else {
        const verb = formData.type === "INCOME" ? "ingreso" : "gasto";
        toast.success(`Registrado ${verb}: ${amount.toLocaleString()}`);
      }
      onSuccess();
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === "object" && "message" in error
          ? (error as { message?: string }).message
          : "Error al guardar la transacción";
      toast.error(message);
    },
  });

  return { mutation, isEditing };
}

export function useTransactionDelete({
  transaction,
  onSuccess,
  onOpenChange,
}: UseTransactionDeleteOptions) {
  const queryClient = useQueryClient();
  const adjustBalance = useAccountStore((s) => s.adjustBalance);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!transaction?.id) {
        throw new Error("No hay transacción seleccionada para eliminar.");
      }
      return transactionsApi.delete(transaction.id);
    },
    onSuccess: () => {
      if (transaction) {
        const amount = Number(transaction.amount) || 0;
        const delta = transaction.type === "INCOME" ? -amount : amount;
        adjustBalance(transaction.accountId, delta);

        queryClient.invalidateQueries({
          queryKey: ["pet", transaction.accountId],
        });
      }

      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });

      toast.success("Transacción eliminada");
      onSuccess();
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === "object" && "message" in error
          ? (error as { message?: string }).message
          : "Error al eliminar la transacción";
      toast.error(message);
    },
  });

  return { mutation };
}
