"use client";

import { Loader2 } from "lucide-react";
import { BudgetHeader, BudgetNotice } from "@/views/core/budget/components";
import {
  ALL_ACCOUNTS,
  useBudgetPage,
} from "@/views/core/budget/hooks/useBudgetPage";

import { AllAccountsBudget } from "./components/sections/AllAccountsBudget";
import { SingleAccountBudget } from "./components/sections/SingleAccountBudget";

export function BudgetView() {
  const {
    selectedAccountId,
    showAddForm,
    setShowAddForm,
    calendarOpen,
    setCalendarOpen,
    calendarYear,
    calendarMonth,
    isCurrentMonth,
    isAllAccounts,
    selectedAccount,
    availableVariant,
    accounts,
    budgetedCategories,
    availableToAdd,
    budgetByCategoryId,
    spentByCategoryId,
    spentByCurrencyAndCategoryId,
    totals,
    totalsByCurrency,
    budgetGroupsByCurrency,
    saveBudget,
    isSaving,
    savingCategoryId,
    isLoading,
    handleAccountChange,
    handleMonthChange,
    handleCurrentMonth,
    deleteBudget,
    isDeleting,
    deletingBudgetId,
  } = useBudgetPage();

  if (isLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">
          Calculando presupuestos...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <BudgetHeader
        calendarOpen={calendarOpen}
        onCalendarOpenChange={setCalendarOpen}
        calendarYear={calendarYear}
        calendarMonth={calendarMonth}
        isCurrentMonth={isCurrentMonth}
        onMonthChange={handleMonthChange}
        onCurrentMonth={handleCurrentMonth}
        accounts={accounts}
        selectedAccountId={selectedAccountId}
        onAccountChange={handleAccountChange}
        ALL_ACCOUNTS={ALL_ACCOUNTS}
      />

      <BudgetNotice
        isAllAccounts={isAllAccounts}
        selectedAccount={selectedAccount}
        showAddForm={showAddForm}
        canAdd={availableToAdd.length > 0}
        onAddCategory={() => setShowAddForm(true)}
      />

      {isAllAccounts ? (
        <AllAccountsBudget
          totalsByCurrency={totalsByCurrency}
          budgetGroupsByCurrency={budgetGroupsByCurrency}
          spentByCurrencyAndCategoryId={spentByCurrencyAndCategoryId}
          selectedAccountId={selectedAccountId}
          isSaving={isSaving}
          savingCategoryId={savingCategoryId}
          saveBudget={saveBudget}
          deleteBudget={deleteBudget}
          isDeleting={isDeleting}
          deletingBudgetId={deletingBudgetId}
        />
      ) : (
        <SingleAccountBudget
          totals={totals}
          availableVariant={availableVariant}
          showAddForm={showAddForm}
          setShowAddForm={setShowAddForm}
          availableToAdd={availableToAdd}
          selectedAccountId={selectedAccountId}
          isSaving={isSaving}
          savingCategoryId={savingCategoryId}
          saveBudget={saveBudget}
          budgetedCategories={budgetedCategories}
          budgetByCategoryId={budgetByCategoryId}
          spentByCategoryId={spentByCategoryId}
          deleteBudget={deleteBudget}
          isDeleting={isDeleting}
          deletingBudgetId={deletingBudgetId}
        />
      )}
    </div>
  );
}
