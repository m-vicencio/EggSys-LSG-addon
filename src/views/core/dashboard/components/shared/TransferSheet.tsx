"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRightLeft, Info, Loader2 } from "lucide-react";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/useIsMobile";
import { formatMoneyPreview, sanitizeMoneyInput } from "@/lib/format";
import { useAppStore } from "@/store/useAppStore";
import { useTransfers } from "@/views/core/dashboard/hooks/useTransfers";

const transferSchema = z
  .object({
    fromAccountId: z.string().min(1, "Selecciona la cuenta origen"),
    toAccountId: z.string().min(1, "Selecciona la cuenta destino"),
    amount: z.string().refine((v) => Number.parseFloat(v) > 0, {
      message: "El monto debe ser mayor a $0",
    }),
    date: z.string().min(1, "La fecha es obligatoria"),
    comment: z.string().max(500).optional(),
  })
  .refine((d) => d.fromAccountId !== d.toAccountId, {
    message: "Las cuentas origen y destino deben ser distintas",
    path: ["toAccountId"],
  });

type TransferFormValues = z.infer<typeof transferSchema>;

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
      {children}
    </Label>
  );
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: { id: string; name: string; balance: number; currency?: string }[];
  defaultAccountId: string | null;
  onSuccess: () => void;
}

export function TransferSheet({
  open,
  onOpenChange,
  accounts,
  defaultAccountId,
  onSuccess,
}: Props) {
  const isMobile = useIsMobile();
  const { createTransfer, isPending } = useTransfers(defaultAccountId);
  const isOnline = useAppStore((state) => state.isOnline);

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      fromAccountId: defaultAccountId ?? "",
      toAccountId: "",
      amount: "",
      date: new Date().toISOString().split("T")[0],
      comment: "",
    },
  });

  const fromAccountId = watch("fromAccountId");

  useEffect(() => {
    if (open) {
      reset({
        fromAccountId: defaultAccountId ?? "",
        toAccountId: "",
        amount: "",
        date: new Date().toISOString().split("T")[0],
        comment: "",
      });
    }
  }, [open, defaultAccountId, reset]);

  const fromAccount = accounts.find((a) => a.id === fromAccountId);
  const fromCurrency = fromAccount?.currency ?? "CLP";
  const availableDestinations = accounts.filter((a) => {
    const destCurrency = a.currency ?? "CLP";
    return a.id !== fromAccountId && destCurrency === fromCurrency;
  });

  const onSubmit = async (values: TransferFormValues) => {
    try {
      await createTransfer({
        fromAccountId: values.fromAccountId,
        toAccountId: values.toAccountId,
        amount: Number.parseFloat(values.amount),
        date: values.date,
        comment: values.comment || undefined,
      });
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Error al transferir");
    }
  };

  const InfoTooltip = () => (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="ml-2 inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring rounded-full"
          aria-label="Información sobre transferencias"
        >
          <Info className="w-4 h-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-70 p-3 text-sm text-center leading-relaxed"
        sideOffset={8}
      >
        Las transferencias entre cuentas propias{" "}
        <strong className="font-semibold text-foreground">
          no se consideran gastos
        </strong>
        , por lo que no descuentan de tu presupuesto disponible.
      </PopoverContent>
    </Popover>
  );

  const formContent = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-2">
      <div className="space-y-2">
        <FieldLabel>Desde</FieldLabel>
        <Controller
          name="fromAccountId"
          control={control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger className="h-12 rounded-xl">
                <SelectValue placeholder="Selecciona cuenta origen" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    <span className="flex items-center gap-2">
                      <span className="font-medium">{acc.name}</span>
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
          )}
        />
        {errors.fromAccountId && (
          <p className="text-xs text-red-500 font-medium">
            {errors.fromAccountId.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <FieldLabel>Hacia</FieldLabel>
        <Controller
          name="toAccountId"
          control={control}
          render={({ field }) => (
            <>
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={!fromAccountId || availableDestinations.length === 0}
              >
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue placeholder="Selecciona cuenta destino" />
                </SelectTrigger>
                <SelectContent>
                  {availableDestinations.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      <span className="flex items-center gap-2">
                        <span className="font-medium">{acc.name}</span>
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
              {fromAccountId && availableDestinations.length === 0 && (
                <p className="text-xs text-yellow-600 font-medium mt-2">
                  No hay cuentas destino con la misma moneda. Solo puedes
                  transferir entre cuentas del mismo tipo.
                </p>
              )}
            </>
          )}
        />
        {errors.toAccountId && (
          <p className="text-xs text-red-500 font-medium">
            {errors.toAccountId.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <FieldLabel>Monto</FieldLabel>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm">
            $
          </span>
          <Controller
            name="amount"
            control={control}
            render={({ field }) => (
              <Input
                type="text"
                inputMode="numeric"
                placeholder="0"
                className="pl-8 h-12 rounded-xl text-base font-bold"
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
          <p className="text-xs text-red-500 font-medium">
            {errors.amount.message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <FieldLabel>Fecha</FieldLabel>
          <Input
            {...register("date")}
            type="date"
            className="h-12 rounded-xl"
          />
          {errors.date && (
            <p className="text-xs text-red-500 font-medium">
              {errors.date.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <FieldLabel>Comentario (opcional)</FieldLabel>
          <Input
            {...register("comment")}
            placeholder="Ej. ahorro mensual..."
            className="h-12 rounded-xl"
          />
          {errors.comment && (
            <p className="text-xs text-red-500 font-medium">
              {errors.comment.message}
            </p>
          )}
        </div>
      </div>

      <Button
        type="submit"
        className="w-full h-12 rounded-xl text-base font-semibold mt-4"
        disabled={!isOnline || isPending}
      >
        {isPending ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Transfiriendo…
          </>
        ) : !isOnline ? (
          "Sin conexión"
        ) : (
          <>
            <ArrowRightLeft className="w-5 h-5 mr-2" />
            Confirmar transferencia
          </>
        )}
      </Button>
    </form>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="p-6 h-auto max-h-[90vh] overflow-y-auto rounded-t-3xl"
        >
          <SheetHeader className="pb-4 text-left">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-muted/60 rounded-2xl flex items-center justify-center shrink-0">
                <ArrowRightLeft className="w-6 h-6 text-primary" />
              </div>
              <div>
                <SheetTitle className="flex items-center text-xl font-bold">
                  Transferir dinero
                  <InfoTooltip />
                </SheetTitle>
                <SheetDescription className="text-sm mt-0.5">
                  Mueve fondos entre tus cuentas
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
          {formContent}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-120 p-8 rounded-3xl">
        <DialogHeader className="pb-4 text-left">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-muted/60 rounded-2xl flex items-center justify-center shrink-0">
              <ArrowRightLeft className="w-6 h-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="flex items-center text-xl font-bold">
                Transferir dinero
                <InfoTooltip />
              </DialogTitle>
              <DialogDescription className="text-sm mt-0.5">
                Mueve fondos entre tus cuentas
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}
