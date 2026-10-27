import { PlusCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/useAppStore";
import { useAccountManagerLogic } from "../hooks/useAccountManager";
import { AccountFormSheet } from "./AccountFormSheet";
import { AccountList } from "./AccountList";

export function AccountManager() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isOnline = useAppStore((state) => state.isOnline);
  const {
    accounts,
    isLoading,
    isSheetOpen,
    setIsSheetOpen,
    formData,
    setFormData,
    error,
    isSaving,
    handleOpenCreate,
    handleOpenEdit,
    handleSave,
    setDefaultAccount,
    deleteAccount,
  } = useAccountManagerLogic();

  const updateForm = (
    field: keyof typeof formData,
    value: string | boolean,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const isOfflineStatus = isMounted && !isOnline;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Cuentas bancarias
          </h2>
          <p className="text-muted-foreground">
            Administra tus saldos y cuentas de ahorro.
          </p>
        </div>
        <Button
          onClick={handleOpenCreate}
          disabled={isOfflineStatus}
          className="w-full sm:w-auto"
        >
          <PlusCircle className="mr-2 h-4 w-4" />{" "}
          {isOfflineStatus ? "Sin conexión" : "Agregar cuenta"}
        </Button>
      </div>

      <AccountList
        accounts={accounts}
        isLoading={isLoading}
        isOfflineStatus={isOfflineStatus}
        onOpenCreate={handleOpenCreate}
        onOpenEdit={handleOpenEdit}
        onSetDefault={setDefaultAccount}
        onDelete={deleteAccount}
      />

      <AccountFormSheet
        isOpen={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        formData={formData}
        updateForm={updateForm}
        error={error}
        isSaving={isSaving}
        isOfflineStatus={isOfflineStatus}
        onSave={handleSave}
      />
    </div>
  );
}
