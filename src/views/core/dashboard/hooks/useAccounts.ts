import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { toast } from "sonner";
import { accountsApi } from "@/lib/api";
import { selectSelectedAccount, useAccountStore } from "@/store/accountStore";
import type { AppAccount } from "@/views/core/dashboard/interfaces/dashboard";

export function useAccounts() {
  const { status } = useSession();
  const router = useRouter();

  const accounts = useAccountStore((s) => s.accounts);
  const selectedAccountId = useAccountStore((s) => s.selectedAccountId);
  const setSelectedAccountId = useAccountStore((s) => s.setSelectedAccountId);
  const setAccounts = useAccountStore((s) => s.setAccounts);
  const adjustBalance = useAccountStore((s) => s.adjustBalance);
  const selectedAccount = useAccountStore(selectSelectedAccount);

  const { isLoading, isError } = useQuery<AppAccount[]>({
    queryKey: ["accounts"],
    queryFn: async () => {
      const data = await accountsApi.getAll();
      if (data.length === 0) {
        router.push("/onboarding");
      } else {
        setAccounts(data);
      }
      return data;
    },
    enabled: status === "authenticated",
  });

  useEffect(() => {
    if (isError) {
      toast.error("Error al cargar tus cuentas", {
        description:
          "No pudimos obtener la información de tus cuentas. Por favor, recarga la página.",
      });
    }
  }, [isError]);

  return {
    accounts,
    selectedAccountId,
    setSelectedAccountId,
    selectedAccount,
    adjustBalance,
    isLoading: isLoading || status === "loading",
  };
}
