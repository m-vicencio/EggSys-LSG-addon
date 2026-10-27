import { CircleDollarSign, PiggyBank } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { formatMoneyPreview, sanitizeMoneyInput } from "@/lib/format";
import { cn } from "@/lib/utils";

interface AccountFormSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  formData: any;
  updateForm: (field: any, value: string | boolean) => void;
  error: string | null;
  isSaving: boolean;
  isOfflineStatus: boolean;
  onSave: () => void;
}

export function AccountFormSheet({
  isOpen,
  onOpenChange,
  formData,
  updateForm,
  error,
  isSaving,
  isOfflineStatus,
  onSave,
}: AccountFormSheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col w-full sm:max-w-md p-0 border-l border-border"
      >
        <SheetHeader className="px-6 py-5 border-b border-border bg-background z-10 text-left">
          <SheetTitle className="text-xl font-extrabold tracking-tight">
            {formData.id ? "Editar cuenta" : "Nueva cuenta bancaria"}
          </SheetTitle>
          <SheetDescription className="text-muted-foreground leading-relaxed">
            {formData.id
              ? "Actualiza los datos de tu cuenta."
              : "Ingresa los datos para registrar una nueva cuenta en tu perfil."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          <div className="space-y-1.5">
            <Label
              htmlFor="account-name"
              className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1 block"
            >
              Nombre de la cuenta
            </Label>
            <Input
              id="account-name"
              className="h-12 px-4 bg-background border border-border focus:border-primary/50 transition-all text-base font-semibold rounded-xl placeholder:text-muted-foreground/60 w-full"
              placeholder="Ej: Mi cuenta principal"
              value={formData.name}
              onChange={(e) => updateForm("name", e.target.value)}
              disabled={isSaving}
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="account-balance"
              className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1 block"
            >
              Saldo actual (opcional)
            </Label>
            <div className="relative group/input">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 border-r pr-3 border-border">
                <CircleDollarSign className="h-4 w-4 text-primary/80" />
              </div>
              <Input
                id="account-balance"
                type="text"
                inputMode="numeric"
                placeholder="0"
                className="pl-16 pr-14 h-12 bg-background border border-border focus:border-primary/50 transition-all text-xl font-semibold rounded-xl placeholder:text-muted-foreground/60"
                value={formatMoneyPreview(formData.balance) ?? ""}
                onChange={(e) => {
                  updateForm("balance", sanitizeMoneyInput(e.target.value));
                  // Forzamos CLP por debajo de ser necesario
                  if (formData.currency !== "CLP") {
                    updateForm("currency", "CLP");
                  }
                }}
                disabled={isSaving}
                onWheel={(e) => e.currentTarget.blur()}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-muted-foreground/70 tracking-widest pointer-events-none">
                CLP
              </div>
            </div>
          </div>

          <div className="h-px bg-linear-to-r from-border via-border/70 to-transparent -mx-6 my-6" />

          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                <div
                  className={cn(
                    "h-12 w-12 flex shrink-0 items-center justify-center rounded-2xl transition-colors",
                    formData.isSavings
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                      : "bg-muted/50 text-muted-foreground",
                  )}
                >
                  <PiggyBank className="h-6 w-6" />
                </div>

                <Label
                  htmlFor="isSavings-sheet"
                  className="flex-1 cursor-pointer block space-y-0.5"
                >
                  <span className="text-sm font-bold text-foreground/90 block">
                    Cuenta de ahorro
                  </span>
                  {!formData.id ? (
                    <span className="text-xs text-muted-foreground font-medium block">
                      Permite asociar una mascota virtual y fijar metas.
                    </span>
                  ) : (
                    <span className="text-xs text-amber-600/80 dark:text-amber-500/80 font-medium block">
                      El tipo de cuenta no se puede cambiar.
                    </span>
                  )}
                </Label>
              </div>

              {!formData.id ? (
                <Switch
                  id="isSavings-sheet"
                  checked={formData.isSavings}
                  onCheckedChange={(val) => updateForm("isSavings", val)}
                  disabled={isSaving}
                />
              ) : (
                <div className="px-3 py-1 bg-muted/50 rounded-full border border-border">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    {formData.isSavings ? "Sí" : "No"}
                  </span>
                </div>
              )}
            </div>

            {formData.isSavings && (
              <div className="animate-in slide-in-from-top-2 fade-in duration-300">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="saving-goal"
                    className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1 block"
                  >
                    Meta de ahorro
                  </Label>
                  <div className="relative group/input">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 border-r pr-3 border-border">
                      <PiggyBank className="h-4 w-4 text-primary/80" />
                    </div>
                    <Input
                      id="saving-goal"
                      type="text"
                      inputMode="numeric"
                      placeholder="Ej: 500000"
                      className="pl-16 pr-14 h-12 bg-background border border-border focus:border-primary/50 transition-all text-xl font-semibold rounded-xl placeholder:text-muted-foreground/60"
                      value={formatMoneyPreview(formData.savingGoal) ?? ""}
                      onChange={(e) =>
                        updateForm(
                          "savingGoal",
                          sanitizeMoneyInput(e.target.value),
                        )
                      }
                      disabled={isSaving}
                      onWheel={(e) => e.currentTarget.blur()}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-muted-foreground/70 tracking-widest pointer-events-none">
                      CLP
                    </div>
                  </div>
                  {formData.id && (
                    <p className="text-[11px] text-muted-foreground/70 font-medium ml-1">
                      Puedes actualizar tu meta de ahorro en cualquier momento.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="p-4 text-sm font-semibold text-destructive bg-destructive/10 rounded-xl border border-destructive/20">
              {error}
            </div>
          )}
        </div>

        <SheetFooter className="px-6 py-4 border-t border-border bg-muted/10 z-10 text-left">
          <div className="flex flex-col sm:flex-row w-full gap-3 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
              className="w-full sm:w-auto h-12 rounded-xl font-bold border-border"
            >
              Cancelar
            </Button>
            <Button
              onClick={onSave}
              disabled={isSaving || isOfflineStatus}
              className="w-full sm:w-auto h-12 rounded-xl text-base font-bold shadow-md shadow-primary/20 active:scale-95 transition-all"
            >
              {isSaving
                ? "Guardando..."
                : isOfflineStatus
                  ? "Sin conexión"
                  : "Guardar cuenta"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
