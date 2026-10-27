import { create } from "zustand";

type UserState = {
  id?: string | null;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  setUser: (user: Partial<UserState>) => void;
  clearUser: () => void;
};

export const useUserStore = create<UserState>((set) => ({
  id: null,
  name: null,
  email: null,
  image: null,
  setUser: (user) => set((s) => ({ ...s, ...user })),
  clearUser: () => set({ id: null, name: null, email: null, image: null }),
}));
