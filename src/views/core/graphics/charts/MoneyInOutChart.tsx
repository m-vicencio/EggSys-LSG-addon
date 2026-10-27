"use client";

import { useQuery } from "@tanstack/react-query";
import { BarChart3 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, XAxis, YAxis } from "recharts";
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
  esperado: {
    label: "Esperado",
    color: "#cbd5e1", // slate-300
  },
  real: {
    label: "Real",
    color: "#3b82f6", // blue-500
  },
} satisfies ChartConfig;

export const MoneyInOutChart = ({
  selectedAccountId,
  calendarMonth,
  calendarYear,
}: Props) => {
  const { data: chartData = [], isLoading } = useQuery({
    queryKey: ["moneyInOut", selectedAccountId, calendarMonth, calendarYear],
    queryFn: () =>
      graphicsApi.getMoneyInOut(
        selectedAccountId || undefined,
        calendarMonth + 1,
        calendarYear,
      ),
    enabled: true,
  });

  return (
    <Card className="flex flex-col h-full rounded-2xl shadow-sm border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">
          Ingresos vs. gastos
        </CardTitle>
        <CardDescription>
          Comparativa de presupuesto esperado vs. real.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 w-full mt-2 pb-4">
        {isLoading ? (
          <Skeleton className="h-62.5 w-full rounded-2xl" />
        ) : chartData.length === 0 ? (
          <div className="flex h-62.5 w-full flex-col items-center justify-center rounded-2xl bg-muted/10 border border-dashed border-border/60">
            <BarChart3 className="h-8 w-8 text-muted-foreground/40 mb-3" />
            <span className="text-sm text-muted-foreground font-medium">
              No hay movimientos registrados
            </span>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-62.5 w-full">
            <BarChart
              accessibilityLayer
              data={chartData}
              margin={{
                top: 10,
                right: 10,
                left: 0,
                bottom: 0,
              }}
            >
              <CartesianGrid
                vertical={false}
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />

              <XAxis
                dataKey="categoria"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                className="font-medium"
              />

              <YAxis
                tickFormatter={(value) => formatCLP(value as number)}
                tickLine={false}
                axisLine={false}
                width={80}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              />

              <ChartTooltip
                cursor={{ fill: "hsl(var(--muted)/0.3)" }}
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => [
                      formatCLP(value as number),
                      name === "esperado" ? "Esperado" : "Real",
                    ]}
                  />
                }
              />

              <Legend
                verticalAlign="top"
                height={36}
                iconType="circle"
                wrapperStyle={{
                  color: "hsl(var(--foreground))",
                  fontSize: "12px",
                }}
              />

              <Bar
                dataKey="esperado"
                fill="var(--color-esperado)"
                radius={[4, 4, 0, 0]}
                barSize={32}
              />

              <Bar
                dataKey="real"
                fill="var(--color-real)"
                radius={[4, 4, 0, 0]}
                barSize={32}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
};
