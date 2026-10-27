"use client";

import { Loader2, Plus } from "lucide-react";
import { useState } from "react";
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
import { getCategoryMeta } from "@/lib/categories";
import { formatMoneyPreview, sanitizeMoneyInput } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import type { Category } from "@/views/core/dashboard/interfaces/dashboard";

interface AddCategoryFormProps {
  availableCategories: Category[];
  accountId: string;
  onSave: (
    categoryId: string,
    amount: number,
    name: string,
    accountId: string,
  ) => void;
  isSaving: boolean;
  onCancel: () => void;
}

export function AddCategoryForm({
  availableCategories,
  accountId,
  onSave,
  isSaving,
}: AddCategoryFormProps) {
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const isOnline = useAppStore((state) => state.isOnline);

  const selectedCategory = availableCategories.find((c) => c.id === categoryId);
  const canSave = !!categoryId && Number(amount) > 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-2.5">
        <Label className="text-sm font-medium text-muted-foreground/80 tracking-normal">
          Categoría
        </Label>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger className="h-11 rounded-xl">
            <SelectValue placeholder="Selecciona una categoría..." />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-border/50">
            {availableCategories.map((cat) => {
              const meta = getCategoryMeta(cat);
              const Icon = meta.icon;

              return (
                <SelectItem key={cat.id} value={cat.id} className="rounded-lg">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-md"
                      style={{ backgroundColor: `${meta.color}26` }}
                    >
                      <Icon className="h-4 w-4" style={{ color: meta.color }} />
                    </div>
                    <span className="font-medium text-foreground">
                      {cat.name}
                    </span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2.5">
        <Label className="text-sm font-medium text-muted-foreground/80 tracking-normal">
          Meta mensual
        </Label>
        <div
          className={cn(
            "relative rounded-xl border-[1.5px] overflow-hidden transition-all bg-background",
            "border-border/50 focus-within:border-primary focus-within:shadow-[0_0_0_3px_var(--primary-shadow)]",
          )}
        >
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm pointer-events-none select-none">
            $
          </span>
          <Input
            type="text"
            inputMode="numeric"
            value={formatMoneyPreview(amount) ?? ""}
            onChange={(e) => setAmount(sanitizeMoneyInput(e.target.value))}
            className="pl-8 h-11 font-medium border-none bg-transparent shadow-none focus-visible:ring-0 text-foreground placeholder:text-muted-foreground/50"
            placeholder="0"
            onWheel={(e) => e.currentTarget.blur()}
          />
        </div>
      </div>

      <Button
        className="w-full h-11 rounded-xl"
        disabled={!canSave || isSaving || !isOnline}
        onClick={() =>
          onSave(
            categoryId,
            Number(amount),
            selectedCategory?.name ?? "",
            accountId,
          )
        }
      >
        {isSaving ? (
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
        ) : (
          <Plus className="h-5 w-5 mr-2" />
        )}
        {!isOnline ? "Sin conexión" : "Agregar"}
      </Button>
    </div>
  );
}
