import { Badge } from "@/components/ui/badge";
import type { LsgEventStatus } from "@/views/core/lifesync/interfaces/lsg";

const STATUS_STYLES: Record<
  LsgEventStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: "Pendiente",
    className: "bg-amber-500/15 text-amber-600 border-amber-500/40",
  },
  SENT: {
    label: "Enviado",
    className: "bg-sky-500/15 text-sky-600 border-sky-500/40",
  },
  SYNCED: {
    label: "Sincronizado",
    className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/40",
  },
  REJECTED: {
    label: "Rechazado",
    className: "bg-rose-500/15 text-rose-600 border-rose-500/40",
  },
  DUPLICATE: {
    label: "Duplicado",
    className: "bg-muted text-muted-foreground border-border",
  },
  ERROR: {
    label: "Error",
    className: "bg-rose-500/15 text-rose-600 border-rose-500/40",
  },
};

export function SyncStatusBadge({ status }: { status: LsgEventStatus }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.PENDING;
  return (
    <Badge variant="outline" className={style.className}>
      {style.label}
    </Badge>
  );
}
