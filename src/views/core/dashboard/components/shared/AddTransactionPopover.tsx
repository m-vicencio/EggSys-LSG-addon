"use client";

import {
  ArrowDownCircle,
  ArrowRightLeft,
  ArrowUpCircle,
  PlusIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type AddTransactionPopoverProps = {
  onAddTransaction?: (
    type: "EXPENSE" | "INCOME",
    originAccountId?: string,
  ) => void;
  onTransfer?: () => void;
  currentAccountId?: string | null;
};

export function AddTransactionPopover({
  onAddTransaction,
  onTransfer,
  currentAccountId,
}: AddTransactionPopoverProps) {
  return (
    <div className="fixed bottom-20 right-4 md:bottom-8 md:right-8 z-50">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            className="h-14 w-14 md:h-12 md:w-12 rounded-full shadow-2xl shadow-primary/40 transition-all active:scale-90 group"
            title="Agregar movimiento"
          >
            <PlusIcon className="h-7 w-7 md:h-6 md:w-6 transition-transform group-hover:scale-110" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          sideOffset={16}
          className="p-2 w-56 rounded-2xl shadow-2xl border-border animate-in fade-in zoom-in-95 duration-200"
        >
          <div className="flex flex-col gap-1">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 rounded-xl h-11 px-2 font-bold hover:bg-red-500/5 group/item"
              onClick={() =>
                onAddTransaction?.("EXPENSE", currentAccountId ?? undefined)
              }
            >
              <div className="h-9 w-9 rounded-xl bg-red-500/10 flex items-center justify-center transition-colors group-hover/item:bg-red-500/20">
                <ArrowDownCircle className="h-5 w-5 text-red-500" />
              </div>
              <span className="text-foreground/80 group-hover/item:text-red-600 transition-colors">
                Nuevo gasto
              </span>
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start gap-3 rounded-xl h-11 px-2 font-bold hover:bg-emerald-500/5 group/item"
              onClick={() =>
                onAddTransaction?.("INCOME", currentAccountId ?? undefined)
              }
            >
              <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center transition-colors group-hover/item:bg-emerald-500/20">
                <ArrowUpCircle className="h-5 w-5 text-emerald-500" />
              </div>
              <span className="text-foreground/80 group-hover/item:text-emerald-600 transition-colors">
                Nuevo ingreso
              </span>
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start gap-3 rounded-xl h-11 px-2 font-bold hover:bg-blue-500/5 group/item"
              onClick={onTransfer}
            >
              <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center transition-colors group-hover/item:bg-blue-500/20">
                <ArrowRightLeft className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-foreground/80 group-hover/item:text-blue-600 transition-colors">
                Transferencia
              </span>
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
