import { Plus, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BudgetCard } from "@/views/core/budget/components/BudgetCard";
import type {
  Budget,
  Category,
} from "@/views/core/dashboard/interfaces/dashboard";

type SaveBudgetPayload = {
  categoryId: string;
  amount: number;
  name: string;
  accountId: string;
  budgetId?: string;
};

interface BudgetGridProps {
  budgetedCategories: Category[];
  budgetByCategoryId: Map<string, Budget>;
  spentByCategoryId: Map<string, number>;
  isAllAccounts: boolean;
  selectedAccountId: string;
  isSaving: boolean;
  savingCategoryId?: string;
  saveBudget: (payload: SaveBudgetPayload) => void;
  showAddForm: boolean;
  canAdd: boolean;
  onShowAddForm: () => void;
  deleteBudget: (id: string) => void;
  isDeleting: boolean;
  deletingBudgetId?: string;
}

export function BudgetGrid({
  budgetedCategories,
  budgetByCategoryId,
  spentByCategoryId,
  isAllAccounts,
  selectedAccountId,
  isSaving,
  savingCategoryId,
  saveBudget,
  showAddForm,
  canAdd,
  onShowAddForm,
  deleteBudget,
  isDeleting,
  deletingBudgetId,
}: BudgetGridProps) {
  if (budgetedCategories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center animate-in fade-in duration-500">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-sm">
          <Target className="h-8 w-8" />
        </div>

        <div className="space-y-1.5">
          <p className="text-lg font-extrabold tracking-tight text-foreground">
            {isAllAccounts
              ? "Ninguna cuenta tiene presupuestos configurados"
              : "Sin categorías en el presupuesto"}
          </p>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
            {isAllAccounts
              ? "Selecciona una cuenta y agrega categorías para empezar."
              : 'Usa el botón "Agregar categoría" para comenzar a planificar.'}
          </p>
        </div>

        {!isAllAccounts && !showAddForm && canAdd && (
          <Button
            className="mt-2 rounded-xl font-bold shadow-sm"
            onClick={onShowAddForm}
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar categoría
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
      {budgetedCategories.map((cat) => {
        const budget = budgetByCategoryId.get(cat.id);
        if (!budget) return null;
        const spentAmount = spentByCategoryId.get(cat.id) ?? 0;

        return (
          <BudgetCard
            key={cat.id}
            category={cat}
            budget={budget}
            spentAmount={spentAmount}
            readOnly={isAllAccounts}
            isSaving={isSaving && savingCategoryId === cat.id}
            onSave={(amount) =>
              saveBudget({
                categoryId: cat.id,
                name: cat.name,
                amount,
                accountId: selectedAccountId,
                budgetId: budget.id !== "temp" ? budget.id : undefined,
              })
            }
            onDelete={() => deleteBudget(budget.id)}
            isDeleting={isDeleting && deletingBudgetId === budget.id}
          />
        );
      })}
    </div>
  );
}
