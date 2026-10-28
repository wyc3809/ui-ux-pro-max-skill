import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { User } from "@/api/types";
import { onSignedIn, resetAccountData } from "./account";
import { mmkvStorage } from "./storage";

type SessionState = { user: User | null; signIn: (u: User) => void; signOut: () => void };

/** The signed-in account. Real tokens live in Supabase's secure storage; this only drives the UI. */
export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      user: null,
      signIn: (user) => {
        set({ user });
        onSignedIn();
      },
      signOut: () => {
        set({ user: null });
        resetAccountData();
      },
    }),
    { name: "session", storage: createJSONStorage(() => mmkvStorage) },
  ),
);
