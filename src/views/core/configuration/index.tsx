"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AccountSettings from "@/views/core/configuration/components/account";
import DataSettings from "@/views/core/configuration/components/data";
import { ThemePalette } from "@/views/core/configuration/components/ThemePalette";
import { CategoriesSettings } from "./components/categoriesSettings";

export function ConfigurationView() {
  // 1. Quitamos `whitespace-nowrap` para que no fuerce el desbordamiento.
  // 2. Ajustamos fuente y padding para móviles: `text-[11px] sm:text-base` y `px-1 sm:px-4`
  const triggerStyles =
    "inline-flex items-center justify-center rounded-lg px-1 sm:px-4 py-2 sm:py-2.5 text-[11px] sm:text-base font-medium text-muted-foreground transition-all border border-transparent hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:border-border";

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-1">
          Configuración
        </h1>
        <p className="text-muted-foreground text-sm">
          Administra tu perfil, preferencias visuales y tus datos.
        </p>
      </div>

      <Tabs defaultValue="cuenta" className="w-full">
        {/* Cambiamos el flex+scroll por un `grid grid-cols-4` global para que siempre ocupen 1/4 del espacio */}
        <TabsList className="grid grid-cols-4 min-h-[52px] h-auto w-full items-center rounded-xl bg-muted p-1 sm:p-1.5 mb-6">
          <TabsTrigger value="cuenta" className={triggerStyles}>
            Cuenta
          </TabsTrigger>
          <TabsTrigger value="apariencia" className={triggerStyles}>
            Apariencia
          </TabsTrigger>
          <TabsTrigger value="categorias" className={triggerStyles}>
            Categorías
          </TabsTrigger>
          <TabsTrigger value="datos" className={triggerStyles}>
            Datos
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="cuenta"
          className="focus-visible:outline-none focus-visible:ring-0"
        >
          <AccountSettings />
        </TabsContent>

        <TabsContent
          value="apariencia"
          className="focus-visible:outline-none focus-visible:ring-0"
        >
          <ThemePalette />
        </TabsContent>

        <TabsContent
          value="categorias"
          className="focus-visible:outline-none focus-visible:ring-0"
        >
          <CategoriesSettings />
        </TabsContent>

        <TabsContent
          value="datos"
          className="focus-visible:outline-none focus-visible:ring-0"
        >
          <DataSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
