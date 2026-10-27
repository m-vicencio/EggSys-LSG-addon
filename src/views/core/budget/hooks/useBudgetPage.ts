import { useQueries, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner"; // <-- Importamos toast de sonner
import { useCategories } from "@/hooks/useCategories";
import { transactionsApi } from "@/lib/api";
import type { SummaryVariant } from "@/views/core/budget/components/SummaryCard";
import { useBudgets } from "@/views/core/budget/hooks/useBudgets";
import { useAccounts } from "@/views/core/dashboard/hooks/useAccounts";
import type {
  Budget,
  Category,
  Spent,
} from "@/views/core/dashboard/interfaces/dashboard";

export const ALL_ACCOUNTS = "__all__";

export function useBudgetPage() {
  const now = new Date();
  const { accounts, isLoading: isLoadingAccounts } = useAccounts();
  const { categories, isLoading: isLoadingCats } = useCategories();
  const [selectedAccountId, setSelectedAccountId] =
    useState<string>(ALL_ACCOUNTS);
  const [showAddForm, setShowAddForm] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState<string>(
    () => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
  );
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarYear, setCalendarYear] = useState(() => now.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(() => now.getMonth()); // 0-indexed

  const initialized = useRef(false);
  useEffect(() => {
    if (!initialized.current && accounts.length > 0) {
      initialized.current = true;
      const def = accounts.find((a) => a.isDefault) ?? accounts[0];
      if (def) setSelectedAccountId(def.id);
    }
  }, [accounts]);

  const selectedMonthNum = Number(selectedMonth.split("-")[1]);
  const selectedYearNum = Number(selectedMonth.split("-")[0]);
  const isCurrentMonth =
    selectedMonthNum === now.getMonth() + 1 &&
    selectedYearNum === now.getFullYear();

  const isAllAccounts = selectedAccountId === ALL_ACCOUNTS;
  const accountIdForQuery = isAllAccounts ? undefined : selectedAccountId;
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  const {
    budgets,
    saveBudget,
    isSaving,
    savingCategoryId,
    deleteBudget,
    deleteBudgetAsync,
    isDeleting,
    deletingBudgetId,
  } = useBudgets(accountIdForQuery);

  const {
    data: spent = [],
    isLoading: isLoadingSpent,
    isError: isErrorSpent,
  } = useQuery<Spent[]>({
    queryKey: ["spent", accountIdForQuery ?? "all", selectedMonth],
    queryFn: () =>
      transactionsApi.getSummaryByCategory(
        accountIdForQuery,
        selectedMonthNum,
        selectedYearNum,
      ),
    enabled: !isLoadingAccounts,
  });

  const perAccountSpentQueries = useQueries({
    queries: isAllAccounts
      ? accounts.map((acc) => ({
          queryKey: ["spent", acc.id, selectedMonth],
          queryFn: () =>
            transactionsApi.getSummaryByCategory(
              acc.id,
              selectedMonthNum,
              selectedYearNum,
            ),
          enabled: !isLoadingAccounts,
        }))
      : [],
  });

  const isErrorPerAccountSpent = perAccountSpentQueries.some((q) => q.isError);

  useEffect(() => {
    if (isErrorSpent || isErrorPerAccountSpent) {
      toast.error("Error al cargar datos", {
        description:
          "No pudimos cargar el resumen de gastos del período. Por favor, recarga la página.",
      });
    }
  }, [isErrorSpent, isErrorPerAccountSpent]);

  const spentByCurrencyAndCategoryId = useMemo(() => {
    if (!isAllAccounts) return new Map<string, Map<string, number>>();
    const result = new Map<string, Map<string, number>>();
    for (let i = 0; i < accounts.length; i++) {
      const acc = accounts[i];
      const currency = acc.currency ?? "CLP";
      const data =
        (perAccountSpentQueries[i]?.data as Spent[] | undefined) ?? [];
      if (!result.has(currency)) result.set(currency, new Map());
      const map = result.get(currency);
      if (!map) continue;
      for (const s of data) {
        map.set(s.categoryId, (map.get(s.categoryId) ?? 0) + s.amount);
      }
    }
    return result;
  }, [isAllAccounts, accounts, perAccountSpentQueries]);

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === "EXPENSE"),
    [categories],
  );

  const budgetedCategoryIds = useMemo(
    () => new Set(budgets.map((b) => b.categoryId)),
    [budgets],
  );

  const availableToAdd = useMemo(
    () =>
      expenseCategories.filter(
        (c) => (c.isActive ?? true) && !budgetedCategoryIds.has(c.id),
      ),
    [expenseCategories, budgetedCategoryIds],
  );

  const budgetByCategoryId = useMemo(() => {
    const map = new Map<string, Budget>();
    for (const b of budgets) {
      const existing = map.get(b.categoryId);
      if (!existing) {
        map.set(b.categoryId, { ...b });
      } else {
        map.set(b.categoryId, {
          ...existing,
          idealAmount: existing.idealAmount + b.idealAmount,
        });
      }
    }
    return map;
  }, [budgets]);

  const budgetedCategories = useMemo(() => {
    const seen = new Set<string>();
    const result: Category[] = [];
    for (const b of budgets) {
      if (!seen.has(b.categoryId)) {
        seen.add(b.categoryId);
        const cat = categories.find((c) => c.id === b.categoryId);
        if (cat) result.push(cat);
      }
    }
    return result;
  }, [budgets, categories]);

  const spentByCategoryId = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of spent) map.set(s.categoryId, s.amount);
    return map;
  }, [spent]);

  const totals = useMemo(() => {
    const totalBudget = [...budgetByCategoryId.values()].reduce(
      (acc, b) => acc + b.idealAmount,
      0,
    );
    const totalSpent = [...budgetByCategoryId.keys()].reduce(
      (acc, catId) => acc + (spentByCategoryId.get(catId) ?? 0),
      0,
    );
    return {
      totalBudget,
      totalSpent,
      available: totalBudget - totalSpent,
      currency: selectedAccount?.currency ?? "CLP",
    };
  }, [
    budgetByCategoryId,
    spentByCategoryId,
    selectedAccount,
    selectedAccount?.currency,
  ]);

  const totalsByCurrency = useMemo(() => {
    const accountCurrencyMap = new Map<string, string>();
    for (const acc of accounts) {
      accountCurrencyMap.set(acc.id, acc.currency ?? "CLP");
    }

    const budgetMap = new Map<string, number>();
    for (const b of budgets) {
      let currency = b.currency;
      if (!currency) {
        currency = accountCurrencyMap.get(b.accountId) ?? "CLP";
      }
      budgetMap.set(currency, (budgetMap.get(currency) ?? 0) + b.idealAmount);
    }

    const spentMap = new Map<string, number>();
    for (const s of spent) {
      const currency = selectedAccount?.currency ?? "CLP";
      spentMap.set(currency, (spentMap.get(currency) ?? 0) + s.amount);
    }

    const result = new Map<
      string,
      { totalBudget: number; totalSpent: number }
    >();
    const allCurrencies = new Set([...budgetMap.keys(), ...spentMap.keys()]);
    for (const currency of allCurrencies) {
      result.set(currency, {
        totalBudget: budgetMap.get(currency) ?? 0,
        totalSpent: spentMap.get(currency) ?? 0,
      });
    }
    return result;
  }, [budgets, spent, accounts, selectedAccount?.currency]);

  const budgetGroupsByCurrency = useMemo(() => {
    const accountCurrencyMap = new Map<string, string>();
    for (const acc of accounts) {
      accountCurrencyMap.set(acc.id, acc.currency ?? "CLP");
    }

    const groups = new Map<
      string,
      {
        budgetedCategories: Category[];
        budgetByCategoryId: Map<string, Budget>;
      }
    >();
    for (const b of budgets) {
      let currency = b.currency;
      if (!currency) {
        currency = accountCurrencyMap.get(b.accountId) ?? "CLP";
      }
      if (!groups.has(currency)) {
        groups.set(currency, {
          budgetedCategories: [],
          budgetByCategoryId: new Map(),
        });
      }
      const group = groups.get(currency);
      if (!group) continue;
      if (!group.budgetByCategoryId.has(b.categoryId)) {
        const cat = categories.find((c) => c.id === b.categoryId);
        if (cat) group.budgetedCategories.push(cat);
      }
      const existing = group.budgetByCategoryId.get(b.categoryId);
      group.budgetByCategoryId.set(b.categoryId, {
        ...(existing ?? b),
        idealAmount: (existing?.idealAmount ?? 0) + b.idealAmount,
        currency,
      });
    }
    return groups;
  }, [budgets, categories, accounts]);

  const availableVariant: SummaryVariant =
    totals.available < 0
      ? "danger"
      : totals.available > 0
        ? "success"
        : "muted";

  const handleAccountChange = (id: string) => {
    setSelectedAccountId(id);
    setShowAddForm(false);
  };

  const handleMonthChange = (yr: number, mo: number) => {
    setCalendarYear(yr);
    setCalendarMonth(mo);
    setSelectedMonth(`${yr}-${String(mo + 1).padStart(2, "0")}`);
    setCalendarOpen(false);
  };

  const handleCurrentMonth = () => {
    const n = new Date();
    setCalendarYear(n.getFullYear());
    setCalendarMonth(n.getMonth());
    setSelectedMonth(
      `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`,
    );
    setCalendarOpen(false);
  };

  const isLoadingPerAccountSpent =
    isAllAccounts && perAccountSpentQueries.some((q) => q.isLoading);
  const isLoading =
    isLoadingAccounts ||
    isLoadingCats ||
    isLoadingSpent ||
    isLoadingPerAccountSpent;

  return {
    // ── Estado ──
    selectedAccountId,
    showAddForm,
    setShowAddForm,
    calendarOpen,
    setCalendarOpen,
    calendarYear,
    calendarMonth,
    // ── Derivados ──
    isCurrentMonth,
    isAllAccounts,
    accountIdForQuery,
    selectedMonthNum,
    selectedYearNum,
    selectedAccount,
    availableVariant,
    // ── Datos ──
    accounts,
    budgetedCategories,
    availableToAdd,
    budgetByCategoryId,
    spentByCategoryId,
    spentByCurrencyAndCategoryId,
    totals,
    totalsByCurrency,
    budgetGroupsByCurrency,
    // ── Operaciones ──
    saveBudget,
    deleteBudget,
    deleteBudgetAsync,
    isDeleting,
    deletingBudgetId,
    isSaving,
    savingCategoryId,
    isLoading,
    // ── Handlers ──
    handleAccountChange,
    handleMonthChange,
    handleCurrentMonth,
  };
}
