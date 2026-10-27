"use client";

import { DollarSign, PieChart } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { BudgetGrid, SummaryCard } from "@/views/core/budget/components";
import type {
  Budget,
  Category,
} from "@/views/core/dashboard/interfaces/dashboard";

interface AllAccountsBudgetProps {
  totalsByCurrency: Map<string, { totalBudget: number; totalSpent: number }>;
  budgetGroupsByCurrency: Map<
    string,
    { budgetedCategories: Category[]; budgetByCategoryId: Map<string, Budget> }
  >;
  spentByCurrencyAndCategoryId: Map<string, Map<string, number>>;
  selectedAccountId: string;
  isSaving: boolean;
  savingCategoryId?: string | undefined;
  saveBudget: (
    payload: {
      categoryId: string;
      amount: number;
      name: string;
      accountId: string;
      budgetId?: string;
    },
    options?: { onSuccess?: () => void },
  ) => void;
  deleteBudget: (id: string) => void;
  isDeleting: boolean;
  deletingBudgetId?: string;
}

export function AllAccountsBudget({
  totalsByCurrency,
  budgetGroupsByCurrency,
  spentByCurrencyAndCategoryId,
  selectedAccountId,
  isSaving,
  savingCategoryId,
  saveBudget,
  deleteBudget,
  isDeleting,
  deletingBudgetId,
}: AllAccountsBudgetProps) {
  if (totalsByCurrency.size === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-in fade-in slide-in-from-bottom-4 duration-500 rounded-2xl border-2 border-dashed border-border/60 bg-muted/10 mt-8">
        <div className="bg-primary/10 p-5 rounded-full mb-5">
          <PieChart className="h-10 w-10 text-primary opacity-80" />
        </div>
        <h3 className="text-xl font-semibold tracking-tight text-foreground">
          No hay presupuestos activos
        </h3>
        <p className="text-sm text-muted-foreground max-w-87.5 mt-2">
          Debes crear al menos un presupuesto en alguna de tus cuentas
          individuales para visualizar el resumen general consolidado.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground border-b pb-2">
          Presupuesto general consolidado
        </h3>
        <div className="flex flex-wrap gap-4">
          {[...totalsByCurrency.entries()].map(([currency, data]) => (
            <SummaryCard
              key={currency}
              icon={<DollarSign className="h-5 w-5 text-primary" />}
              label={`Meta Total (${currency})`}
              value={formatCurrency(data.totalBudget, currency)}
              variant="default"
              className="flex-1 min-w-50 shadow-sm hover:shadow-md transition-shadow"
            />
          ))}
        </div>
      </div>

      <div className="space-y-10">
        {[...budgetGroupsByCurrency.entries()].map(([currency, group]) => (
          <div
            key={currency}
            className="space-y-4 rounded-xl border bg-card/50 p-4 md:p-6 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                Desglose en
              </span>
              <span className="text-sm font-black bg-primary/10 text-primary px-3 py-1 rounded-full">
                {currency}
              </span>
            </div>
            <BudgetGrid
              budgetedCategories={group.budgetedCategories}
              budgetByCategoryId={group.budgetByCategoryId}
              spentByCategoryId={
                spentByCurrencyAndCategoryId.get(currency) ?? new Map()
              }
              isAllAccounts={true}
              selectedAccountId={selectedAccountId}
              isSaving={isSaving}
              savingCategoryId={savingCategoryId}
              saveBudget={saveBudget}
              deleteBudget={deleteBudget}
              isDeleting={isDeleting}
              deletingBudgetId={deletingBudgetId}
              showAddForm={false}
              canAdd={false}
              onShowAddForm={() => {}}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
