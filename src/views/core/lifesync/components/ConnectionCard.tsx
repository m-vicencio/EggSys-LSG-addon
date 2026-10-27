"use client";

import { KeyRound, Link2, Unlink } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLsgConnection } from "@/views/core/lifesync/hooks/useLsgConnection";

const labelClass =
  "text-[11px] font-bold uppercase tracking-widest text-muted-foreground";

/** Un adaptador caído no es "activo": es un estado propio y hay que decirlo. */
function StatusBadge({
  reachable,
  needsRelink,
  broken,
}: {
  reachable: boolean;
  needsRelink: boolean;
  broken: boolean;
}) {
  if (!reachable) {
    return (
      <Badge
        variant="outline"
        className="bg-muted text-muted-foreground border-border"
      >
        Sin conexión con el adaptador
      </Badge>
    );
  }
  if (broken) {
    return (
      <Badge
        variant="outline"
        className="bg-red-500/15 text-red-600 border-red-500/40"
      >
        Vínculo roto
      </Badge>
    );
  }
  if (needsRelink) {
    return (
      <Badge
        variant="outline"
        className="bg-amber-500/15 text-amber-600 border-amber-500/40"
      >
        Sesión expirada
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="bg-emerald-500/15 text-emerald-600 border-emerald-500/40"
    >
      Activo
    </Badge>
  );
}

export function ConnectionCard() {
  const {
    connection,
    link,
    isLinking,
    unlink,
    isUnlinking,
    revokeCredential,
    isRevoking,
  } = useLsgConnection();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [storeCredential, setStoreCredential] = useState(false);

  if (connection) {
    const autoReconnect = connection.credentialState === "ACTIVE";
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            Perfil vinculado
            <StatusBadge
              reachable={connection.adapterReachable}
              needsRelink={connection.needsRelink}
              broken={Boolean(connection.brokenReason)}
            />
          </CardTitle>
          <CardDescription>
            Tus conductas de ahorro y planificación suman puntos en
            LifeSync-Games. Nunca se envían montos ni saldos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {connection.credentialState === "INVALID" && (
            <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700">
              Tu contraseña de LifeSync-Games cambió, así que dejamos de
              reconectar automáticamente y borramos la que teníamos guardada.
              Vuelve a vincular para reactivarla.
            </p>
          )}
          {connection.brokenReason && (
            <p className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-700">
              LifeSync-Games no reconoce tu jugador. Vuelve a vincular para
              restablecer el envío de eventos.
            </p>
          )}
          {connection.needsRelink && !connection.brokenReason && (
            <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700">
              Tu sesión con LifeSync-Games expiró. Vuelve a vincular para seguir
              sumando puntos; los eventos pendientes se sincronizarán solos.
            </p>
          )}
          {!connection.adapterReachable && (
            <p className="rounded-xl border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
              No pudimos contactar al adaptador, así que este estado puede estar
              desactualizado. Tus eventos se guardan y se enviarán al volver.
            </p>
          )}
          <div className="grid gap-1">
            <span className={labelClass}>Jugador LSG</span>
            <p className="text-sm">
              #{connection.lsgPlayerId} · {connection.lsgEmail}
            </p>
          </div>
          <div className="grid gap-1">
            <span className={labelClass}>Última sincronización</span>
            <p className="text-sm">
              {connection.lastSyncAt
                ? new Date(connection.lastSyncAt).toLocaleString("es-CL")
                : "Sin sincronizaciones aún"}
            </p>
          </div>
          <div className="grid gap-1">
            <span className={labelClass}>Reconexión automática</span>
            <p className="text-sm">
              {autoReconnect
                ? "Activada: tu sesión se renueva sola cuando expira."
                : "Desactivada: tendrás que vincular de nuevo cada vez que la sesión expire."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {autoReconnect && (
              <Button
                variant="outline"
                onClick={() => revokeCredential()}
                disabled={isRevoking}
              >
                <KeyRound className="mr-2 h-4 w-4" />
                {isRevoking ? "Revocando..." : "Dejar de guardar mi contraseña"}
              </Button>
            )}
            <Button
              variant="destructive"
              onClick={() => unlink()}
              disabled={isUnlinking}
            >
              <Unlink className="mr-2 h-4 w-4" />
              {isUnlinking ? "Desvinculando..." : "Desvincular"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vincular con LifeSync-Games</CardTitle>
        <CardDescription>
          Ingresa tus credenciales LSG. Se conserva tu sesión (token) para
          acreditar puntos en tu nombre, y se renueva sola mientras siga viva.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            link({ email, password, storeCredential });
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="lsg-email" className={labelClass}>
              Correo LSG
            </Label>
            <Input
              id="lsg-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.cl"
              className="rounded-xl"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="lsg-password" className={labelClass}>
              Contraseña LSG
            </Label>
            <Input
              id="lsg-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <Checkbox
                id="lsg-store-credential"
                checked={storeCredential}
                onCheckedChange={(checked) =>
                  setStoreCredential(checked === true)
                }
                className="mt-0.5"
              />
              <Label
                htmlFor="lsg-store-credential"
                className="cursor-pointer text-sm font-normal leading-snug"
              >
                Mantener mi sesión activa automáticamente
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              La sesión de LifeSync-Games dura 2 horas y no se puede renovar una
              vez vencida. Si activas esto, tu contraseña se guarda{" "}
              <strong>cifrada</strong> en el servidor del adaptador para volver
              a entrar por ti cuando expire. Si no lo activas, la contraseña se
              descarta ahora mismo y tendrás que vincular a mano cada vez.
              Puedes revocarlo cuando quieras sin desvincular.
            </p>
          </div>

          <Button type="submit" disabled={isLinking} className="w-full">
            <Link2 className="mr-2 h-4 w-4" />
            {isLinking ? "Vinculando..." : "Vincular perfil"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
