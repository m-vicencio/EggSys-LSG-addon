import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { type PetData, petsApi } from "@/lib/api";
import type { AppAccount } from "@/views/core/dashboard/interfaces/dashboard";

export function usePet(account: AppAccount | null) {
  const isSavings = !!account?.isSavings;

  const {
    data: pet,
    isLoading,
    isError,
  } = useQuery<PetData>({
    queryKey: ["pet", account?.id],
    queryFn: () => petsApi.getByAccount(account?.id ?? ""),
    enabled: isSavings && !!account?.id,
  });

  useEffect(() => {
    if (isError) {
      toast.error("Error al cargar tu mascota", {
        description:
          "No pudimos obtener los datos de la mascota asociada a tu cuenta de ahorro.",
      });
    }
  }, [isError]);

  return { pet, isLoading, isError };
}
