"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { useCategories } from "@/hooks/useCategories";
import { useIsMobile } from "@/hooks/useIsMobile";
import { getCategoryMeta } from "@/lib/categories";
import { formatMoneyPreview, sanitizeMoneyInput } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import {
  type TransactionFormValues,
  useTransactionDelete,
  useTransactionSubmit,
} from "@/views/core/dashboard/hooks/useTransactionSubmit";
import type { Transaction } from "@/views/core/dashboard/interfaces/dashboard";

const transactionSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  amount: z.string().refine((val) => Number.parseFloat(val) > 0, {
    message: "El monto debe ser mayor a $0",
  }),
  name: z.string().min(3, "La descripción debe tener al menos 3 caracteres"),
  categoryId: z.string().min(1, "Debes seleccionar una categoría"),
  accountId: z.string().min(1, "Debes seleccionar una cuenta"),
  date: z.string().min(1, "La fecha es obligatoria"),
});

type TransactionType = "INCOME" | "EXPENSE";

function formatDateToInput(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const EMPTY_FORM: TransactionFormValues = {
  type: "EXPENSE",
  amount: "",
  name: "",
  categoryId: "",
  accountId: "",
  date: formatDateToInput(new Date()),
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
      {children}
    </Label>
  );
}

function TypeToggle({
  value,
  onChange,
}: {
  value: TransactionType;
  onChange: (v: TransactionType) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5 p-1.5 rounded-2xl bg-muted/50 border border-border/50">
      <Button
        type="button"
        variant={value === "EXPENSE" ? "default" : "ghost"}
        onClick={() => onChange("EXPENSE")}
        className="flex items-center gap-2 h-10 rounded-xl"
      >
        <ArrowDownCircle className="w-4 h-4" />
        Gasto
      </Button>

      <Button
        type="button"
        variant={value === "INCOME" ? "default" : "ghost"}
        onClick={() => onChange("INCOME")}
        className="flex items-center gap-2 h-10 rounded-xl"
      >
        <ArrowUpCircle className="w-4 h-4" />
        Ingreso
      </Button>
    </div>
  );
}

function InnerTransactionForm({
  open,
  onOpenChange,
  accounts,
  defaultAccountId,
  onSuccess,
  transaction,
  forcedType,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: { id: string; name: string; currency?: string }[];
  defaultAccountId: string | null;
  onSuccess: () => void;
  transaction?: Transaction;
  forcedType?: "EXPENSE" | "INCOME";
}) {
  const isOnline = useAppStore((state) => state.isOnline);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      ...EMPTY_FORM,
      accountId:
        defaultAccountId ??
        (accounts && accounts.length === 1 ? accounts[0].id : ""),
      type: forcedType ?? EMPTY_FORM.type,
    },
  });

  const currentType = watch("type");
  const currentCategoryId = watch("categoryId");
  const currentAccountId = watch("accountId");

  const { mutation, isEditing } = useTransactionSubmit({
    transaction,
    onSuccess,
    onOpenChange,
  });
  const { mutation: deleteMutation } = useTransactionDelete({
    transaction,
    onSuccess,
    onOpenChange,
  });

  const {
    categories,
    isLoading: categoriesLoading,
    isError: categoriesError,
  } = useCategories({ enabled: open });

  useEffect(() => {
    if (open) {
      // removed debug logging
      if (transaction) {
        const txDate = transaction.date
          ? new Date(transaction.date)
          : new Date();
        reset({
          type: transaction.type,
          amount: String(transaction.amount),
          name: transaction.name,
          categoryId: transaction.categoryId ?? "",
          accountId:
            transaction.accountId ??
            defaultAccountId ??
            (accounts && accounts.length === 1 ? accounts[0].id : "") ??
            "",
          date: formatDateToInput(txDate),
        });
      } else {
        const accountIdDefault =
          defaultAccountId ??
          (accounts && accounts.length === 1 ? accounts[0].id : "");

        reset({
          ...EMPTY_FORM,
          accountId: accountIdDefault ?? "",
          type: forcedType ?? "EXPENSE",
        });
      }
    }
  }, [open, transaction, defaultAccountId, forcedType, reset, accounts]);

  useEffect(() => {
    if (!open || !transaction) return;

    if (
      !currentAccountId &&
      (transaction.accountId ||
        defaultAccountId ||
        (accounts && accounts.length === 1))
    ) {
      setValue(
        "accountId",
        transaction.accountId ??
          defaultAccountId ??
          (accounts && accounts.length === 1 ? accounts[0].id : "") ??
          "",
        {
          shouldValidate: true,
        },
      );
    }

    if (
      !currentCategoryId &&
      transaction.category?.name &&
      categories?.length
    ) {
      const matchedCategory = categories.find(
        (c) =>
          c.type === transaction.type && c.name === transaction.category.name,
      );
      if (matchedCategory) {
        setValue("categoryId", matchedCategory.id, { shouldValidate: true });
      }
    }
  }, [
    open,
    transaction,
    categories,
    accounts,
    defaultAccountId,
    currentAccountId,
    currentCategoryId,
    setValue,
  ]);

  return (
    <form
      onSubmit={handleSubmit((data) => mutation.mutate(data))}
      className="flex flex-col gap-6 pt-2"
    >
      {/* 1. Tipo */}
      <div className="space-y-2">
        <FieldLabel>Tipo de movimiento</FieldLabel>
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <TypeToggle
              value={field.value}
              onChange={(type) => {
                field.onChange(type);
                setValue("categoryId", "");
              }}
            />
          )}
        />
      </div>

      {/* 2. Monto */}
      <div className="space-y-2">
        <FieldLabel>Monto</FieldLabel>
        <div
          className={cn(
            "relative rounded-2xl border-[1.5px] overflow-hidden transition-all bg-background",
            errors.amount
              ? "border-red-400 focus-within:shadow-[0_0_0_3px_rgba(248,113,113,0.1)]"
              : "border-border/50 focus-within:border-primary focus-within:shadow-[0_0_0_3px_var(--primary-shadow)]",
          )}
        >
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-muted-foreground pointer-events-none select-none">
            $
          </span>
          <Controller
            control={control}
            name="amount"
            render={({ field }) => (
              <Input
                type="text"
                inputMode="numeric"
                placeholder="0"
                className="pl-9 py-4 text-2xl font-bold border-none bg-transparent shadow-none focus-visible:ring-0 text-foreground placeholder:text-muted-foreground/50 h-auto"
                value={formatMoneyPreview(field.value) ?? ""}
                onChange={(e) =>
                  field.onChange(sanitizeMoneyInput(e.target.value))
                }
                onWheel={(e) => e.currentTarget.blur()}
              />
            )}
          />
        </div>
        {errors.amount && (
          <p className="text-xs font-medium text-red-500 pl-1">
            {errors.amount.message}
          </p>
        )}
      </div>

      {/* 3. Descripción */}
      <div className="space-y-2">
        <FieldLabel>Descripción</FieldLabel>
        <Input
          placeholder={
            currentType === "EXPENSE"
              ? "Ej: Almuerzo, metro, supermercado..."
              : "Ej: Sueldo, freelance, transferencia..."
          }
          className={cn(
            "rounded-xl border-[1.5px] h-12 font-medium text-foreground placeholder:text-muted-foreground/50 transition-all bg-background",
            errors.name
              ? "border-red-400 focus-visible:ring-0 focus-visible:shadow-[0_0_0_3px_rgba(248,113,113,0.1)]"
              : "border-border/50 hover:border-primary/50 focus-visible:border-primary focus-visible:ring-0",
          )}
          {...register("name")}
        />
        {errors.name && (
          <p className="text-xs font-medium text-red-500 pl-1">
            {errors.name.message}
          </p>
        )}
      </div>

      {/* 4. Fecha */}
      <div className="space-y-2">
        <FieldLabel>Fecha</FieldLabel>
        <Input
          type="date"
          className={cn(
            "rounded-xl border-[1.5px] h-12 font-medium text-foreground transition-all bg-background",
            errors.date
              ? "border-red-400 focus-visible:ring-0 focus-visible:shadow-[0_0_0_3px_rgba(248,113,113,0.1)]"
              : "border-border/50 hover:border-primary/50 focus-visible:border-primary focus-visible:ring-0",
          )}
          {...register("date")}
        />
        {errors.date && (
          <p className="text-xs font-medium text-red-500 pl-1">
            {errors.date.message}
          </p>
        )}
      </div>

      {/* 5. Categoría + Cuenta */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <FieldLabel>Categoría</FieldLabel>
          <Controller
            control={control}
            name="categoryId"
            render={({ field }) => (
              <Select
                value={field.value || undefined}
                onValueChange={field.onChange}
              >
                <SelectTrigger
                  className={cn(
                    "w-full rounded-xl border-[1.5px] h-14 font-medium text-foreground transition-all bg-background",
                    errors.categoryId
                      ? "border-red-400 focus:ring-0 focus:shadow-[0_0_0_3px_rgba(248,113,113,0.1)]"
                      : "border-border/50 hover:border-primary/50 focus:border-primary focus:ring-0",
                  )}
                >
                  <SelectValue
                    placeholder={
                      categoriesLoading ? "Cargando..." : "Categoría"
                    }
                  >
                    {field.value &&
                      (() => {
                        const cat = categories?.find(
                          (x) => x.id === field.value,
                        );
                        const meta = getCategoryMeta(cat);
                        const Icon = meta.icon;

                        return (
                          <span className="flex items-center gap-2">
                            <span
                              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                              style={{ backgroundColor: meta.color }}
                            >
                              <Icon className="w-4 h-4 text-white" />
                            </span>
                            <span className="truncate">
                              {cat?.name ?? field.value}
                            </span>
                          </span>
                        );
                      })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/50">
                  {categoriesError && (
                    <div className="px-3 py-2 text-xs text-red-500">
                      Error al cargar categorías
                    </div>
                  )}
                  {!categoriesLoading &&
                    !categoriesError &&
                    categories
                      ?.filter(
                        (c) => c.type === currentType && (c.isActive ?? true),
                      )
                      .map((c) => {
                        const meta = getCategoryMeta(c);
                        const Icon = meta.icon;
                        return (
                          <SelectItem
                            key={c.id}
                            value={c.id}
                            className="rounded-lg"
                          >
                            <span className="flex items-center gap-2">
                              <span
                                className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                                style={{ backgroundColor: meta.color }}
                              >
                                <Icon className="w-4 h-4 text-white" />
                              </span>
                              <span>{c.name}</span>
                            </span>
                          </SelectItem>
                        );
                      })}
                </SelectContent>
              </Select>
            )}
          />
          {errors.categoryId && (
            <p className="text-xs font-medium text-red-500 pl-1">
              {errors.categoryId.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <FieldLabel>Cuenta</FieldLabel>
          <Controller
            control={control}
            name="accountId"
            defaultValue={
              defaultAccountId ??
              (accounts && accounts.length === 1 ? accounts[0].id : "")
            }
            render={({ field }) => {
              if (accounts && accounts.length === 1) {
                const acc = accounts[0];
                return (
                  <div className="rounded-xl border-[1.5px] h-12 font-medium text-foreground transition-all bg-background flex items-center justify-between px-4">
                    <div className="flex items-center gap-2 truncate">
                      <span className="truncate">{acc.name}</span>
                      {acc.currency && (
                        <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {acc.currency}
                        </span>
                      )}
                    </div>
                    <input
                      type="hidden"
                      name={field.name}
                      value={field.value || acc.id}
                      readOnly
                    />
                  </div>
                );
              }

              return (
                <Select
                  value={field.value || undefined}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger
                    className={cn(
                      "w-full rounded-xl border-[1.5px] h-14 font-medium text-foreground transition-all bg-background",
                      errors.accountId
                        ? "border-red-400 focus:ring-0 focus:shadow-[0_0_0_3px_rgba(248,113,113,0.1)]"
                        : "border-border/50 hover:border-primary/50 focus:border-primary focus:ring-0",
                    )}
                  >
                    <SelectValue placeholder="Selecciona una cuenta" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/50">
                    {accounts?.map((acc) => (
                      <SelectItem
                        key={acc.id}
                        value={acc.id}
                        className="rounded-lg"
                      >
                        <span className="flex items-center gap-2">
                          {acc.name}
                          {acc.currency && (
                            <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              {acc.currency}
                            </span>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              );
            }}
          />
          {errors.accountId && (
            <p className="text-xs font-medium text-red-500 pl-1">
              {errors.accountId.message}
            </p>
          )}
        </div>
      </div>

      {mutation.isError && (
        <p className="text-sm font-medium text-red-500 bg-red-50 px-4 py-2.5 rounded-xl border border-red-100">
          {(mutation.error as { message?: string } | undefined)?.message ||
            "Ocurrió un error al procesar la solicitud."}
        </p>
      )}

      <Button
        type="submit"
        disabled={
          !isOnline ||
          mutation.status === "pending" ||
          deleteMutation.status === "pending"
        }
        className="w-full h-12 mt-4 rounded-xl text-base font-semibold shadow-sm flex items-center gap-2"
      >
        {mutation.status === "pending" ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Guardando...
          </>
        ) : !isOnline ? (
          "Sin conexión"
        ) : (
          <>
            <Sparkles className="w-5 h-5 mr-2" />
            {isEditing ? "Guardar cambios" : "Guardar transacción"}
          </>
        )}
      </Button>
    </form>
  );
}

// ── Contenedor Responsive (Sheet o Dialog) ──────────────────────────────────

export function TransactionSheet(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: { id: string; name: string; currency?: string }[];
  defaultAccountId: string | null;
  onSuccess: () => void;
  transaction?: Transaction;
  forcedType?: "EXPENSE" | "INCOME";
}) {
  const isMobile = useIsMobile();
  const title = props.transaction ? "Editar transacción" : "Nueva transacción";
  const description = props.transaction
    ? "Edita los detalles de tu movimiento"
    : "Agrega un nuevo ingreso o gasto";

  if (isMobile) {
    return (
      <Sheet open={props.open} onOpenChange={props.onOpenChange}>
        <SheetContent
          side="bottom"
          className="p-6 h-auto max-h-[90vh] overflow-y-auto rounded-t-3xl"
        >
          <SheetHeader className="pb-4 text-left">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-muted/60 rounded-2xl flex items-center justify-center shrink-0">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div>
                <SheetTitle className="text-xl font-bold">{title}</SheetTitle>
                <SheetDescription className="text-sm mt-0.5">
                  {description}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
          <InnerTransactionForm {...props} />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-120 p-8 rounded-3xl">
        <DialogHeader className="pb-4 text-left">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-muted/60 rounded-2xl flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
              <DialogDescription className="text-sm mt-0.5">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="overflow-y-auto max-h-[70vh] -mx-2 px-2">
          <InnerTransactionForm {...props} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
