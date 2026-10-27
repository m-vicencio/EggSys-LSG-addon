import type { Metadata } from "next";
import { DashboardView } from "@/views/core/dashboard";
export const metadata: Metadata = {
  title: "Dashboard | EggSys",
  description: "Visualiza y gestiona tus finanzas.",
};

export default function DashboardPage() {
  return <DashboardView />;
}
