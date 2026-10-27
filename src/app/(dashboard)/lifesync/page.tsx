import type { Metadata } from "next";
import { LifeSyncView } from "@/views/core/lifesync";

export const metadata: Metadata = {
  title: "LifeSync | EggSys",
  description: "Vincula tus hábitos financieros con LifeSync-Games.",
};

export default function LifeSyncPage() {
  return <LifeSyncView />;
}
