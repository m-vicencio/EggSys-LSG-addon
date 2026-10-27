import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import type React from "react";
import { Button } from "./button";

const MONTHS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

interface MonthPickerProps {
  year: number;
  month: number; // 0-indexed
  onChange: (year: number, month: number) => void;
  onCurrentMonth?: () => void;
}

export const MonthPicker: React.FC<MonthPickerProps> = ({
  year,
  month,
  onChange,
  onCurrentMonth,
}) => {
  return (
    <div className="rounded-2xl bg-background p-6 shadow flex flex-col items-center">
      <div className="flex items-center justify-between w-full mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onChange(year - 1, month)}
        >
          <ChevronLeftIcon />
        </Button>
        <span className="text-xl font-semibold">{year}</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onChange(year + 1, month)}
        >
          <ChevronRightIcon />
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-6">
        {MONTHS.map((m, idx) => (
          <Button
            key={m}
            variant={idx === month ? "default" : "ghost"}
            className={
              idx === month
                ? "bg-linear-to-r from-blue-500 to-cyan-400 text-white font-bold shadow"
                : ""
            }
            onClick={() => onChange(year, idx)}
          >
            {m}
          </Button>
        ))}
      </div>
      <div className="flex w-full gap-2 mt-2">
        <Button
          variant="secondary"
          className="flex-1"
          onClick={() => onChange(year, month - 1)}
        >
          Mes anterior
        </Button>
        <Button variant="default" className="flex-1" onClick={onCurrentMonth}>
          Mes actual
        </Button>
      </div>
    </div>
  );
};
