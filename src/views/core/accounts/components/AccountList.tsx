import {
  CreditCard,
  Landmark,
  Pencil,
  PiggyBank,
  PlusCircle,
  Star,
  Trash2,
} from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AccountListProps {
  accounts: any[];
  isLoading: boolean;
  isOfflineStatus: boolean;
  onOpenCreate: () => void;
  onOpenEdit: (acc: any) => void;
  onSetDefault: (id: string) => void;
  onDelete: (id: string) => void;
}

export function AccountList({
  accounts,
  isLoading,
  isOfflineStatus,
  onOpenCreate,
  onOpenEdit,
  onSetDefault,
  onDelete,
}: AccountListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <p className="text-sm font-semibold text-muted-foreground">
          Cargando cuentas...
        </p>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-in fade-in zoom-in-95 duration-500">
        <div className="h-20 w-20 rounded-[2.5rem] bg-muted/50 flex items-center justify-center mb-6">
          <Landmark className="h-10 w-10 text-muted-foreground/40" />
        </div>
        <h3 className="text-2xl font-black tracking-tight text-foreground mb-2">
          No hay cuentas registradas
        </h3>
        <p className="text-muted-foreground max-w-70 mb-8 leading-relaxed font-medium">
          Agrega tus cuentas bancarias para empezar a controlar tus finanzas.
        </p>
        <Button
          onClick={onOpenCreate}
          disabled={isOfflineStatus}
          className="h-14 px-8 rounded-2xl text-base font-bold shadow-xl shadow-primary/20 active:scale-95 transition-all"
        >
          <PlusCircle className="mr-2 h-5 w-5" />
          {isOfflineStatus ? "Sin conexión" : "Agregar mi primera cuenta"}
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {accounts.map((acc) => {
        const isFavorite = acc.isDefault;

        return (
          <div
            key={acc.id}
            className={cn(
              "relative flex flex-col w-full min-h-45 justify-between rounded-[2.5rem] p-6",
              "bg-card border-[1.5px] border-border shadow-none transition-all duration-200",
              "hover:border-primary/40 hover:bg-accent/5",
              isOfflineStatus && "opacity-80",
            )}
          >
            {/* Parte Superior */}
            <div className="flex items-start justify-between gap-3 w-full">
              <div className="flex items-center gap-4 min-w-0">
                <div
                  className={cn(
                    "h-12 w-12 flex shrink-0 items-center justify-center rounded-2xl transition-colors",
                    acc.isSavings
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {acc.isSavings ? (
                    <PiggyBank className="h-6 w-6" />
                  ) : (
                    <CreditCard className="h-6 w-6" />
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-lg font-bold text-foreground leading-tight truncate">
                    {acc.name}
                  </span>
                  {acc.isSavings && (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary mt-1">
                      Cuenta de ahorro
                    </span>
                  )}
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                disabled={isOfflineStatus}
                onClick={() => onSetDefault(acc.id)}
                className="shrink-0 rounded-full h-10 w-10 text-muted-foreground/40 hover:text-amber-400 hover:bg-amber-50 disabled:opacity-30"
              >
                <Star
                  className={cn(
                    "h-5 w-5 transition-all",
                    isFavorite && "fill-amber-400 text-amber-400",
                  )}
                />
              </Button>
            </div>

            {/* Parte Inferior */}
            <div className="flex flex-wrap items-end justify-between mt-auto pt-4 gap-y-4 gap-x-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl sm:text-4xl font-black tracking-tighter text-foreground break-all">
                  ${Number(acc.balance).toLocaleString("es-CL")}
                </span>
                <span className="text-[10px] font-bold tracking-widest text-muted-foreground/60 uppercase shrink-0 pb-0.5 sm:pb-0">
                  CLP
                </span>
              </div>

              <div
                className={cn(
                  "flex shrink-0 items-center gap-1 bg-muted/30 p-1 rounded-2xl border border-border/50 transition-opacity ml-auto",
                  isOfflineStatus && "opacity-50 grayscale pointer-events-none",
                )}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground hover:text-foreground rounded-xl transition-colors"
                  onClick={() => onOpenEdit(acc)}
                  disabled={isOfflineStatus}
                >
                  <Pencil className="h-4 w-4" />
                </Button>

                <ConfirmDialog
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={isOfflineStatus}
                      className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  }
                  title="Eliminar cuenta"
                  description={`¿Estás seguro de que deseas eliminar la cuenta "${acc.name}"?`}
                  confirmText="Eliminar"
                  cancelText="Cancelar"
                  confirmVariant="destructive"
                  onConfirm={() => onDelete(acc.id)}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
