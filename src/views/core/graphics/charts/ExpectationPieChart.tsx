"use client";

import { useQuery } from "@tanstack/react-query";
import { PieChart as PieChartIcon } from "lucide-react";
import { useCallback, useMemo } from "react";
import { Cell, Pie, PieChart } from "recharts";
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
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { graphicsApi } from "@/lib/api";
import { getCategoryMeta } from "@/lib/categories";
import { formatCLP } from "@/lib/format";

const chartConfig = {
  valor: { label: "Monto" },
} satisfies ChartConfig;

type ExpectationSlice = {
  category: string;
  label?: string;
  iconName?: string | null;
  color?: string | null;
  valor: number;
};
type EnrichedSlice = ExpectationSlice & { label: string; fill?: string };

type Props = {
  selectedAccountId?: string | null;
  calendarMonth: number;
  calendarYear: number;
};

export const ExpectationPieChart = ({
  selectedAccountId,
  calendarMonth,
  calendarYear,
}: Props) => {
  const { data, isLoading } = useQuery<{
    expected: ExpectationSlice[];
    real: ExpectationSlice[];
  }>({
    queryKey: [
      "expectationPie",
      selectedAccountId,
      calendarMonth,
      calendarYear,
    ],
    queryFn: () =>
      graphicsApi.getExpectationPie(
        selectedAccountId || undefined,
        calendarMonth + 1,
        calendarYear,
      ),
    enabled: true,
  });

  const enrichData = useCallback(
    (rawData: ExpectationSlice[]): EnrichedSlice[] =>
      rawData.map((item) => {
        const metaById = getCategoryMeta(item);
        const metaByLabel = getCategoryMeta(item.label);
        const useByLabel = metaById.label === "Otros" && Boolean(item.label);
        const meta = useByLabel ? metaByLabel : metaById;

        return {
          ...item,
          label: meta.label,
          fill: meta.color,
        };
      }),
    [],
  );

  const expectedData = useMemo(
    () => enrichData(data?.expected ?? []),
    [data?.expected, enrichData],
  );

  const realData = useMemo(
    () => enrichData(data?.real ?? []),
    [data?.real, enrichData],
  );

  const legendData = useMemo(() => {
    const uniqueCategories = new Map<string, EnrichedSlice>();
    expectedData.forEach((d) => {
      uniqueCategories.set(d.category, d);
    });
    realData.forEach((d) => {
      uniqueCategories.set(d.category, d);
    });
    return Array.from(uniqueCategories.values());
  }, [expectedData, realData]);

  return (
    <Card className="flex flex-col h-full lg:col-span-2 rounded-2xl shadow-sm border-border">
      <CardHeader className="items-center pb-2">
        <CardTitle className="text-base font-semibold">
          Distribución por categoría (esperado vs. real)
        </CardTitle>
        <CardDescription>
          Comparativa visual de cómo se planificó vs cómo se gastó.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 pb-6 flex flex-col justify-between">
        <div className="flex flex-col md:flex-row gap-6 md:gap-0 w-full mb-8 mt-4">
          <div className="flex-1 min-w-0 flex flex-col items-center">
            {isLoading ? (
              <Skeleton className="aspect-square h-50 w-50 rounded-full" />
            ) : expectedData.length === 0 ? (
              <div className="flex aspect-square h-50 w-50 flex-col items-center justify-center rounded-full bg-muted/10 border border-dashed border-border/60">
                <PieChartIcon className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <span className="text-sm text-muted-foreground font-medium text-center leading-tight">
                  Sin
                  <br />
                  presupuesto
                </span>
              </div>
            ) : (
              <ChartContainer
                config={chartConfig}
                className="aspect-square h-50 w-50"
              >
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        hideLabel
                        formatter={(value, _name, item) => [
                          formatCLP(value as number),
                          item.payload.label,
                        ]}
                      />
                    }
                  />
                  <Pie
                    data={expectedData}
                    dataKey="valor"
                    nameKey="label"
                    innerRadius={60}
                    outerRadius={90}
                    strokeWidth={2}
                    stroke="var(--background)"
                  >
                    {expectedData.map((entry) => (
                      <Cell
                        key={`${entry.category}-expected`}
                        fill={entry.fill}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            )}
            <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mt-5 block text-center">
              Presupuesto esperado
            </Label>
          </div>

          <div className="flex-1 min-w-0 flex flex-col items-center">
            {isLoading ? (
              <Skeleton className="aspect-square h-50 w-50 rounded-full" />
            ) : realData.length === 0 ? (
              <div className="flex aspect-square h-50 w-50 flex-col items-center justify-center rounded-full bg-muted/10 border border-dashed border-border/60">
                <PieChartIcon className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <span className="text-sm text-muted-foreground font-medium text-center leading-tight">
                  Sin
                  <br />
                  gastos
                </span>
              </div>
            ) : (
              <ChartContainer
                config={chartConfig}
                className="aspect-square h-50 w-50"
              >
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        hideLabel
                        formatter={(value, _name, item) => [
                          formatCLP(value as number),
                          item.payload.label,
                        ]}
                      />
                    }
                  />
                  <Pie
                    data={realData}
                    dataKey="valor"
                    nameKey="label"
                    innerRadius={60}
                    outerRadius={90}
                    strokeWidth={2}
                    stroke="var(--background)"
                  >
                    {realData.map((entry) => (
                      <Cell key={`${entry.category}-real`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            )}
            <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mt-5 block text-center">
              Gasto real
            </Label>
          </div>
        </div>

        {!isLoading && legendData.length > 0 && (
          <div className="w-full flex justify-center mt-auto">
            <div className="flex flex-wrap gap-x-5 gap-y-3 justify-center text-sm">
              {legendData.map((d) => (
                <div key={d.category} className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: d.fill }}
                  />
                  <span className="text-muted-foreground font-medium">
                    {d.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
