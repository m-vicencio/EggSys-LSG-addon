import type { Metadata } from "next";
import { OnboardingView } from "@/views/core/onboarding";
export const metadata: Metadata = {
  title: "Configuración | EggSys",
  description: "Completa la configuración de tu cuenta.",
};

export default function OnBoardingPage() {
  return <OnboardingView />;
}
