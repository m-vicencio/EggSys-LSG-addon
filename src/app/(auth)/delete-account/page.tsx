import type { Metadata } from "next";
import { DeleteAccountView } from "@/views/auth/delete-account";

export const metadata: Metadata = {
  title: "Borrar Cuenta | EggSys",
  description: "Elimina tu cuenta y todos tus datos de forma permanente.",
};

export default function DeleteAccountPage() {
  return <DeleteAccountView />;
}
