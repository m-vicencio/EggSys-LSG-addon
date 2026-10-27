import { AlertCircle, Plus, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import type { AppAccount } from "@/views/core/dashboard/interfaces/dashboard";

interface BudgetNoticeProps {
  isAllAccounts: boolean;
  selectedAccount?: AppAccount;
  showAddForm: boolean;
  canAdd: boolean;
  onAddCategory: () => void;
}

export function BudgetNotice({
  isAllAccounts,
  selectedAccount,
  showAddForm,
  canAdd,
  onAddCategory,
}: BudgetNoticeProps) {
  if (isAllAccounts) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/5 px-5 py-4 text-sm text-blue-600 dark:text-blue-400">
        <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
        <p className="leading-relaxed">
          Vista general agrupada por moneda. Los presupuestos de cada cuenta se
          muestran en su moneda original y no se mezclan entre sí. Para editar o
          agregar categorías, selecciona una cuenta específica arriba.
        </p>
      </div>
    );
  }

  if (!selectedAccount) return null;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl bg-card border border-border p-4 shadow-sm">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20">
          <Wallet className="h-6 w-6" />
        </div>

        <div className="flex-1 min-w-0">
          <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block truncate">
            {selectedAccount.name}
          </Label>
          <p className="text-xl font-semibold truncate">
            {formatCurrency(
              Number(selectedAccount.balance),
              selectedAccount.currency,
            )}
          </p>
        </div>
      </div>

      {!showAddForm && canAdd && (
        <Button
          size="sm"
          variant="outline"
          className="w-full sm:w-auto shrink-0 rounded-xl font-bold bg-background hover:bg-muted/50 transition-all h-10"
          onClick={onAddCategory}
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Agregar categoría
        </Button>
      )}
    </div>
  );
}
