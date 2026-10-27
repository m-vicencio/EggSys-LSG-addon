"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { graphicsApi } from "@/lib/api";
import { getCategoryMeta } from "@/lib/categories";
import { formatCLP } from "@/lib/format";

type Props = {
  selectedAccountId?: string | null;
  calendarMonth: number;
  calendarYear: number;
};

const getPercentage = (expected: number, real: number) => {
  if (expected === 0) return 0;
  return Math.round((Math.abs(real) / Math.abs(expected)) * 100);
};

export const CategoryDetailTableChart = ({
  selectedAccountId,
  calendarMonth,
  calendarYear,
}: Props) => {
  type BudgetSummaryRow = {
    categoryId: string;
    label: string;
    iconName?: string | null;
    color?: string | null;
    type: string;
    expected: number;
    real: number;
  };

  const { data = [], isLoading } = useQuery<BudgetSummaryRow[]>({
    queryKey: [
      "budgetsSummary",
      selectedAccountId,
      calendarMonth,
      calendarYear,
    ],
    queryFn: () =>
      graphicsApi.getBudgetsSummary(
        selectedAccountId || undefined,
        calendarMonth + 1,
        calendarYear,
      ),
    enabled: true,
  });

  const groups = useMemo(() => {
    const map = new Map<string, BudgetSummaryRow[]>();
    for (const row of data) {
      const t = row.type ?? "EXPENSE";
      const arr = map.get(t) ?? [];
      arr.push(row);
      map.set(t, arr);
    }
    return map;
  }, [data]);

  const gridLayout =
    "grid grid-cols-[1fr_75px_75px_40px] sm:grid-cols-[1fr_85px_85px_48px] gap-2 w-full items-center";

  return (
    <Card className="rounded-2xl shadow-sm border-border">
      <CardHeader>
        <CardTitle className="text-xl">Desglose por categoría</CardTitle>
        <CardDescription className="text-sm">
          Comparación de gastos planificados (esperado) vs. reales (actual).
        </CardDescription>
      </CardHeader>

      <CardContent className="pb-6">
        {isLoading ? (
          <Skeleton className="w-full h-64 rounded-2xl" />
        ) : (
          <div className="flex flex-col gap-6 w-full">
            <div
              className={`${gridLayout} text-[11px] font-bold uppercase tracking-widest text-muted-foreground px-5 border-b border-border/50 pb-3`}
            >
              <div></div>
              <div className="text-right">Esperado</div>
              <div className="text-right">Actual</div>
              <div className="text-right">%</div>
            </div>

            {Array.from(groups.entries()).map(([type, items]) => {
              const groupTotalExpected = items.reduce(
                (s: number, it: BudgetSummaryRow) => s + (it.expected ?? 0),
                0,
              );
              const groupTotalReal = items.reduce(
                (s: number, it: BudgetSummaryRow) => s + (it.real ?? 0),
                0,
              );
              const groupPercentage = getPercentage(
                groupTotalExpected,
                groupTotalReal,
              );

              const groupName = type === "INCOME" ? "Ingresos" : "Gastos";

              const isGroupOverBudget =
                type === "EXPENSE" &&
                Math.abs(groupTotalReal) > Math.abs(groupTotalExpected) &&
                groupTotalExpected !== 0;

              return (
                <div
                  key={type}
                  className="rounded-2xl p-5 flex flex-col bg-muted/10"
                >
                  <div className="w-full text-left mb-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    {groupName}
                  </div>

                  <div
                    className={`${gridLayout} px-2 pb-3 mb-3 border-b border-border/50 font-bold text-sm`}
                  >
                    <div className="text-foreground">Total</div>
                    <div className="text-right text-primary">
                      {formatCLP(groupTotalExpected)}
                    </div>
                    <div className="text-right text-foreground">
                      {formatCLP(groupTotalReal)}
                    </div>
                    <div
                      className={`text-right ${isGroupOverBudget ? "text-red-600 dark:text-red-400" : "text-primary"}`}
                    >
                      {groupPercentage}%
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    {items.map((item: BudgetSummaryRow) => {
                      const itemPercent = getPercentage(
                        item.expected,
                        item.real,
                      );
                      const isItemOverBudget =
                        type === "EXPENSE" &&
                        Math.abs(item.real) > Math.abs(item.expected) &&
                        item.expected !== 0;

                      const categoryMeta = getCategoryMeta(item);
                      const IconComponent = categoryMeta.icon;

                      return (
                        <div
                          key={item.categoryId}
                          className={`${gridLayout} py-2.5 text-sm rounded-xl px-2 transition-colors ${
                            isItemOverBudget
                              ? "bg-red-500/10 hover:bg-red-500/20"
                              : "hover:bg-background/60"
                          }`}
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                              style={{
                                backgroundColor: `${categoryMeta.color}20`,
                                color: categoryMeta.color,
                              }}
                            >
                              <IconComponent
                                className="h-4 w-4"
                                strokeWidth={2.5}
                              />
                            </div>
                            <span
                              className={`truncate font-semibold ${isItemOverBudget ? "text-red-600 dark:text-red-400" : "text-foreground"}`}
                            >
                              {categoryMeta.label}
                            </span>
                          </div>

                          <div
                            className={`text-right font-medium truncate ${isItemOverBudget ? "text-red-600/70 dark:text-red-400/70" : "text-muted-foreground"}`}
                          >
                            {formatCLP(item.expected)}
                          </div>
                          <div
                            className={`text-right truncate font-semibold ${isItemOverBudget ? "text-red-600 dark:text-red-400" : "text-foreground"}`}
                          >
                            {item.real === 0 ? "$0" : formatCLP(item.real)}
                          </div>
                          <div
                            className={`text-right font-bold ${isItemOverBudget ? "text-red-600 dark:text-red-400" : "text-primary/80"}`}
                          >
                            {itemPercent}%
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
