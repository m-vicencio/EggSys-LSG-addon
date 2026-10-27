import type { Metadata } from "next";
import { RegisterView } from "@/views/auth/register";

export const metadata: Metadata = {
  title: "Crear Cuenta | EggSys",
  description: "Crea una cuenta para gestionar tus finanzas.",
};

export default function RegisterPage() {
  return <RegisterView />;
}
