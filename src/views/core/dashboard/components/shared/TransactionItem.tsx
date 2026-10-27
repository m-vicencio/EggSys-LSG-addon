"use client";

import { ArrowRightLeft, EllipsisVertical, Pencil, Trash2 } from "lucide-react";
import { useRef } from "react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getCategoryMeta } from "@/lib/categories";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import type {
  Transaction,
  Transfer,
} from "@/views/core/dashboard/interfaces/dashboard";

interface TxProps {
  tx: Transaction;
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
}

export function TransactionItem({ tx, onEdit, onDelete }: TxProps) {
  const isOnline = useAppStore((state) => state.isOnline);
  const isIncome = tx.type === "INCOME";
  const deleteTriggerRef = useRef<HTMLButtonElement | null>(null);

  const meta = getCategoryMeta(tx.category);
  const Icon = meta.icon;

  return (
    <DropdownMenu>
      <div className="group flex items-center gap-4 px-4 py-4 hover:bg-muted/30 active:bg-muted/50 transition-colors border-b border-border/40 last:border-0 touch-pan-y">
        <div
          className="h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"
          style={{ backgroundColor: `${meta.color}15`, color: meta.color }}
        >
          <Icon className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground truncate">
            {tx.name}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <Badge
              variant="secondary"
              className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0 rounded-md"
            >
              {tx.category?.name || "Sin categoría"}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatDate(tx.date)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <p
            className={`text-sm font-bold tracking-tight text-right ${isIncome ? "text-emerald-600" : "text-foreground"}`}
          >
            {isIncome ? "+" : "-"} {formatCurrency(tx.amount)}
          </p>
          <DropdownMenuTrigger
            asChild
            disabled={!isOnline}
            aria-label="Más opciones"
          >
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/60 active:bg-muted/80"
            >
              <EllipsisVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
        </div>
      </div>

      <DropdownMenuContent align="end" className="w-44 rounded-xl shadow-xl">
        <DropdownMenuItem
          onSelect={() => onEdit(tx)}
          className="flex items-center gap-2 cursor-pointer rounded-lg mx-1"
          disabled={!isOnline}
        >
          <Pencil className="h-4 w-4" />
          <span>Editar</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onSelect={() => deleteTriggerRef.current?.click()}
          className="flex items-center gap-2 text-destructive focus:text-destructive cursor-pointer rounded-lg mx-1"
          disabled={!isOnline}
        >
          <Trash2 className="h-4 w-4" />
          <span>Eliminar</span>
        </DropdownMenuItem>
      </DropdownMenuContent>

      <ConfirmDialog
        title="¿Eliminar transacción?"
        description="Esta acción no se puede deshacer."
        confirmText="Sí, eliminar"
        onConfirm={() => onDelete(tx)}
        trigger={
          <button type="button" ref={deleteTriggerRef} className="sr-only" />
        }
      />
    </DropdownMenu>
  );
}

interface TransferItemProps {
  transfer: Transfer;
  viewingAccountId: string;
}

export function TransferItem({
  transfer,
  viewingAccountId,
}: TransferItemProps) {
  const isOutgoing = transfer.fromAccountId === viewingAccountId;
  const counterpart = isOutgoing ? transfer.toAccount : transfer.fromAccount;

  return (
    <div className="flex items-center gap-4 px-4 py-4 hover:bg-muted/30 transition-colors border-b border-border/40 last:border-0">
      <div className="h-10 w-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
        <ArrowRightLeft className="h-5 w-5" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground truncate">
          {isOutgoing ? `→ ${counterpart.name}` : `← ${counterpart.name}`}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <Badge
            variant="secondary"
            className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0 bg-blue-500/10 text-blue-600 border-none rounded-md"
          >
            Transferencia
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatDate(transfer.date)}
          </span>
        </div>
        {transfer.comment && (
          <p className="text-[11px] text-muted-foreground mt-1 truncate italic">
            {transfer.comment}
          </p>
        )}
      </div>

      <div className="text-right shrink-0">
        <p
          className={`text-sm font-bold tracking-tight ${isOutgoing ? "text-muted-foreground" : "text-emerald-600"}`}
        >
          {isOutgoing ? "-" : "+"} {formatCurrency(transfer.amount)}
        </p>
      </div>
    </div>
  );
}
