"use client";

import { Loader2Icon } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/useIsMobile";

import type {
  Transaction,
  Transfer,
} from "@/views/core/dashboard/interfaces/dashboard";
import { TransactionItem, TransferItem } from "./TransactionItem";

type ActivityItem =
  | { kind: "tx"; item: Transaction }
  | { kind: "transfer"; item: Transfer };

interface Props {
  transactions: Transaction[];
  transfers?: Transfer[];
  viewingAccountId?: string | null;
  isLoading: boolean;
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
  onCreateFirst: () => void;
  selectedMonth?: string;
}

export function TransactionList({
  transactions,
  transfers = [],
  viewingAccountId,
  isLoading,
  onEdit,
  onDelete,
  onCreateFirst,
  selectedMonth,
}: Props) {
  const [historialOpen, setHistorialOpen] = useState(false);
  const isMobile = useIsMobile();
  const activity = useMemo<ActivityItem[]>(() => {
    const txItems: ActivityItem[] = transactions.map((t) => ({
      kind: "tx",
      item: t,
    }));
    const trItems: ActivityItem[] = transfers.map((t) => ({
      kind: "transfer",
      item: t,
    }));
    function getTimeValue(value?: string) {
      if (!value) return 0;
      const parsed = new Date(value).getTime();
      return Number.isNaN(parsed) ? 0 : parsed;
    }

    function getCreatedAtValue(item: Transaction | Transfer) {
      if ("createdAt" in item) {
        return getTimeValue(item.createdAt);
      }
      return 0;
    }

    return [...txItems, ...trItems].sort((a, b) => {
      const dA = getTimeValue(a.item.date);
      const dB = getTimeValue(b.item.date);

      if (dA !== dB) {
        return dB - dA;
      }

      const cA = getCreatedAtValue(a.item);
      const cB = getCreatedAtValue(b.item);
      return cB - cA;
    });
  }, [transactions, transfers]);

  const recent = activity.slice(0, 5);

  const monthLabel = selectedMonth
    ? new Date(`${selectedMonth}-01`).toLocaleString("es", {
        month: "long",
        year: "numeric",
      })
    : "este mes";

  function renderItem(
    entry: ActivityItem,
    onEditFn: (tx: Transaction) => void,
    onDeleteFn: (tx: Transaction) => void,
  ) {
    if (entry.kind === "tx") {
      return (
        <TransactionItem
          key={`tx-${entry.item.id}`}
          tx={entry.item}
          onEdit={onEditFn}
          onDelete={onDeleteFn}
        />
      );
    }
    return (
      <TransferItem
        key={`tr-${entry.item.id}`}
        transfer={entry.item}
        viewingAccountId={viewingAccountId ?? ""}
      />
    );
  }

  const historialContent =
    activity.length === 0 ? (
      <p className="p-12 text-center text-sm text-muted-foreground italic">
        No hay movimientos en este mes.
      </p>
    ) : (
      <div className="flex flex-col">
        {activity.map((entry) =>
          renderItem(
            entry,
            (t) => {
              onEdit(t);
              setHistorialOpen(false);
            },
            (t) => {
              onDelete(t);
              setHistorialOpen(false);
            },
          ),
        )}
      </div>
    );

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-black text-xl tracking-tight">
            Actividad reciente
          </h2>
          <Button
            variant="link"
            size="sm"
            className="text-primary font-bold hover:no-underline"
            onClick={() => setHistorialOpen(true)}
            disabled={isLoading || activity.length === 0}
          >
            Ver historial
          </Button>
        </div>

        <Card className="rounded-2xl shadow-sm border-border overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-16 flex justify-center">
                <Loader2Icon className="h-8 w-8 animate-spin text-primary/40" />
              </div>
            ) : activity.length === 0 ? (
              <div className="p-16 text-center space-y-4">
                <p className="text-sm text-muted-foreground italic">
                  No hay movimientos registrados aún.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onCreateFirst}
                  className="rounded-xl font-bold"
                >
                  Crear mi primer registro
                </Button>
              </div>
            ) : (
              <div className="flex flex-col">
                {recent.map((entry) => renderItem(entry, onEdit, onDelete))}
                {activity.length > 5 && (
                  <div className="p-2 bg-muted/5 border-t border-border/40">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs font-bold text-muted-foreground w-full rounded-xl hover:bg-muted/50 transition-all"
                      onClick={() => setHistorialOpen(true)}
                    >
                      Ver {activity.length - 5} registros más
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {isMobile ? (
        <Sheet open={historialOpen} onOpenChange={setHistorialOpen}>
          <SheetContent
            side="bottom"
            className="h-[90vh] rounded-t-3xl flex flex-col px-0"
          >
            <SheetHeader className="px-6 pb-4 pt-2 text-left border-b border-border/40">
              <SheetTitle className="capitalize text-xl font-black tracking-tight">
                Historial de {monthLabel}
              </SheetTitle>
              <SheetDescription className="sr-only">
                Lista completa de movimientos del mes.
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto">
              <div className="flex flex-col pb-10">{historialContent}</div>
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={historialOpen} onOpenChange={setHistorialOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden border-border rounded-2xl shadow-2xl">
            <DialogHeader className="px-8 pt-8 pb-4 border-b border-border/40">
              <DialogTitle className="text-2xl font-black tracking-tight text-foreground capitalize">
                Historial de {monthLabel}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Lista completa de transacciones y transferencias registradas.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-4 py-2">
              <div className="flex flex-col pb-6">{historialContent}</div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
