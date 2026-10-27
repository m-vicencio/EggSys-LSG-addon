"use client";

import { CreditCardIcon, PiggyBank, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";
import type { AppAccount } from "@/views/core/dashboard/interfaces/dashboard";

interface Props {
  accounts: AppAccount[];
  selectedAccountId: string | null;
  onSelect: (id: string) => void;
  onSetDefault?: (id: string | null) => void | Promise<unknown>;
}

export function AccountSelector({
  accounts,
  selectedAccountId,
  onSelect,
  onSetDefault,
}: Props) {
  const enhanceName = (name: string) => {
    const isOnlyNumbers = /^\d+$/.test(name.trim());
    return isOnlyNumbers ? `Cuenta ${name}` : name;
  };

  const isSingle = accounts.length === 1;

  return (
    <div className="relative w-full flex flex-col gap-3">
      <div className="relative w-full">
        {!isSingle && (
          <div className="absolute right-0 top-0 z-10 w-8 h-full bg-linear-to-l from-background to-transparent pointer-events-none rounded-r-2xl" />
        )}

        <div
          className={cn(
            "flex gap-4 pb-2 px-1 pt-1",
            "overflow-x-auto scroll-smooth snap-x snap-mandatory no-scrollbar",
          )}
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <style jsx>{`
            .no-scrollbar::-webkit-scrollbar {
              display: none;
            }
          `}</style>

          {accounts.map((acc) => {
            const isActive = acc.id === selectedAccountId;
            const isFavorite = acc.isDefault;
            const displayName = enhanceName(acc.name);
            const isSavings = !!acc.isSavings;

            return (
              <div
                key={acc.id}
                className={cn(
                  "relative transition-all duration-300 shrink-0 snap-center",
                  isSingle
                    ? "w-full sm:max-w-100"
                    : "w-[92%] sm:flex-1 sm:min-w-0 sm:max-w-none md:max-w-100",
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelect(acc.id)}
                  className={cn(
                    "relative flex flex-col w-full h-30 justify-between rounded-4xl text-left border-[1.5px] p-5",
                    "transition-all duration-200 ease-out outline-none focus-visible:ring-2 focus-visible:ring-primary/50",

                    !isActive && [
                      "bg-card border-border text-card-foreground",
                      "hover:border-primary/40 hover:bg-accent/20 ",
                    ],

                    isActive && [
                      "bg-primary text-primary-foreground border-transparent",
                    ],
                  )}
                >
                  <div className="flex items-center gap-3 w-[calc(100%-2.5rem)]">
                    <span
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                        isActive
                          ? "bg-white/20 text-white"
                          : isSavings
                            ? "bg-primary/10 text-primary"
                            : "bg-secondary/80 text-secondary-foreground",
                      )}
                    >
                      {isSavings ? (
                        <PiggyBank className="w-5 h-5" />
                      ) : (
                        <CreditCardIcon className="w-5 h-5" />
                      )}
                    </span>
                    <div className="flex flex-col truncate">
                      <span
                        className={cn(
                          "text-sm font-bold truncate leading-tight",
                          isActive
                            ? "text-primary-foreground"
                            : "text-foreground",
                        )}
                      >
                        {displayName}
                      </span>
                      {isSavings && (
                        <span
                          className={cn(
                            "text-[10px] font-bold uppercase tracking-widest mt-0.5",
                            isActive
                              ? "text-primary-foreground/60"
                              : "text-primary/70",
                          )}
                        >
                          Ahorro
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-baseline gap-1.5 mt-auto w-full truncate pl-0">
                    <span
                      className={cn(
                        "text-3xl font-black tracking-tight truncate leading-none",
                        isActive
                          ? "text-primary-foreground"
                          : "text-foreground",
                      )}
                    >
                      {formatCurrency(acc.balance, acc.currency)}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-bold tracking-widest uppercase",
                        isActive
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground/50",
                      )}
                    >
                      {acc.currency ?? "CLP"}
                    </span>
                  </div>
                </button>

                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  aria-label={
                    isFavorite
                      ? "Quitar como predeterminada"
                      : "Marcar como predeterminada"
                  }
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    const result = onSetDefault?.(isFavorite ? null : acc.id);

                    if (result && typeof (result as any).then === "function") {
                      toast.promise(result as Promise<unknown>, {
                        loading: isFavorite
                          ? "Quitando cuenta predeterminada..."
                          : "Actualizando cuenta predeterminada...",
                        success: isFavorite
                          ? "Cuenta predeterminada eliminada"
                          : "Cuenta establecida como predeterminada",
                        error: "No se pudo actualizar la preferencia",
                      });
                    } else {
                      if (isFavorite) {
                        toast.info("Preferencia quitada", {
                          description: `${displayName} ya no es tu cuenta por defecto.`,
                        });
                      } else {
                        toast.success("Cuenta establecida", {
                          description: `${displayName} es ahora tu cuenta por defecto.`,
                        });
                      }
                    }
                  }}
                  className={cn(
                    "absolute top-4 right-4 z-20 h-auto w-auto bg-transparent p-1.5 shadow-none hover:bg-transparent rounded-full",
                    "transition-all duration-200 hover:scale-110 active:scale-90",
                    isActive ? "hover:bg-white/10" : "hover:bg-muted",
                  )}
                >
                  <Star
                    className={cn(
                      "h-5 w-5 transition-colors",
                      isFavorite
                        ? isActive
                          ? "fill-yellow-300 text-yellow-300"
                          : "fill-amber-400 text-amber-400"
                        : isActive
                          ? "fill-transparent text-white/50"
                          : "fill-transparent text-slate-400",
                    )}
                  />
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {!isSingle && (
        <div className="flex justify-center gap-1.5 mt-1">
          {accounts.map((acc) => (
            <div
              key={`dot-${acc.id}`}
              className={cn(
                "h-1.5 rounded-full transition-all duration-500",
                acc.id === selectedAccountId
                  ? "w-5 bg-primary"
                  : "w-1.5 bg-muted-foreground/40",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
