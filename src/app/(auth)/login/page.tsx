import type { Metadata } from "next";
import { LoginView } from "@/views/auth/login";

export const metadata: Metadata = {
  title: "Iniciar Sesión | EggSys",
  description: "Ingresa a tu cuenta para gestionar tus finanzas.",
};

export default function LoginPage() {
  return <LoginView />;
}
