"use client";

import { Cell, Pie, PieChart, Label as RechartsLabel } from "recharts";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Label } from "@/components/ui/label";
import { useIsMobile } from "@/hooks/useIsMobile";
import type { DashboardPieChartProps } from "@/views/core/dashboard/interfaces/dashboard";

export function DashboardPieChart({
  data,
  saldo,
  ingresos,
  gastos,
  saldoValue,
  ingresosValue,
  gastosValue,
}: DashboardPieChartProps) {
  const isMobile = useIsMobile();
  const hasExpenseData =
    data && data.length > 0 && data.some((item) => item.value > 0);
  const hasFinancialActivity =
    Math.abs(ingresosValue) > 0 || Math.abs(gastosValue) > 0;
  const shouldShowSummary = hasFinancialActivity || Math.abs(saldoValue) > 0;

  const ghostData = [{ name: "Sin datos", value: 1, fill: "transparent" }];

  const chartConfig = {
    value: { label: "Monto" },
  } satisfies ChartConfig;

  const containerSizeClasses = isMobile
    ? "aspect-square min-h-72"
    : "aspect-square max-h-72";

  return (
    <Card className="overflow-hidden rounded-2xl border-none shadow-xl bg-linear-to-b from-card to-secondary/10 relative transition-all">
      {/* ── Header ── */}
      <CardHeader className="pt-6 pb-2">
        <Label className="text-sm font-bold tracking-widest uppercase text-muted-foreground">
          Resumen financiero del mes
        </Label>
      </CardHeader>

      {/* ── Body ── */}
      <CardContent className="flex flex-col items-center pt-2 pb-6">
        <ChartContainer
          config={chartConfig}
          className={`mx-auto w-full [&_.recharts-pie-label-text]:fill-foreground text-[10px] sm:text-xs ${containerSizeClasses}`}
        >
          <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            {hasExpenseData && (
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    hideLabel
                    className="rounded-xl shadow-xl"
                  />
                }
              />
            )}

            <Pie
              data={hasExpenseData ? data : ghostData}
              dataKey="value"
              nameKey="name"
              innerRadius={isMobile ? 75 : 65}
              outerRadius={isMobile ? 100 : 85}
              stroke={
                hasExpenseData
                  ? "hsl(var(--background))"
                  : "rgba(255, 255, 255, 0.2)"
              }
              strokeWidth={hasExpenseData ? 3 : 1.5}
              strokeDasharray={hasExpenseData ? "none" : "4 4"}
              paddingAngle={hasExpenseData ? 4 : 0} // Sin espacios entre segmentos si es fantasma
            >
              {hasExpenseData ? (
                data.map((entry, index) => (
                  <Cell key={`cell-${index - 1}`} fill={entry.fill} />
                ))
              ) : (
                <Cell key="ghost" fill="transparent" />
              )}
              <RechartsLabel
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-2xl font-black tracking-tight"
                        >
                          {shouldShowSummary ? saldo : "$0"}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 22}
                          className="fill-muted-foreground text-[10px] uppercase font-bold tracking-widest"
                        >
                          {hasFinancialActivity
                            ? "Saldo total"
                            : "Sin movimientos"}
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>

        {hasExpenseData && (
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 px-4">
            {data.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: item.fill }}
                />
                <span className="text-[11px] font-medium text-muted-foreground leading-none">
                  {item.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="bg-secondary/5 pt-4 pb-5 rounded-b-2xl border-t border-border/40">
        <div className="flex w-full justify-around">
          {/* Ingresos */}
          <div className="flex flex-col items-center gap-1">
            <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Ingresos
            </Label>
            <p
              className={`text-2xl font-black tracking-tight ${
                Math.abs(ingresosValue) > 0
                  ? "text-emerald-600"
                  : "text-muted-foreground/50"
              }`}
            >
              {Math.abs(ingresosValue) > 0 ? `+${ingresos}` : "$0"}
            </p>
          </div>

          <div className="w-px bg-border/50 h-10 self-center" />

          {/* Gastos */}
          <div className="flex flex-col items-center gap-1">
            <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Gastos
            </Label>
            <p
              className={`text-2xl font-black tracking-tight ${
                Math.abs(gastosValue) > 0
                  ? "text-red-500"
                  : "text-muted-foreground/50"
              }`}
            >
              {Math.abs(gastosValue) > 0 ? `-${gastos}` : "$0"}
            </p>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
