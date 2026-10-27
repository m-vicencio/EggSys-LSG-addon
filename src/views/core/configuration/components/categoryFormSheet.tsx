import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
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
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { CATEGORY_ICON_OPTIONS, getCategoryMeta } from "@/lib/categories";
import { cn } from "@/lib/utils";
import type { Category } from "@/views/core/dashboard/interfaces/dashboard";

// --- TIPOS Y CONSTANTES ---
export type CategoryType = "INCOME" | "EXPENSE";

export type CategoryDraft = {
  name: string;
  type: CategoryType;
  iconName: string;
  color: string;
  isActive: boolean;
};

const DEFAULT_DRAFT: CategoryDraft = {
  name: "",
  type: "EXPENSE",
  iconName: "HelpCircleIcon",
  color: "#3b82f6",
  isActive: true,
};

const TYPE_OPTIONS: Array<{ value: CategoryType; label: string }> = [
  { value: "EXPENSE", label: "Gasto" },
  { value: "INCOME", label: "Ingreso" },
];

export function toDraft(category: Category): CategoryDraft {
  return {
    name: category.name,
    type: category.type,
    iconName: category.iconName ?? "HelpCircleIcon",
    color: category.color ?? "#64748b",
    isActive: category.isActive ?? true,
  };
}

// --- COMPONENTE SHEET ---
interface CategoryFormSheetProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategory: Category | null;
  onSubmit: (draft: CategoryDraft) => void;
  isSaving: boolean;
  isOffline: boolean;
}

export function CategoryFormSheet({
  isOpen,
  onClose,
  initialCategory,
  onSubmit,
  isSaving,
  isOffline,
}: CategoryFormSheetProps) {
  const [draft, setDraft] = useState<CategoryDraft>(DEFAULT_DRAFT);

  // Sincronizar el estado interno cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setDraft(initialCategory ? toDraft(initialCategory) : DEFAULT_DRAFT);
    }
  }, [isOpen, initialCategory]);

  const updateDraft = (field: keyof CategoryDraft, value: any) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const isEditing = !!initialCategory;
  const canSubmit = draft.name.trim().length > 0 && !isSaving && !isOffline;

  const selectedMeta = getCategoryMeta({
    name: draft.name || "Preview",
    iconName: draft.iconName,
    color: draft.color,
  });
  const SelectedIcon = selectedMeta.icon;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="flex flex-col w-full sm:max-w-md p-0 border-l"
      >
        <SheetHeader className="px-6 py-5 border-b bg-background z-10">
          <SheetTitle>
            {isEditing ? "Editar categoría" : "Nueva categoría"}
          </SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Actualiza el icono, color o nombre de tu categoría."
              : "Añade una nueva clasificación para tus movimientos."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
          {/* Preview Card */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/30 border border-border/50">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-sm transition-colors"
              style={{
                backgroundColor: `${draft.color}22`,
                color: draft.color,
              }}
            >
              <SelectedIcon className="h-7 w-7" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
                Vista previa
              </span>
              <span className="font-semibold text-lg leading-none">
                {draft.name || "Nombre de categoría"}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={draft.name}
                onChange={(e) => updateDraft("name", e.target.value)}
                placeholder="Ej. Supermercado"
                className="h-11 rounded-xl"
                disabled={isSaving}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={draft.type}
                  onValueChange={(v) => updateDraft("type", v)}
                  disabled={isSaving}
                >
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex items-center gap-2 rounded-xl border bg-background px-2 h-11 focus-within:ring-2 ring-primary/50 transition-all">
                  <input
                    type="color"
                    value={draft.color}
                    onChange={(e) => updateDraft("color", e.target.value)}
                    className="h-7 w-8 cursor-pointer rounded-md border-none bg-transparent p-0"
                    disabled={isSaving}
                  />
                  <Input
                    value={draft.color}
                    onChange={(e) => updateDraft("color", e.target.value)}
                    className="h-8 border-0 px-1 shadow-none focus-visible:ring-0 uppercase font-mono text-xs"
                    disabled={isSaving}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Icono</Label>
              <span className="text-[10px] uppercase font-bold text-muted-foreground">
                {CATEGORY_ICON_OPTIONS.length} disponibles
              </span>
            </div>
            <div className="grid max-h-55 grid-cols-4 sm:grid-cols-5 gap-2 overflow-y-auto pr-2 pb-2 styled-scrollbar">
              {CATEGORY_ICON_OPTIONS.map((option) => {
                const IconOpt = option.icon;
                const isSelected = draft.iconName === option.name;
                return (
                  <button
                    key={option.name}
                    type="button"
                    onClick={() => updateDraft("iconName", option.name)}
                    disabled={isSaving}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1.5 rounded-xl border p-2 transition-all hover:bg-muted/50",
                      isSelected
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border/50 bg-background",
                    )}
                  >
                    <IconOpt
                      className={cn(
                        "h-5 w-5",
                        isSelected ? "text-primary" : "text-muted-foreground",
                      )}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/60 p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Categoría activa</Label>
              <p className="text-xs text-muted-foreground">
                Si la desactivas, no podrás usarla en nuevas transacciones.
              </p>
            </div>
            <Switch
              checked={draft.isActive}
              onCheckedChange={(v) => updateDraft("isActive", v)}
              disabled={isSaving}
            />
          </div>
        </div>

        <SheetFooter className="px-6 py-4 border-t bg-muted/10 z-10">
          <div className="flex flex-col sm:flex-row w-full gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
              className="w-full sm:w-auto rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => onSubmit(draft)}
              disabled={!canSubmit}
              className="w-full sm:w-auto rounded-xl"
            >
              {isSaving
                ? "Guardando..."
                : isOffline
                  ? "Sin conexión"
                  : isEditing
                    ? "Guardar cambios"
                    : "Crear categoría"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
