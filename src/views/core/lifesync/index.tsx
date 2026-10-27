"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConnectionCard } from "./components/ConnectionCard";
import { EventHistoryTable } from "./components/EventHistoryTable";
import { SensorConfigForm } from "./components/SensorConfigForm";
import { useLsgConnection } from "./hooks/useLsgConnection";

export function LifeSyncView() {
  const { addonEnabled, isLoading } = useLsgConnection();

  const triggerStyles =
    "inline-flex items-center justify-center rounded-lg px-1 sm:px-4 py-2 sm:py-2.5 text-[11px] sm:text-base font-medium text-muted-foreground transition-all border border-transparent hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:border-border";

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-1">LifeSync</h1>
        <p className="text-muted-foreground text-sm">
          Convierte tus hábitos financieros en puntos de LifeSync-Games. Solo se
          reportan conductas, nunca montos ni saldos.
        </p>
      </div>

      {!isLoading && !addonEnabled ? (
        <p className="text-sm text-muted-foreground">
          La integración con LifeSync-Games no está habilitada en este entorno.
        </p>
      ) : (
        <Tabs defaultValue="conexion" className="w-full">
          <TabsList className="grid grid-cols-3 min-h-[52px] h-auto w-full items-center rounded-xl bg-muted p-1 sm:p-1.5 mb-6">
            <TabsTrigger value="conexion" className={triggerStyles}>
              Conexión
            </TabsTrigger>
            <TabsTrigger value="eventos" className={triggerStyles}>
              Eventos
            </TabsTrigger>
            <TabsTrigger value="configuracion" className={triggerStyles}>
              Configuración
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="conexion"
            className="focus-visible:outline-none focus-visible:ring-0"
          >
            <ConnectionCard />
          </TabsContent>

          <TabsContent
            value="eventos"
            className="focus-visible:outline-none focus-visible:ring-0"
          >
            <EventHistoryTable />
          </TabsContent>

          <TabsContent
            value="configuracion"
            className="focus-visible:outline-none focus-visible:ring-0"
          >
            <SensorConfigForm />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
