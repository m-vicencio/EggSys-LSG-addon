import { create } from "zustand";

interface AppState {
  isOnline: boolean;
  setIsOnline: (status: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isOnline: true,
  setIsOnline: (status) => set({ isOnline: status }),
}));
