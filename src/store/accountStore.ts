import { create } from "zustand";
import type { AppAccount } from "@/views/core/dashboard/interfaces/dashboard";

// ─── Estado ───────────────────────────────────────────────────────────────────

type AccountState = {
  /** Lista de cuentas hidratada desde React Query */
  accounts: AppAccount[];
  /** ID de la cuenta actualmente seleccionada */
  selectedAccountId: string | null;

  // Acciones
  /** Sincroniza la lista completa desde el servidor */
  setAccounts: (accounts: AppAccount[]) => void;
  /** Cambia la cuenta activa */
  setSelectedAccountId: (id: string) => void;
  /**
   * Ajusta optimisticamente el balance de una cuenta.
   * delta > 0 → ingreso, delta < 0 → gasto.
   * Úsalo justo después de confirmar una mutación para que
   * los números cambien sin esperar al refetch.
   */
  adjustBalance: (accountId: string, delta: number) => void;
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAccountStore = create<AccountState>((set) => ({
  accounts: [],
  selectedAccountId: null,

  setAccounts: (accounts) =>
    set((state) => {
      // Preservar el selectedAccountId si aún existe en la nueva lista
      const stillExists = accounts.some(
        (a) => a.id === state.selectedAccountId,
      );
      // Si no hay selección activa, preferir la cuenta marcada como predeterminada
      const defaultAccount = accounts.find((a) => a.isDefault);
      return {
        accounts,
        selectedAccountId: stillExists
          ? state.selectedAccountId
          : (defaultAccount?.id ?? accounts[0]?.id ?? null),
      };
    }),

  setSelectedAccountId: (id) => set({ selectedAccountId: id }),

  adjustBalance: (accountId, delta) =>
    set((state) => ({
      accounts: state.accounts.map((acc) =>
        acc.id === accountId
          ? { ...acc, balance: Number(acc.balance) + delta }
          : acc,
      ),
    })),
}));

// ─── Selectores helper ────────────────────────────────────────────────────────

/** Devuelve la cuenta seleccionada actualmente */
export const selectSelectedAccount = (state: AccountState) =>
  state.accounts.find((a) => a.id === state.selectedAccountId) ?? null;
