import type { Metadata } from "next";
import { GraphicsView } from "@/views/core/graphics";
export const metadata: Metadata = {
  title: "Gráficos | EggSys",
  description: "Visualiza y genera reportes de tus finanzas.",
};

export default function GraphicsPage() {
  return <GraphicsView />;
}
