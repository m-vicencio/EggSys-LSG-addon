import {
  CircleDollarSign,
  Landmark,
  PiggyBank,
  PlusCircle,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatCLP, sanitizeCLP } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AccountDraft } from "@/views/core/dashboard/interfaces/dashboard";

interface AccountsStepProps {
  accounts: AccountDraft[];
  error: string | null;
  saving: boolean;
  onAddAccount: () => void;
  onRemoveAccount: (index: number) => void;
  onUpdateAccount: (
    index: number,
    field: keyof AccountDraft,
    value: string | boolean,
  ) => void;
  onSetSuggestion?: (index: number, name: string) => void;
  onSave: () => void;
}

export function AccountsStep({
  accounts,
  saving,
  onAddAccount,
  onRemoveAccount,
  onUpdateAccount,
  onSave,
}: AccountsStepProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-3 flex flex-col items-center text-center">
        <h2 className="text-3xl font-extrabold tracking-tight bg-linear-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
          Configura tus finanzas
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
          Añade cuentas bancarias y de ahorro.
          <br />
          No te preocupes, podrás agregar más después.
        </p>
      </div>

      <div className="grid gap-6">
        {accounts.map((acc, i) => (
          <Card
            key={acc.uid ?? i}
            className="group overflow-hidden border-border bg-card shadow-md transition-all hover:shadow-xl hover:border-primary/40"
          >
            <CardHeader className="flex flex-row items-end justify-between space-y-0 pb-4 pt-6">
              <div className="flex items-end gap-4 w-full px-2">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 transition-transform group-hover:scale-105">
                  <Landmark className="h-6 w-6" />
                </div>

                <div className="flex-1 space-y-1.5">
                  <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1 block">
                    Cuenta {i + 1}
                  </Label>
                  <Input
                    className="h-12 px-4 bg-background border border-border focus:border-primary/50 transition-all text-base font-semibold rounded-xl placeholder:text-muted-foreground/60 w-full"
                    placeholder="Ej: Mi cuenta principal"
                    value={acc.name ?? ""}
                    onChange={(e) => onUpdateAccount(i, "name", e.target.value)}
                  />
                </div>
              </div>

              {accounts.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full -mr-2 mb-1 text-muted-foreground/70 hover:bg-destructive/10 hover:text-destructive transition-colors"
                  onClick={() => onRemoveAccount(i)}
                  disabled={saving}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </CardHeader>

            <CardContent className="p-6 pt-0 space-y-6">
              <div className="h-px bg-linear-to-r from-border via-border/70 to-transparent -mx-6" />

              <div className="space-y-2.5">
                <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1 block">
                  Saldo actual
                </Label>
                <div className="relative group/input">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 border-r pr-3 border-border">
                    <CircleDollarSign className="h-4 w-4 text-primary/80" />
                  </div>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    className="pl-16 pr-14 h-13 bg-background border border-border focus:border-primary/50 transition-all text-xl font-semibold rounded-xl placeholder:text-muted-foreground/60"
                    value={formatCLP(acc.balance ?? "")}
                    onChange={(e) => {
                      onUpdateAccount(
                        i,
                        "balance",
                        sanitizeCLP(e.target.value),
                      );
                      if (acc.currency !== "CLP") {
                        onUpdateAccount(i, "currency", "CLP");
                      }
                    }}
                    disabled={saving}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-muted-foreground/70 tracking-widest pointer-events-none">
                    CLP
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        "h-12 w-12 flex shrink-0 items-center justify-center rounded-2xl transition-colors",
                        acc.isSavings
                          ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                          : "bg-muted/50 text-muted-foreground",
                      )}
                    >
                      <PiggyBank className="h-6 w-6" />
                    </div>
                    <div>
                      <Label
                        htmlFor={`isSavings-${i}`}
                        className="text-sm font-bold text-foreground/90 cursor-pointer block"
                      >
                        ¿Es una cuenta de ahorro?
                      </Label>
                      <p className="text-xs text-muted-foreground font-medium mt-0.5">
                        Los saldos se gestionan por separado
                      </p>
                    </div>
                  </div>
                  <Switch
                    id={`isSavings-${i}`}
                    checked={!!acc.isSavings}
                    onCheckedChange={(val) =>
                      onUpdateAccount(i, "isSavings", val)
                    }
                    disabled={saving}
                  />
                </div>

                {acc.isSavings && (
                  <div className="animate-in slide-in-from-top-2 fade-in duration-300">
                    <div className="space-y-2.5">
                      <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1 block">
                        Meta de ahorro
                      </Label>
                      <div className="relative group/input">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 border-r pr-3 border-border">
                          <PiggyBank className="h-4 w-4 text-primary/80" />
                        </div>
                        <Input
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          className="pl-16 pr-14 h-13 bg-background border border-border focus:border-primary/50 transition-all text-xl font-semibold rounded-xl placeholder:text-muted-foreground/60"
                          value={formatCLP(acc.savingGoal ?? "")}
                          onChange={(e) =>
                            onUpdateAccount(
                              i,
                              "savingGoal",
                              sanitizeCLP(e.target.value),
                            )
                          }
                          disabled={saving}
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-muted-foreground/70 tracking-widest pointer-events-none">
                          CLP
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-3 pt-6">
        <Button
          variant="outline"
          className="w-full h-15 border-dashed border-2 border-border bg-background hover:bg-muted/50 text-muted-foreground font-bold rounded-2xl transition-all"
          onClick={onAddAccount}
          disabled={saving}
        >
          <PlusCircle className="mr-2 h-5 w-5" />
          Añadir otra cuenta
        </Button>

        <Button
          size="lg"
          className="w-full h-15 text-lg font-black shadow-xl shadow-primary/20 rounded-2xl active:scale-95 transition-all"
          onClick={onSave}
          disabled={saving}
        >
          {saving ? "Configurando..." : "Finalizar configuración"}
        </Button>
      </div>
    </div>
  );
}
