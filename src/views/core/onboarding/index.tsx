"use client";

import { Progress } from "@/components/ui/progress";
import { AccountsStep } from "./components/AccountsStep";
import { DoneStep } from "./components/DoneStep";
import { WelcomeStep } from "./components/WelcomeStep";
import { useOnboarding } from "./hooks/useOnboarding";

export function OnboardingView() {
  const {
    status,
    session,
    step,
    setStep,
    accounts,
    error,
    saving,
    progressValue,
    addAccount,
    removeAccount,
    updateAccount,
    setSuggestion,
    handleSaveAccounts,
  } = useOnboarding();

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/20">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <div className="text-muted-foreground font-medium">
            Cargando tu espacio...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto space-y-10 py-4">
      {step !== "done" && (
        <div className="space-y-3 animate-in fade-in duration-700">
          <div className="flex justify-between items-end px-1">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Paso {step === "welcome" ? "1" : "2"} de 2
              </p>
              <h3 className="text-sm font-medium text-muted-foreground">
                Configuración inicial
              </h3>
            </div>
            <span className="text-sm font-bold text-primary">
              {progressValue}%
            </span>
          </div>
          <Progress
            value={progressValue}
            className="h-2.5 bg-primary/10 shadow-sm"
          />
        </div>
      )}

      <div className="transition-all duration-500 ease-in-out">
        {step === "welcome" && (
          <WelcomeStep session={session} onNext={() => setStep("accounts")} />
        )}
        {step === "accounts" && (
          <AccountsStep
            accounts={accounts}
            error={error}
            saving={saving}
            onAddAccount={addAccount}
            onRemoveAccount={removeAccount}
            onUpdateAccount={updateAccount}
            onSetSuggestion={setSuggestion}
            onSave={handleSaveAccounts}
          />
        )}
        {step === "done" && <DoneStep />}
      </div>
    </div>
  );
}
