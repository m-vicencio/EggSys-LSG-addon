/** Estado de la credencial guardada en el adaptador para reconectar solo. */
export type LsgCredentialState = "NONE" | "ACTIVE" | "INVALID" | "UNREADABLE";

export interface LsgConnectionInfo {
  lsgPlayerId: number;
  lsgEmail: string;
  enabled: boolean;
  disabledEvents: string[];
  linkedAt: string;
  lastSyncAt: string | null;
  /** Token muerto y sin forma de recuperarse solo: hay que pedir la contraseña. */
  needsRelink: boolean;
  /** false si el adaptador no respondió: el resto del estado puede estar viejo. */
  adapterReachable: boolean;
  credentialConsent: boolean;
  credentialState: LsgCredentialState;
  /** Rotura del lado LSG (p. ej. player_not_found), distinta del kill switch. */
  brokenReason: string | null;
}

export interface LsgConnectionState {
  addonEnabled: boolean;
  connection: LsgConnectionInfo | null;
}

export type LsgEventStatus =
  | "PENDING"
  | "SENT"
  | "SYNCED"
  | "REJECTED"
  | "DUPLICATE"
  | "ERROR";

export interface LsgEvent {
  id: string;
  eventType: string;
  periodKey: string;
  clientRef: string;
  status: LsgEventStatus;
  lastError: string | null;
  points: number | null;
  dimension: string | null;
  occurredAt: string;
  createdAt: string;
}

/** Nombres de dimension devueltos por el adaptador (ver rules.dimension_name) */
export const LSG_DIMENSION_LABELS: Record<string, string> = {
  cognitivo: "Cognitivo",
  afectivo: "Afectivo",
  linguistico: "Lingüístico",
};

/** Tipos de evento v1 con su descripción para la UI */
export const LSG_EVENT_TYPES: Record<string, string> = {
  "streak.daily_logging": "Racha de registro (≥5 días por semana)",
  "budget.month_met": "Presupuesto mensual cumplido",
  "savings.milestone": "Hito de meta de ahorro (25/50/75/100 %)",
  "tx.descriptive_entry": "Registro descriptivo (etiquetas y comentario)",
};
