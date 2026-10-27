import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { accountsApi } from "@/lib/api";
import type {
  AccountDraft,
  Step,
} from "@/views/core/dashboard/interfaces/dashboard";

export function useOnboarding() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [step, setStep] = useState<Step>("welcome");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const makeDraft = (): AccountDraft => ({
    uid: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
    name: "",
    balance: "",
    currency: "CLP",
    isSavings: false,
    savingGoal: "",
  });

  const [accounts, setAccounts] = useState<AccountDraft[]>([makeDraft()]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const progressValue =
    step === "welcome" ? 33 : step === "accounts" ? 66 : 100;

  const addAccount = () => {
    setAccounts((prev) => [...prev, makeDraft()]);
  };

  const removeAccount = (index: number) => {
    setAccounts((prev) => prev.filter((_, i) => i !== index));
  };

  const updateAccount = (
    index: number,
    field: keyof AccountDraft,
    value: string | boolean,
  ) => {
    setAccounts((prev) =>
      prev.map((acc, i) => (i === index ? { ...acc, [field]: value } : acc)),
    );
  };

  const setSuggestion = (index: number, name: string) => {
    updateAccount(index, "name", name);
  };

  const handleSaveAccounts = async () => {
    const validAccounts = accounts.filter((a) => a.name.trim() !== "");
    if (validAccounts.length === 0) {
      setError("Debes agregar al menos una cuenta para continuar.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      for (const acc of validAccounts) {
        const payload: Parameters<typeof accountsApi.create>[0] = {
          name: acc.name.trim(),
          balance: Number.parseFloat(acc.balance) || 0,
          currency: acc.currency || "CLP",
          isSavings: !!acc.isSavings,
        };

        if (acc.isSavings) {
          if (
            !acc.savingGoal ||
            Number.isNaN(Number(acc.savingGoal)) ||
            Number(acc.savingGoal) <= 0
          ) {
            setError(
              "Debes ingresar una meta de ahorro válida para tus cuentas de ahorro.",
            );
            setSaving(false);
            return;
          }
          payload.savingGoal = Number(acc.savingGoal);
        }
        await accountsApi.create(payload);
      }
      setStep("done");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error inesperado al guardar.",
      );
    } finally {
      setSaving(false);
    }
  };

  return {
    session,
    status,
    step,
    setStep,
    accounts,
    addAccount,
    removeAccount,
    updateAccount,
    setSuggestion,
    handleSaveAccounts,
    saving,
    error,
    progressValue,
  };
}
