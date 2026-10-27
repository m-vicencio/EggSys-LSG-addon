import { useQuery } from "@tanstack/react-query";
import { categoriesApi } from "@/lib/api";
import type { Category } from "@/views/core/dashboard/interfaces/dashboard";

/**
 * Hook para obtener todas las categorías del sistema.
 * Usa caché de React Query con queryKey "categories".
 */
export function useCategories(options?: { enabled?: boolean }) {
  const {
    data: categories = [],
    isLoading,
    isError,
  } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: categoriesApi.getAll,
    ...options,
  });

  return { categories, isLoading, isError };
}
