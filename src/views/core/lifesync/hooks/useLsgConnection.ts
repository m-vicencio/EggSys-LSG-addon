import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { lsgApi } from "@/lib/api";
import {
  LSG_DIMENSION_LABELS,
  LSG_EVENT_TYPES,
  type LsgConnectionState,
} from "@/views/core/lifesync/interfaces/lsg";

export function useLsgConnection() {
  const { status } = useSession();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<LsgConnectionState>({
    queryKey: ["lsg-connection"],
    queryFn: lsgApi.getConnection,
    enabled: status === "authenticated",
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["lsg-connection"] });
    queryClient.invalidateQueries({ queryKey: ["lsg-events"] });
  };

  const linkMutation = useMutation({
    mutationFn: lsgApi.link,
    onSuccess: (result) => {
      toast.success("Perfil LifeSync vinculado", {
        description: `Jugador #${result.lsgPlayerId} (${result.lsgEmail})`,
      });
      invalidate();
    },
    onError: (error: Error) => {
      toast.error("No se pudo vincular", { description: error.message });
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: lsgApi.unlink,
    onSuccess: () => {
      toast.success("Perfil LifeSync desvinculado");
      invalidate();
    },
    onError: (error: Error) => {
      toast.error("No se pudo desvincular", { description: error.message });
    },
  });

  const revokeCredentialMutation = useMutation({
    mutationFn: lsgApi.revokeCredential,
    onSuccess: () => {
      toast.success("Ya no guardamos tu contraseña", {
        description:
          "Tu sesión actual sigue activa; cuando expire tendrás que vincular de nuevo.",
      });
      invalidate();
    },
    onError: (error: Error) => {
      toast.error("No se pudo revocar", { description: error.message });
    },
  });

  const configMutation = useMutation({
    mutationFn: lsgApi.updateConfig,
    onSuccess: () => {
      toast.success("Configuración guardada");
      invalidate();
    },
    onError: (error: Error) => {
      toast.error("No se pudo guardar", { description: error.message });
    },
  });

  return {
    addonEnabled: data?.addonEnabled ?? false,
    connection: data?.connection ?? null,
    isLoading: isLoading || status === "loading",
    link: linkMutation.mutate,
    isLinking: linkMutation.isPending,
    unlink: unlinkMutation.mutate,
    isUnlinking: unlinkMutation.isPending,
    revokeCredential: revokeCredentialMutation.mutate,
    isRevoking: revokeCredentialMutation.isPending,
    updateConfig: configMutation.mutate,
    isSavingConfig: configMutation.isPending,
  };
}

export function useLsgEvents(enabled: boolean) {
  const query = useQuery({
    queryKey: ["lsg-events"],
    queryFn: () => lsgApi.getEvents(50),
    enabled,
    refetchInterval: 30_000,
  });

  // Avisa por toast solo los eventos que pasan a SYNCED después del primer
  // fetch; el historial que ya estaba sincronizado al montar no notifica.
  const seenSynced = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!query.data) return;
    if (seenSynced.current === null) {
      seenSynced.current = new Set(
        query.data.filter((e) => e.status === "SYNCED").map((e) => e.id),
      );
      return;
    }
    for (const event of query.data) {
      if (event.status !== "SYNCED" || seenSynced.current.has(event.id))
        continue;
      seenSynced.current.add(event.id);
      const dimensionLabel = event.dimension
        ? (LSG_DIMENSION_LABELS[event.dimension] ?? event.dimension)
        : null;
      toast.success(LSG_EVENT_TYPES[event.eventType] ?? event.eventType, {
        description:
          event.points && dimensionLabel
            ? `+${event.points} pts · ${dimensionLabel}`
            : "Evento sincronizado con LifeSync-Games",
      });
    }
  }, [query.data]);

  return query;
}
