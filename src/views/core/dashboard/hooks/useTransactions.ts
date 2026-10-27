import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { toast } from "sonner";
import { transactionsApi } from "@/lib/api";
import type { Transaction } from "@/views/core/dashboard/interfaces/dashboard";

export function useTransactions(
  accountId: string | null,
  selectedMonth: string,
) {
  const {
    data: allTransactions = [],
    isLoading,
    isError,
  } = useQuery<Transaction[]>({
    queryKey: ["transactions", accountId],
    queryFn: () => transactionsApi.getByAccount(accountId ?? ""),
    enabled: !!accountId,
  });

  useEffect(() => {
    if (isError) {
      toast.error("Error al cargar los movimientos", {
        description:
          "No pudimos obtener las transacciones de esta cuenta. Por favor, intenta de nuevo.",
      });
    }
  }, [isError]);

  const transactions = useMemo(() => {
    return allTransactions.filter((tx) => tx.date.startsWith(selectedMonth));
  }, [allTransactions, selectedMonth]);

  const stats = useMemo(() => {
    return transactions.reduce(
      (acc, tx) => {
        const amount = Number(tx.amount);
        if (tx.type === "INCOME") acc.income += amount;
        else acc.expenses += amount;
        return acc;
      },
      { income: 0, expenses: 0 },
    );
  }, [transactions]);

  const chartData = useMemo(() => {
    const map: Record<string, { value: number; color: string }> = {};

    transactions.forEach((tx) => {
      const isExpense = tx.type === "EXPENSE";
      if (isExpense && tx.category?.name) {
        const catName = tx.category.name;
        if (!map[catName]) {
          map[catName] = {
            value: 0,
            color: tx.category.color || "#ccc",
          };
        }
        map[catName].value += Number(tx.amount);
      }
    });

    return Object.entries(map).map(([name, data]) => ({
      name,
      value: data.value,
      fill: data.color,
    }));
  }, [transactions]);
  return {
    transactions,
    isLoading,
    isError,
    income: stats.income,
    expenses: stats.expenses,
    chartData,
  };
}
