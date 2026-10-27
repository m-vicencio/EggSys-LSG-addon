"use client";

import { Check, Loader2, Pencil, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getCategoryMeta } from "@/lib/categories";
import { formatMoneyPreview, sanitizeMoneyInput } from "@/lib/format";
import { formatCurrency } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import type {
  Budget,
  Category,
} from "@/views/core/dashboard/interfaces/dashboard";

interface BudgetCardProps {
  category: Category;
  budget: Budget;
  spentAmount: number;
  onSave: (amount: number) => void;
  isSaving: boolean;
  onDelete?: () => void;
  isDeleting?: boolean;
  readOnly?: boolean;
}

export function BudgetCard({
  category,
  budget,
  spentAmount,
  onSave,
  isSaving,
  onDelete,
  isDeleting,
  readOnly = false,
}: BudgetCardProps) {
  const isOnline = useAppStore((state) => state.isOnline);
  const [localAmount, setLocalAmount] = useState(budget.idealAmount.toString());
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalAmount(budget.idealAmount.toString());
  }, [budget.idealAmount]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const idealAmount = budget.idealAmount;
  const percent =
    idealAmount > 0 ? Math.min((spentAmount / idealAmount) * 100, 100) : 0;
  const isOver = idealAmount > 0 && spentAmount > idealAmount;

  const progressColor =
    percent >= 100
      ? "bg-red-500"
      : percent >= 80
        ? "bg-yellow-400"
        : "bg-primary";

  const isDirty = localAmount !== budget.idealAmount.toString();
  const meta = getCategoryMeta(category);
  const Icon = meta.icon;

  const handleSave = () => {
    if (isDirty && Number(localAmount) > 0 && isOnline) {
      onSave(Number(localAmount));
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setLocalAmount(budget.idealAmount.toString());
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") handleCancel();
  };

  return (
    <Card
      className={`transition-all duration-300 relative ${
        isOver
          ? "border-red-300 bg-red-50/30 dark:bg-red-950/10"
          : "hover:border-primary/30"
      }`}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between gap-4">
          {/* LADO IZQUIERDO: Ícono, Nombre y Badge de Excedido */}
          {/* El min-w-0 es súper importante para que el "truncate" del texto funcione si el nombre es muy largo */}
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm"
              style={{ backgroundColor: meta.color }}
            >
              <Icon className="w-4 h-4 text-white" />
            </span>
            <span className="font-bold truncate">{category.name}</span>

            {isOver && (
              <Badge
                variant="destructive"
                className="text-[10px] animate-pulse shrink-0"
              >
                Excedido
              </Badge>
            )}
          </div>

          {/* LADO DERECHO: Botón de eliminar alineado perfectamente al centro vertical */}
          {!readOnly && onDelete && (
            <div className="shrink-0 -mr-2">
              {" "}
              {/* -mr-2 acerca sutilmente el botón al borde derecho */}
              <ConfirmDialog
                trigger={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground/60 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-950/50 rounded-full transition-colors"
                    disabled={isDeleting || !isOnline}
                    aria-label={`Eliminar presupuesto de ${category.name}`}
                  >
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                }
                title="Eliminar presupuesto"
                description={`¿Estás seguro de que deseas eliminar la meta de presupuesto para ${category.name}? Esta acción no eliminará tus gastos, solo la planificación.`}
                confirmText="Eliminar"
                cancelText="Cancelar"
                onConfirm={onDelete}
              />
            </div>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {!readOnly && (
          <div className="flex flex-col gap-1.5 min-h-10 justify-center">
            {isEditing ? (
              <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
                <div className="relative flex-1">
                  <Input
                    ref={inputRef}
                    type="text"
                    inputMode="numeric"
                    value={formatMoneyPreview(localAmount) ?? ""}
                    onChange={(e) =>
                      setLocalAmount(sanitizeMoneyInput(e.target.value))
                    }
                    onKeyDown={handleKeyDown}
                    className="pl-4 pr-12 h-10 bg-background border border-primary focus:border-primary transition-all font-semibold rounded-xl w-full"
                    placeholder="0"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-muted-foreground/70 tracking-widest pointer-events-none">
                    CLP
                  </div>
                </div>

                <Button
                  variant="default"
                  size="icon"
                  className="h-10 w-10 shrink-0 rounded-xl bg-green-600 hover:bg-green-700 text-white shadow-sm"
                  disabled={
                    isSaving ||
                    !isDirty ||
                    Number(localAmount) <= 0 ||
                    !isOnline
                  }
                  onClick={handleSave}
                  aria-label="Guardar meta"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                </Button>

                <Button
                  variant="secondary"
                  size="icon"
                  className="h-10 w-10 shrink-0 rounded-xl"
                  onClick={handleCancel}
                  disabled={isSaving}
                  aria-label="Cancelar edición"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between py-1 -ml-2 pl-2">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    Meta mensual
                  </p>
                  <div className="flex items-baseline gap-1.5">
                    <p className="text-xl font-extrabold text-foreground">
                      {formatCurrency(idealAmount, budget.currency ?? "CLP")}
                    </p>
                    <span className="text-[11px] font-bold tracking-widest text-muted-foreground">
                      {budget.currency ?? "CLP"}
                    </span>
                  </div>
                </div>
                {/* Botón de editar siempre visible */}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-lg text-xs font-medium bg-background shadow-sm hover:bg-secondary transition-colors"
                  onClick={() => setIsEditing(true)}
                  aria-label={`Editar meta mensual de ${category.name}`}
                >
                  <Pencil className="h-3 w-3 mr-1.5" />
                  Editar
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="space-y-2 pt-2">
          <div className="flex justify-between text-xs font-semibold">
            <span className={isOver ? "text-red-600" : "text-muted-foreground"}>
              Gastado: {formatCurrency(spentAmount, budget.currency ?? "CLP")}
            </span>
            {readOnly && (
              <span className="text-muted-foreground">
                Meta: {formatCurrency(idealAmount, budget.currency ?? "CLP")}
              </span>
            )}
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className={`h-full transition-all duration-500 ${progressColor}`}
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="text-right text-[10px] text-muted-foreground">
            {percent.toFixed(0)}% utilizado
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
