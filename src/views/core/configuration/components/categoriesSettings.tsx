"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Landmark, Pencil, PlusCircle, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useCategories } from "@/hooks/useCategories";
import { categoriesApi } from "@/lib/api";
import { getCategoryMeta } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import type { Category } from "@/views/core/dashboard/interfaces/dashboard";
import { type CategoryDraft, CategoryFormSheet } from "./categoryFormSheet";

// --- COMPONENTE CARD ---
function CategoryCard({
  category,
  onEdit,
  onToggle,
  onDelete,
  isOnline,
  isToggling,
}: {
  category: Category;
  onEdit: () => void;
  onToggle: (isActive: boolean) => void;
  onDelete: () => void;
  isOnline: boolean;
  isToggling: boolean;
}) {
  const meta = getCategoryMeta(category);
  const Icon = meta.icon;
  const isActive = category.isActive ?? true;
  const isDefault = category.isDefault ?? false;

  return (
    <div
      className={cn(
        "group relative flex items-center justify-between gap-3 sm:gap-4 rounded-3xl sm:rounded-4xl border-[1.5px] p-3 sm:p-4 transition-all duration-200",
        isActive
          ? "bg-card border-border hover:border-primary/40 hover:shadow-sm"
          : "bg-muted/30 border-dashed border-border opacity-100",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
        <div
          className={cn(
            "flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl transition-colors",
            isActive ? "shadow-sm" : "grayscale",
          )}
          style={{ backgroundColor: `${meta.color}22`, color: meta.color }}
        >
          <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>

        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3
              className={cn(
                "truncate font-semibold text-sm sm:text-base transition-colors",
                isActive ? "text-foreground" : "text-muted-foreground",
              )}
              title={category.name}
            >
              {category.name}
            </h3>
            {isDefault && (
              <Badge
                variant="secondary"
                className="hidden sm:inline-flex px-1.5 py-0 text-[9px] h-4 uppercase bg-muted text-muted-foreground shrink-0"
              >
                Por defecto
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {category.type === "INCOME" ? "Ingreso" : "Gasto"}
            </p>
            {isDefault && (
              <Badge
                variant="secondary"
                className="sm:hidden px-1.5 py-0 text-[8px] h-3.5 uppercase bg-muted text-muted-foreground shrink-0"
              >
                Por defecto
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100 transition-opacity md:mr-2">
          <Button
            variant="secondary"
            size="icon"
            className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
            onClick={onEdit}
            disabled={!isOnline}
            title="Editar"
          >
            <Pencil className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>

          {!isDefault && (
            <ConfirmDialog
              trigger={
                <Button
                  variant="destructive"
                  size="icon"
                  className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-muted text-red-600 border border-muted hover:bg-red-600 hover:text-white hover:border-red-700"
                  disabled={!isOnline}
                  title="Eliminar"
                >
                  <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              }
              title="Eliminar categoría"
              description={`¿Eliminar "${category.name}"? Esta acción no se puede deshacer.`}
              confirmText="Eliminar"
              cancelText="Cancelar"
              confirmVariant="destructive"
              onConfirm={onDelete}
            />
          )}
        </div>

        <div className="pl-2 sm:pl-3 border-l border-border/50 shrink-0">
          <Switch
            checked={isActive}
            onCheckedChange={onToggle}
            disabled={!isOnline || isToggling}
            title={isActive ? "Desactivar" : "Activar"}
            className="scale-90 sm:scale-100"
          />
        </div>
      </div>
    </div>
  );
}

// --- COMPONENTE PRINCIPAL ---
export function CategoriesSettings() {
  const [isMounted, setIsMounted] = useState(false);
  const queryClient = useQueryClient();
  const isOnline = useAppStore((state) => state.isOnline);
  const { categories, isLoading } = useCategories();

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isOfflineStatus = isMounted && !isOnline;
  const isReady = isMounted && !isLoading;

  // --- MUTATIONS RESTAURADAS ---
  const createMutation = useMutation({
    mutationFn: (payload: CategoryDraft) =>
      categoriesApi.create({ ...payload, name: payload.name.trim() }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Categoría creada");
      setIsSheetOpen(false);
    },
    onError: (error) =>
      toast.error("Error al crear", { description: error.message }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CategoryDraft }) =>
      categoriesApi.update(id, { ...payload, name: payload.name.trim() }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Categoría actualizada");
      setIsSheetOpen(false);
    },
    onError: (error) =>
      toast.error("Error al actualizar", { description: error.message }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      categoriesApi.update(id, { isActive }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (error) =>
      toast.error("Error al cambiar estado", { description: error.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoriesApi.delete(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Categoría eliminada");
    },
    onError: (error) =>
      toast.error("Error al eliminar", { description: error.message }),
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const stats = useMemo(() => {
    const active = categories.filter((c) => c.isActive ?? true).length;
    const defaults = categories.filter((c) => c.isDefault).length;
    const custom = categories.length - defaults;
    return { active, defaults, custom };
  }, [categories]);

  const handleOpenCreate = () => {
    setCategoryToEdit(null);
    setIsSheetOpen(true);
  };

  const handleOpenEdit = (category: Category) => {
    setCategoryToEdit(category);
    setIsSheetOpen(true);
  };

  const handleSheetSubmit = (draft: CategoryDraft) => {
    if (categoryToEdit) {
      updateMutation.mutate({ id: categoryToEdit.id, payload: draft });
    } else {
      createMutation.mutate(draft);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-5xl mx-auto">
      {/* HEADER & STATS */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6">
        <div className="space-y-4 w-full sm:w-auto">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              Categorías
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Personaliza cómo clasificas tus ingresos y gastos.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:flex sm:gap-3 w-full">
            <div className="rounded-xl border border-border/60 bg-card px-2 sm:px-4 py-2 flex flex-col items-center w-full sm:min-w-24 shadow-xs">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Total
              </span>
              <span className="text-lg sm:text-xl font-black">
                {isReady ? categories.length : "-"}
              </span>
            </div>
            <div className="rounded-xl border border-border/60 bg-card px-2 sm:px-4 py-2 flex flex-col items-center w-full sm:min-w-24 shadow-xs">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Activas
              </span>
              <span className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-500">
                {isReady ? stats.active : "-"}
              </span>
            </div>
            <div className="rounded-xl border border-border/60 bg-card px-2 sm:px-4 py-2 flex flex-col items-center w-full sm:min-w-24 shadow-xs">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Propias
              </span>
              <span className="text-lg sm:text-xl font-black text-primary">
                {isReady ? stats.custom : "-"}
              </span>
            </div>
          </div>
        </div>

        <Button
          onClick={handleOpenCreate}
          disabled={isOfflineStatus}
          className="w-full sm:w-auto h-11 px-6 rounded-xl shadow-sm shrink-0 mt-2 sm:mt-0"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          {isOfflineStatus ? "Sin conexión" : "Crear categoría"}
        </Button>
      </div>

      {/* CATEGORIES LIST */}
      <div className="w-full mt-4 sm:mt-8">
        {!isReady ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-20 sm:h-22 animate-pulse rounded-3xl sm:rounded-4xl bg-muted/50"
              />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center px-4">
            <div className="p-3 sm:p-4 bg-primary/10 text-primary rounded-full mb-4">
              <Landmark className="h-6 w-6 sm:h-8 sm:w-8" />
            </div>
            <p className="text-base sm:text-lg font-semibold text-foreground">
              No hay categorías todavía
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-sm">
              Crea tu primera categoría para empezar a organizar tus
              transacciones.
            </p>
            <Button
              onClick={handleOpenCreate}
              disabled={isOfflineStatus}
              className="mt-6 rounded-xl w-full sm:w-auto"
            >
              Crear mi primera categoría
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {categories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                isOnline={!isOfflineStatus}
                isToggling={
                  toggleMutation.isPending &&
                  toggleMutation.variables?.id === category.id
                }
                onEdit={() => handleOpenEdit(category)}
                onDelete={() => deleteMutation.mutate(category.id)}
                onToggle={(isActive) =>
                  toggleMutation.mutate({ id: category.id, isActive })
                }
              />
            ))}
          </div>
        )}
      </div>

      <CategoryFormSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        initialCategory={categoryToEdit}
        onSubmit={handleSheetSubmit}
        isSaving={isSaving}
        isOffline={isOfflineStatus}
      />
    </div>
  );
}
