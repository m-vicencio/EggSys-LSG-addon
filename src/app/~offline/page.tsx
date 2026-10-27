"use client";

import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button"; // Asegúrate de que esta ruta coincida con tu proyecto

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className="bg-muted p-4 rounded-full mb-6">
        <WifiOff className="w-12 h-12 text-muted-foreground" />
      </div>

      <h1 className="text-2xl font-bold tracking-tight mb-3 text-foreground">
        Estás sin conexión
      </h1>

      <p className="text-muted-foreground max-w-sm mb-8">
        Parece que te has quedado sin internet. Por favor, revisa tu conexión
        para seguir registrando tus gastos en EggSys.
      </p>

      <Button onClick={() => window.location.reload()} variant="default">
        Reintentar
      </Button>
    </div>
  );
}
