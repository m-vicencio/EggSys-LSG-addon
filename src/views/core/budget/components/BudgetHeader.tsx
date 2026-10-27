"use client";

import { Layers, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MonthPicker } from "@/components/ui/MonthPicker";
import { MonthYearLabel } from "@/components/ui/MonthYearLabel";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { AppAccount } from "@/views/core/dashboard/interfaces/dashboard";

interface BudgetHeaderProps {
  /** Selector de período */
  calendarOpen: boolean;
  onCalendarOpenChange: (open: boolean) => void;
  calendarYear: number;
  calendarMonth: number; // 0-indexed
  isCurrentMonth: boolean;
  onMonthChange: (year: number, month: number) => void;
  onCurrentMonth: () => void;
  /** Selector de cuenta */
  accounts: AppAccount[];
  selectedAccountId: string;
  onAccountChange: (id: string) => void;
  ALL_ACCOUNTS: string;
}

export function BudgetHeader({
  calendarOpen,
  onCalendarOpenChange,
  calendarYear,
  calendarMonth,
  isCurrentMonth,
  onMonthChange,
  onCurrentMonth,
  accounts,
  selectedAccountId,
  onAccountChange,
  ALL_ACCOUNTS,
}: BudgetHeaderProps) {
  return (
    <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:mt-4">
      <div className="space-y-1">
        <h1 className="text-3xl md:text-4xl font-black tracking-tight flex items-center gap-2">
          Presupuesto <Target className="h-7 w-7 md:h-8 md:w-8 text-primary" />
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Planifica tus gastos mensuales y controla si cumples tus metas.
        </p>
      </div>

      <div className="flex flex-row flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1.5">
          <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1 block">
            Período
          </Label>
          <Popover open={calendarOpen} onOpenChange={onCalendarOpenChange}>
            <PopoverTrigger asChild>
              <Button
                variant={isCurrentMonth ? "outline" : "secondary"}
                className="h-10 font-medium min-w-36 rounded-xl"
              >
                <MonthYearLabel year={calendarYear} month={calendarMonth} />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-auto p-0">
              <MonthPicker
                year={calendarYear}
                month={calendarMonth}
                onChange={onMonthChange}
                onCurrentMonth={onCurrentMonth}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex flex-col gap-1.5 flex-1 min-w-40 sm:min-w-55">
          <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1 block">
            Cuenta
          </Label>
          <Select value={selectedAccountId} onValueChange={onAccountChange}>
            <SelectTrigger className="h-10 font-medium rounded-xl">
              <SelectValue placeholder="Seleccionar cuenta" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value={ALL_ACCOUNTS} className="rounded-lg">
                <span className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  Todas las cuentas
                </span>
              </SelectItem>
              <Separator className="my-1" />
              {accounts.map((acc) => (
                <SelectItem key={acc.id} value={acc.id} className="rounded-lg">
                  {acc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </header>
  );
}
