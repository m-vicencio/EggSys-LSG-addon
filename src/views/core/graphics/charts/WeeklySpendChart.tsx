"use client";

import { useQuery } from "@tanstack/react-query";
import { BarChartHorizontal } from "lucide-react";
import { useMemo } from "react";
import { Bar, BarChart, LabelList, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { graphicsApi } from "@/lib/api";
import { formatCLP } from "@/lib/format";

type Props = {
  selectedAccountId?: string | null;
  calendarMonth: number;
  calendarYear: number;
};

const chartConfig = {
  gasto: {
    label: "Gasto",
    color: "#ef4444", // red-500
  },
} satisfies ChartConfig;

export const WeeklySpendChart = ({
  selectedAccountId,
  calendarMonth,
  calendarYear,
}: Props) => {
  const { data: chartData = [], isLoading } = useQuery({
    queryKey: ["weeklySpend", selectedAccountId, calendarMonth, calendarYear],
    queryFn: () =>
      graphicsApi.getWeeklySpend(
        selectedAccountId || undefined,
        calendarMonth + 1,
        calendarYear,
      ),
    enabled: true,
  });

  const cleanData = useMemo(() => {
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();

    return chartData
      .map((item) => {
        const match = item.semana.match(/(\d+)\s*-\s*(\d+)/);

        if (match) {
          const start = parseInt(match[1], 10);
          if (start > daysInMonth) return null;
          let end = parseInt(match[2], 10);
          if (end > daysInMonth) end = daysInMonth;
          return {
            ...item,
            semana: start === end ? `${start}` : `${start}-${end}`,
          };
        }

        return item;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [chartData, calendarMonth, calendarYear]);

  const hasData = useMemo(() => {
    return cleanData.some((item) => item.gasto > 0);
  }, [cleanData]);

  return (
    <Card className="flex flex-col h-full rounded-2xl shadow-sm border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Gasto semanal</CardTitle>
        <CardDescription>
          Distribución de los gastos por rangos de días.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 w-full pb-4">
        {isLoading ? (
          <Skeleton className="h-62.5 w-full rounded-2xl" />
        ) : !hasData ? (
          <div className="flex h-62.5 w-full flex-col items-center justify-center rounded-2xl bg-muted/10 border border-dashed border-border/60">
            <BarChartHorizontal className="h-8 w-8 text-muted-foreground/40 mb-3" />
            <span className="text-sm text-muted-foreground font-medium">
              Sin gastos este mes
            </span>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-62.5 w-full">
            <BarChart
              accessibilityLayer
              data={cleanData}
              layout="vertical"
              margin={{ top: 10, right: 70, left: 0, bottom: 0 }}
            >
              <XAxis type="number" dataKey="gasto" hide />
              <YAxis
                dataKey="semana"
                type="category"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                width={75}
                // UI FIX: Color y tamaño unificado para etiquetas de ejes
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              />
              <ChartTooltip
                // UI FIX: Cursor compatible con modo oscuro
                cursor={{ fill: "hsl(var(--muted)/0.3)" }}
                content={
                  <ChartTooltipContent
                    hideLabel
                    formatter={(value) => formatCLP(value as number)}
                  />
                }
              />
              <Bar
                dataKey="gasto"
                fill="var(--color-gasto)"
                radius={[0, 8, 8, 0]}
                barSize={24}
              >
                <LabelList
                  dataKey="gasto"
                  position="right"
                  offset={12}
                  className="fill-foreground font-semibold text-[11px]"
                  formatter={(value: number) => formatCLP(value)}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
};
