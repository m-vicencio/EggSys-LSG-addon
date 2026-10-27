"use client";

import { CategoryDetailTableChart } from "./charts/CategoryDetailTableChart";
import { CumulativeSpendChart } from "./charts/CumulativeSpendChart";
import { ExpectationPieChart } from "./charts/ExpectationPieChart";
import { MoneyInOutChart } from "./charts/MoneyInOutChart";
import { TopCategoriesChart } from "./charts/TopCategoriesChart";
import { WeeklySpendChart } from "./charts/WeeklySpendChart";
import { GraphicsHeader } from "./components/GraphicsHeader";
import { useGraphicsPage } from "./hooks/useGraphicsPage";

export function GraphicsView() {
  const {
    accounts,
    selectedAccountId,
    handleAccountChange,
    calendarOpen,
    setCalendarOpen,
    calendarYear,
    calendarMonth,
    isCurrentMonth,
    handleMonthChange,
    handleCurrentMonth,
    dailySummary,
    isLoadingDailySummary,
  } = useGraphicsPage();

  return (
    <>
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-4 pb-2">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Dashboard Financiero
          </h1>
          <p className="text-muted-foreground text-sm">
            Visualiza y genera reportes de tus finanzas.
          </p>
        </div>
        <div className="shrink-0">
          <GraphicsHeader
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
          />
        </div>
      </div>

      <div className="columns-1 lg:columns-2 xl:columns-3 gap-6 space-y-6 pt-4">

        <div className="break-inside-avoid">
          <CategoryDetailTableChart
            selectedAccountId={selectedAccountId}
            calendarMonth={calendarMonth}
            calendarYear={calendarYear}
          />
        </div>

        <div className="break-inside-avoid">
          <CumulativeSpendChart
            data={dailySummary}
            isLoading={isLoadingDailySummary}
          />
        </div>

        <div className="break-inside-avoid">
          <MoneyInOutChart
            selectedAccountId={selectedAccountId}
            calendarMonth={calendarMonth}
            calendarYear={calendarYear}
          />
        </div>

        <div className="break-inside-avoid">
          <WeeklySpendChart
            selectedAccountId={selectedAccountId}
            calendarMonth={calendarMonth}
            calendarYear={calendarYear}
          />
        </div>

        <div className="break-inside-avoid">
          <TopCategoriesChart
            selectedAccountId={selectedAccountId}
            calendarMonth={calendarMonth}
            calendarYear={calendarYear}
          />
        </div>

        <div className="break-inside-avoid">
          <ExpectationPieChart
            selectedAccountId={selectedAccountId}
            calendarMonth={calendarMonth}
            calendarYear={calendarYear}
          />
        </div>
      </div>
    </>
  );
}
