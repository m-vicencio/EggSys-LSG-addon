"use client";

import { useQuery } from "@tanstack/react-query";
import { PieChart as PieChartIcon } from "lucide-react";
import { useMemo } from "react";
import { Cell, Pie, PieChart } from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { graphicsApi } from "@/lib/api";
import { getCategoryMeta } from "@/lib/categories";
import { formatCLP } from "@/lib/format";

type Props = {
  selectedAccountId?: string | null;
  calendarMonth: number;
  calendarYear: number;
};

const chartConfig = {
  value: { label: "Gasto" },
} satisfies ChartConfig;

export const TopCategoriesChart = ({
  selectedAccountId,
  calendarMonth,
  calendarYear,
}: Props) => {
  const { data: rawData = [], isLoading } = useQuery({
    queryKey: ["topCategories", selectedAccountId, calendarMonth, calendarYear],
    queryFn: () =>
      graphicsApi.getTopCategories(
        selectedAccountId || undefined,
        calendarMonth + 1,
        calendarYear,
      ),
    enabled: true,
  });

  const chartData = useMemo(() => {
    return rawData.map((item) => {
      const meta = getCategoryMeta(item);
      return {
        ...item,
        label: meta.label,
        fill: meta.color,
        icon: meta.icon,
      };
    });
  }, [rawData]);

  const total = useMemo(
    () => chartData.reduce((acc, c) => acc + c.value, 0),
    [chartData],
  );

  return (
    <Card className="flex flex-col h-full rounded-2xl shadow-sm border-border">
      <CardHeader className="pb-2">
        <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block text-center mt-2">
          Top 8 categorías
        </Label>
      </CardHeader>

      <CardContent className="flex-1 pb-6 flex flex-col gap-6">
        {isLoading ? (
          <Skeleton className="mx-auto aspect-square h-45 w-45 rounded-full" />
        ) : chartData.length === 0 ? (
          <div className="flex h-45 w-full flex-col items-center justify-center rounded-2xl bg-muted/10 border border-dashed border-border/60 mt-4">
            <PieChartIcon className="h-8 w-8 text-muted-foreground/40 mb-3" />
            <span className="text-sm text-muted-foreground font-medium">
              Sin datos este mes
            </span>
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square h-45 w-45 mt-2"
          >
            <PieChart>
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    hideLabel
                    formatter={(value, _name, item) => [
                      formatCLP(value as number),
                      item.payload?.label,
                    ]}
                  />
                }
              />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="label"
                innerRadius={50}
                outerRadius={80}
                strokeWidth={3}
                stroke="var(--background)"
              >
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        )}

        {!isLoading && chartData.length > 0 && (
          <div className="flex flex-col gap-2 px-1 mt-auto">
            {chartData.map((item) => {
              const percentage = ((item.value / (total || 1)) * 100).toFixed(1);
              const IconComponent = item.icon;

              return (
                <div
                  key={item.name}
                  className="flex items-center justify-between text-sm group"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-7 w-7 flex items-center justify-center rounded-lg shadow-sm border border-border/5"
                      style={{
                        backgroundColor: `${item.fill}20`,
                        color: item.fill,
                      }}
                    >
                      <IconComponent size={14} strokeWidth={2.5} />
                    </div>

                    <span
                      className="text-muted-foreground font-medium truncate max-w-30"
                      title={item.label}
                    >
                      {item.label}
                    </span>
                  </div>
                  <span className="font-bold text-foreground">
                    {percentage}%
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
