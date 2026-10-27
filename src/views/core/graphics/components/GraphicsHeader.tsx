"use client";

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

interface GraphicsHeaderProps {
  calendarOpen: boolean;
  onCalendarOpenChange: (open: boolean) => void;
  calendarYear: number;
  calendarMonth: number;
  isCurrentMonth: boolean;
  onMonthChange: (date: Date) => void;
  onCurrentMonth: () => void;
  accounts: { id: string; name: string }[];
  selectedAccountId: string;
  onAccountChange: (accountId: string) => void;
}

export const GraphicsHeader = ({
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
}: GraphicsHeaderProps) => {
  const handleMonthPickerChange = (year: number, month: number) => {
    onMonthChange(new Date(year, month));
  };

  return (
    <div className="flex flex-row flex-wrap gap-3 md:gap-4 items-end">
      <div className="flex flex-col gap-1.5">
        <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1 block">
          Período
        </Label>
        <Popover open={calendarOpen} onOpenChange={onCalendarOpenChange}>
          <PopoverTrigger asChild>
            <Button
              variant={isCurrentMonth ? "outline" : "secondary"}
              className="h-10 font-medium min-w-36 rounded-xl transition-all"
            >
              <MonthYearLabel year={calendarYear} month={calendarMonth} />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-auto p-0 rounded-2xl">
            <MonthPicker
              year={calendarYear}
              month={calendarMonth}
              onChange={handleMonthPickerChange}
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
          <SelectTrigger className="h-10 font-medium rounded-xl transition-all">
            <SelectValue placeholder="Seleccionar cuenta" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            {accounts.map((account) => (
              <SelectItem
                key={account.id}
                value={account.id}
                className="rounded-lg"
              >
                {account.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
