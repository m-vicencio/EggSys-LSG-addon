import type {
  LsgConnectionState,
  LsgEvent,
} from "@/views/core/lifesync/interfaces/lsg";

async function handleResponse<T>(
  res: Response | Promise<Response>,
): Promise<T> {
  const response = await res;
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.message ?? `Error ${response.status}`);
  }
  return response.json();
}

export const lsgApi = {
  /** Estado del vínculo con LifeSync-Games */
  getConnection: async (): Promise<LsgConnectionState> => {
    const json = await handleResponse<{ data: LsgConnectionState }>(
      await fetch("/api/lsg/connection"),
    );
    return json.data;
  },

  /**
   * Vincula el perfil LSG. La contraseña solo se guarda (cifrada, en el
   * adaptador) si `storeCredential` es true.
   */
  link: (data: {
    email: string;
    password: string;
    storeCredential?: boolean;
  }) =>
    handleResponse<{ lsgPlayerId: number; lsgEmail: string }>(
      fetch("/api/lsg/connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    ),

  /** Desvincula el perfil LSG */
  unlink: () =>
    handleResponse(fetch("/api/lsg/connection", { method: "DELETE" })),

  /** Deja de guardar la contraseña, sin desvincular */
  revokeCredential: () =>
    handleResponse(
      fetch("/api/lsg/connection/credential", { method: "DELETE" }),
    ),

  /** Historial del outbox con estado de sincronización */
  getEvents: async (limit = 50): Promise<LsgEvent[]> => {
    const json = await handleResponse<{ data: LsgEvent[] }>(
      await fetch(`/api/lsg/events?limit=${limit}`),
    );
    return json?.data ?? [];
  },

  /** Actualiza toggles por tipo de evento y el kill switch */
  updateConfig: (data: { enabled?: boolean; disabledEvents?: string[] }) =>
    handleResponse<{ data: { enabled: boolean; disabledEvents: string[] } }>(
      fetch("/api/lsg/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    ),
};
