import type { Metadata } from "next";
import { AccountsView } from "@/views/core/accounts";
export const metadata: Metadata = {
  title: "Cuentas | EggSys",
  description: "Gestiona tus cuentas.",
};

export default function AccountsPage() {
  return <AccountsView />;
}
