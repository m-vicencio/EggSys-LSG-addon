"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useLsgConnection } from "@/views/core/lifesync/hooks/useLsgConnection";
import { LSG_EVENT_TYPES } from "@/views/core/lifesync/interfaces/lsg";

export function SensorConfigForm() {
  const { connection, updateConfig, isSavingConfig } = useLsgConnection();

  if (!connection) {
    return (
      <p className="text-sm text-muted-foreground">
        Vincula tu perfil para configurar qué conductas se reportan.
      </p>
    );
  }

  const toggleEvent = (eventType: string, active: boolean) => {
    const disabled = new Set(connection.disabledEvents);
    if (active) {
      disabled.delete(eventType);
    } else {
      disabled.add(eventType);
    }
    updateConfig({ disabledEvents: [...disabled] });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Qué se reporta</CardTitle>
        <CardDescription>
          Controla qué conductas se envían a LifeSync-Games. Puedes pausar todo
          el sensor sin desvincular tu perfil.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="lsg-enabled" className="cursor-pointer">
            <span className="block font-medium">Sensor activo</span>
            <span className="block text-sm text-muted-foreground">
              Interruptor general de envío de eventos
            </span>
          </Label>
          <Switch
            id="lsg-enabled"
            checked={connection.enabled}
            disabled={isSavingConfig}
            onCheckedChange={(checked) => updateConfig({ enabled: checked })}
          />
        </div>
        <Separator />
        {Object.entries(LSG_EVENT_TYPES).map(([eventType, description]) => (
          <div
            key={eventType}
            className="flex items-center justify-between gap-4"
          >
            <Label htmlFor={`lsg-${eventType}`} className="cursor-pointer">
              <span className="block font-medium">{description}</span>
              <span className="block text-sm text-muted-foreground">
                {eventType}
              </span>
            </Label>
            <Switch
              id={`lsg-${eventType}`}
              checked={!connection.disabledEvents.includes(eventType)}
              disabled={isSavingConfig || !connection.enabled}
              onCheckedChange={(checked) => toggleEvent(eventType, checked)}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
