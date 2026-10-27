"use client";

import { LineChart } from "lucide-react";
import { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCLP } from "@/lib/format";

interface CumulativeSpendChartProps {
  data: { date: string; ingreso: number; gasto: number }[];
  isLoading: boolean;
}

export const CumulativeSpendChart = ({
  data,
  isLoading,
}: CumulativeSpendChartProps) => {
  const hasData = useMemo(() => {
    return (
      data && data.length > 0 && data.some((d) => d.ingreso > 0 || d.gasto > 0)
    );
  }, [data]);

  return (
    <Card className="flex flex-col h-full rounded-2xl shadow-sm border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">
          Gasto acumulado vs. ingreso
        </CardTitle>
        <CardDescription>
          Seguimiento del gasto acumulado en el mes.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 w-full pb-4">
        {isLoading ? (
          <Skeleton className="h-65 w-full rounded-2xl" />
        ) : !hasData ? (
          <div className="flex h-65 w-full flex-col items-center justify-center rounded-2xl bg-muted/10 border border-dashed border-border/60">
            <LineChart className="h-8 w-8 text-muted-foreground/40 mb-3" />
            <span className="text-sm text-muted-foreground font-medium">
              Sin actividad este mes
            </span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <RechartsLineChart
              data={data}
              margin={{
                top: 10,
                right: 10,
                left: 0,
                bottom: 0,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                tickMargin={10}
              />
              <YAxis
                tickFormatter={(value) => formatCLP(value as number)}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                width={80}
              />
              <Tooltip
                formatter={(value) => formatCLP(value as number)}
                labelStyle={{
                  color: "hsl(var(--muted-foreground))", // Cambiado aquí
                  fontWeight: "bold",
                  marginBottom: "4px",
                }}
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid hsl(var(--border))",
                  backgroundColor: "hsl(var(--background))",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  color: "hsl(var(--muted-foreground))", // Cambiado aquí
                }}
                itemStyle={{
                  color: "hsl(var(--muted-foreground))", // Cambiado aquí
                }}
              />
              <Legend
                verticalAlign="top"
                height={36}
                iconType="circle"
                wrapperStyle={{
                  color: "hsl(var(--muted-foreground))", // Cambiado aquí
                  fontSize: "12px",
                }}
              />
              <Line
                type="monotone"
                dataKey="ingreso"
                stroke="#10b981"
                strokeWidth={3}
                name="Ingreso"
                dot={false}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
              <Line
                type="monotone"
                dataKey="gasto"
                stroke="#ef4444"
                strokeWidth={3}
                name="Gasto"
                dot={false}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </RechartsLineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};
