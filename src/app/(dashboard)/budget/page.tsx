import type { Metadata } from "next";
import { BudgetView } from "@/views/core/budget";
export const metadata: Metadata = {
  title: "Presupuesto | EggSys",
  description: "Gestiona tu presupuesto mensual.",
};

export default function BudgetPage() {
  return <BudgetView />;
}
