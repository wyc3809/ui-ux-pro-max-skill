import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { User } from "@/api/types";
import { mmkvStorage } from "./storage";

type SessionState = { user: User | null; signIn: (u: User) => void; signOut: () => void };

/** The signed-in account. Real tokens live in Supabase's secure storage; this only drives the UI. */
export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      user: null,
      signIn: (user) => set({ user }),
      signOut: () => set({ user: null }),
    }),
    { name: "session", storage: createJSONStorage(() => mmkvStorage) },
  ),
);
