import { prisma } from "@/lib/prisma";
import type { LsgCredentialState } from "@/views/core/lifesync/interfaces/lsg";

// ─── Configuración del addon ──────────────────────────────────────────────────

export function lsgAddonEnabled(): boolean {
  return process.env.LSG_ADDON_ENABLED === "true";
}

function adapterUrl(): string {
  return process.env.LSG_ADAPTER_URL ?? "http://localhost:14142";
}

function adapterHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.LSG_INGEST_SECRET ?? ""}`,
  };
}

// ─── Conexión ─────────────────────────────────────────────────────────────────

export function getConnection(userId: string) {
  return prisma.lsgConnection.findUnique({ where: { userId } });
}

export interface LsgAdapterStatus {
  reachable: boolean;
  needsRelink: boolean;
  credentialConsent: boolean;
  credentialState: LsgCredentialState;
  brokenReason: string | null;
}

/**
 * Estado del vínculo según el adaptador, refrescando el espejo en Prisma.
 *
 * Un adaptador caído se reporta como `reachable: false`, no como "todo bien",
 * para que la UI no muestre "Activo" mientras no se sincroniza nada.
 */
export async function getAdapterStatus(
  userId: string,
): Promise<LsgAdapterStatus> {
  const stale = await prisma.lsgConnection.findUnique({ where: { userId } });
  const fallback: LsgAdapterStatus = {
    reachable: false,
    needsRelink: false,
    credentialConsent: stale?.credentialConsent ?? false,
    credentialState: (stale?.credentialState ?? "NONE") as LsgCredentialState,
    brokenReason: null,
  };

  try {
    const res = await fetch(`${adapterUrl()}/link/${userId}`, {
      headers: adapterHeaders(),
    });
    if (!res.ok) return fallback;
    const body = (await res.json()) as {
      needs_relink?: boolean;
      credential_consent?: boolean;
      credential_state?: string;
      broken_reason?: string | null;
    };

    const status: LsgAdapterStatus = {
      reachable: true,
      needsRelink: body.needs_relink === true,
      credentialConsent: body.credential_consent === true,
      credentialState: (body.credential_state ?? "NONE") as LsgCredentialState,
      brokenReason: body.broken_reason ?? null,
    };

    // Espejo local, para poder pintar la UI cuando el adaptador no conteste.
    await prisma.lsgConnection
      .updateMany({
        where: { userId },
        data: {
          credentialConsent: status.credentialConsent,
          credentialState: status.credentialState,
        },
      })
      .catch(() => {});

    return status;
  } catch {
    return fallback;
  }
}

/**
 * Vincula al usuario con su perfil LSG a través del adaptador.
 *
 * La contraseña se usa para el login inicial. Solo se guarda (cifrada, en el
 * adaptador) si `storeCredential` es true, que es un opt-in explícito del
 * usuario para que la sesión se renueve sola cuando expire.
 */
export async function linkConnection(
  userId: string,
  email: string,
  password: string,
  storeCredential = false,
) {
  const res = await fetch(`${adapterUrl()}/link`, {
    method: "POST",
    headers: adapterHeaders(),
    body: JSON.stringify({
      eggsys_user_id: userId,
      email,
      password,
      store_credential: storeCredential,
    }),
  });
  if (res.status === 401) {
    throw new LsgLinkError("Credenciales LSG inválidas", 401);
  }
  if (res.status === 503) {
    const body = (await res.json().catch(() => null)) as {
      detail?: { code?: string };
    } | null;
    if (body?.detail?.code === "CREDENTIAL_STORAGE_UNAVAILABLE") {
      throw new LsgLinkError(
        "El adaptador no tiene configurado el cifrado de credenciales, así que no puede guardar tu contraseña",
        503,
      );
    }
    if (body?.detail?.code === "TOKEN_STORAGE_UNAVAILABLE") {
      throw new LsgLinkError(
        "El adaptador no tiene configurado el cifrado, así que por ahora no puede vincular perfiles",
        503,
      );
    }
  }
  if (!res.ok) {
    throw new LsgLinkError("El adaptador LSG no está disponible", 503);
  }
  const body = (await res.json()) as {
    id_players: number;
    credential_consent?: boolean;
    credential_state?: string;
  };

  const mirror = {
    credentialConsent: body.credential_consent === true,
    credentialState: (body.credential_state ?? "NONE") as string,
  };

  return prisma.lsgConnection.upsert({
    where: { userId },
    create: {
      userId,
      lsgPlayerId: body.id_players,
      lsgEmail: email,
      ...mirror,
    },
    update: {
      lsgPlayerId: body.id_players,
      lsgEmail: email,
      enabled: true,
      ...mirror,
    },
  });
}

/** Deja de guardar la contraseña sin desvincular ni perder la sesión actual. */
export async function revokeCredential(userId: string) {
  const res = await fetch(`${adapterUrl()}/link/${userId}/credential`, {
    method: "DELETE",
    headers: adapterHeaders(),
  });
  if (!res.ok && res.status !== 404) {
    throw new LsgLinkError("El adaptador LSG no está disponible", 503);
  }
  await prisma.lsgConnection.updateMany({
    where: { userId },
    data: { credentialConsent: false, credentialState: "NONE" },
  });
}

export class LsgLinkError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Desvincula: borra en el adaptador el token y la contraseña guardada, y
 * después el vínculo local. El historial en el adaptador se conserva para el
 * estudio.
 *
 * Si el adaptador no confirma, lanza y deja el vínculo local intacto: ignorar
 * el fallo dejaría la fila del adaptador huérfana, con su job renovando el
 * token cada 5 minutos para un usuario que ya no existe.
 */
export async function unlinkConnection(userId: string) {
  const res = await fetch(`${adapterUrl()}/link/${userId}`, {
    method: "DELETE",
    headers: adapterHeaders(),
  }).catch(() => null);
  if (!res?.ok && res?.status !== 404) {
    throw new LsgLinkError("El adaptador LSG no está disponible", 503);
  }
  await prisma.lsgConnection.deleteMany({ where: { userId } });
}

// ─── Configuración de eventos por usuario ─────────────────────────────────────

export async function updateConfig(
  userId: string,
  data: { enabled?: boolean; disabledEvents?: string[] },
) {
  return prisma.lsgConnection.update({ where: { userId }, data });
}

// ─── Outbox ───────────────────────────────────────────────────────────────────

export function getEvents(userId: string, limit = 50) {
  return prisma.lsgEventOutbox.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 200),
  });
}

/**
 * Envía al adaptador los eventos PENDING/ERROR del usuario y refleja el
 * resultado (SYNCED/REJECTED/DUPLICATE/ERROR) en el outbox local.
 */
export async function flushOutbox(userId: string): Promise<void> {
  const pending = await prisma.lsgEventOutbox.findMany({
    where: {
      userId,
      status: { in: ["PENDING", "ERROR"] },
      attempts: { lt: 5 },
    },
    take: 100,
  });
  if (pending.length === 0) return;

  const res = await fetch(`${adapterUrl()}/events`, {
    method: "POST",
    headers: adapterHeaders(),
    body: JSON.stringify({
      events: pending.map((e) => ({
        client_ref: e.clientRef,
        eggsys_user_id: e.userId,
        event_type: e.eventType,
        period_key: e.periodKey,
        occurred_at: e.occurredAt.toISOString(),
        payload: e.payload,
      })),
    }),
  });
  if (!res.ok && res.status !== 207) {
    await prisma.lsgEventOutbox.updateMany({
      where: { id: { in: pending.map((e) => e.id) } },
      data: { status: "ERROR", lastError: `adapter_http_${res.status}` },
    });
    return;
  }

  const body = (await res.json()) as {
    results: {
      client_ref: string;
      status: string;
      reason?: string;
      awarded_points?: number;
      dimension?: string | null;
    }[];
  };
  for (const result of body.results) {
    // Una sesión LSG expirada no es culpa del evento: gastar intentos por ella
    // agota el presupuesto de 5 y lo deja fuera del filtro para siempre, aunque
    // luego la sesión se recupere sola.
    const notTheEventsFault =
      result.reason === "user_token_expired_relink_required" ||
      result.reason === "connection_broken";

    await prisma.lsgEventOutbox.updateMany({
      where: { clientRef: result.client_ref },
      data: {
        status: result.status,
        lastError: result.reason ?? null,
        points: result.awarded_points ?? null,
        dimension: result.dimension ?? null,
        ...(notTheEventsFault ? {} : { attempts: { increment: 1 } }),
      },
    });
  }
  await prisma.lsgConnection.updateMany({
    where: { userId },
    data: { lastSyncAt: new Date() },
  });
}
