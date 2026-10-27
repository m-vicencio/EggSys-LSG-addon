"use client";

import { ChevronDown, DollarSign, TrendingUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/useIsMobile"; // Asumimos que este hook está disponible
import { formatCurrency } from "@/lib/utils";

import {
  AddCategoryForm,
  BudgetGrid,
  SummaryCard,
  type SummaryVariant,
} from "@/views/core/budget/components";
import type {
  Budget,
  Category,
} from "@/views/core/dashboard/interfaces/dashboard";

interface SingleAccountBudgetProps {
  totals: {
    totalBudget: number;
    totalSpent: number;
    available: number;
    currency: string;
  };
  availableVariant: SummaryVariant;
  showAddForm: boolean;
  setShowAddForm: (show: boolean) => void;
  availableToAdd: Category[];
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
  budgetedCategories: Category[];
  budgetByCategoryId: Map<string, Budget>;
  spentByCategoryId: Map<string, number>;
  deleteBudget: (id: string) => void;
  isDeleting: boolean;
  deletingBudgetId?: string;
}

export function SingleAccountBudget({
  totals,
  availableVariant,
  showAddForm,
  setShowAddForm,
  availableToAdd,
  selectedAccountId,
  isSaving,
  savingCategoryId,
  saveBudget,
  budgetedCategories,
  budgetByCategoryId,
  spentByCategoryId,
  deleteBudget,
  isDeleting,
  deletingBudgetId,
}: SingleAccountBudgetProps) {
  const isMobile = useIsMobile();

  const addCategoryContent = (
    <AddCategoryForm
      availableCategories={availableToAdd}
      accountId={selectedAccountId}
      isSaving={isSaving}
      onCancel={() => setShowAddForm(false)}
      onSave={(catId, amount, name, accId) => {
        saveBudget(
          { categoryId: catId, amount, name, accountId: accId },
          { onSuccess: () => setShowAddForm(false) },
        );
      }}
    />
  );

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
        <SummaryCard
          icon={<DollarSign className="h-5 w-5 opacity-70" />}
          label="Meta total"
          value={formatCurrency(totals.totalBudget, totals.currency)}
          variant="default"
        />
        <SummaryCard
          icon={<TrendingUp className="h-5 w-5 opacity-70" />}
          label="Gasto actual"
          value={formatCurrency(totals.totalSpent, totals.currency)}
          variant={
            totals.totalSpent > totals.totalBudget && totals.totalBudget > 0
              ? "danger"
              : "muted"
          }
        />
        <SummaryCard
          icon={<ChevronDown className="h-5 w-5 opacity-70" />}
          label="Presupuesto disponible"
          value={formatCurrency(totals.available, totals.currency)}
          variant={availableVariant}
          className="col-span-2 sm:col-span-1"
        />
      </div>

      <Separator className="my-8 opacity-50" />
      {isMobile ? (
        <Sheet open={showAddForm} onOpenChange={setShowAddForm}>
          <SheetContent side="bottom" className="rounded-t-2xl p-6">
            <SheetHeader className="mb-8">
              <SheetTitle className="text-xl font-bold">
                Agregar categoría
              </SheetTitle>
              <SheetDescription>
                Selecciona una categoría para añadirla a tu presupuesto.
              </SheetDescription>
            </SheetHeader>
            {addCategoryContent}
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
          <DialogContent className="max-w-md p-6">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-xl font-bold">
                Agregar categoría al presupuesto
              </DialogTitle>
              <DialogDescription>
                Selecciona una categoría para añadirla a tu presupuesto.
              </DialogDescription>
            </DialogHeader>
            {addCategoryContent}
          </DialogContent>
        </Dialog>
      )}

      <div className="mt-4">
        <BudgetGrid
          budgetedCategories={budgetedCategories}
          budgetByCategoryId={budgetByCategoryId}
          spentByCategoryId={spentByCategoryId}
          isAllAccounts={false}
          selectedAccountId={selectedAccountId}
          isSaving={isSaving}
          savingCategoryId={savingCategoryId}
          saveBudget={saveBudget}
          showAddForm={showAddForm}
          canAdd={availableToAdd.length > 0}
          onShowAddForm={() => setShowAddForm(true)}
          deleteBudget={deleteBudget}
          isDeleting={isDeleting}
          deletingBudgetId={deletingBudgetId}
        />
      </div>
    </div>
  );
}
