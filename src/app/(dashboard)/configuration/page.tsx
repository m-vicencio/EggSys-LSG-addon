import type { Metadata } from "next";
import { ConfigurationView } from "@/views/core/configuration";
export const metadata: Metadata = {
  title: "Configuración | EggSys",
  description: "Gestiona tu configuración.",
};

export default function ConfigurationPage() {
  return <ConfigurationView />;
}
