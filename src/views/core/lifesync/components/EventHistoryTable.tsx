"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useLsgConnection,
  useLsgEvents,
} from "@/views/core/lifesync/hooks/useLsgConnection";
import {
  LSG_DIMENSION_LABELS,
  LSG_EVENT_TYPES,
} from "@/views/core/lifesync/interfaces/lsg";
import { SyncStatusBadge } from "./SyncStatusBadge";

export function EventHistoryTable() {
  const { connection } = useLsgConnection();
  const { data: events, isLoading } = useLsgEvents(Boolean(connection));

  if (!connection) {
    return (
      <p className="text-sm text-muted-foreground">
        Vincula tu perfil para ver el historial de eventos.
      </p>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Eventos enviados</CardTitle>
        <CardDescription>
          Cada conducta detectada y su estado de sincronización con
          LifeSync-Games. Esto es exactamente lo que se envió.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : !events || events.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aún no hay eventos. Registra tus movimientos con constancia y
            aparecerán aquí.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Conducta</TableHead>
                  <TableHead>Periodo</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Puntos</TableHead>
                  <TableHead>Dimensión</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">
                      {LSG_EVENT_TYPES[event.eventType] ?? event.eventType}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {event.periodKey}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(event.occurredAt).toLocaleDateString("es-CL")}
                    </TableCell>
                    <TableCell>
                      <SyncStatusBadge status={event.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {event.points ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {event.dimension
                        ? (LSG_DIMENSION_LABELS[event.dimension] ??
                          event.dimension)
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
