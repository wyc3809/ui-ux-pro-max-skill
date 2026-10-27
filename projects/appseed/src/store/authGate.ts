import { create } from "zustand";
import type { TKey } from "@/i18n";
import { useSession } from "./session";

type GateState = {
  open: boolean;
  reason: TKey | null;
  pending: (() => void) | null;
  request: (reason: TKey | null, action?: () => void) => void;
  close: () => void;
  /** Called by the auth sheet after a successful sign-in: closes, then resumes what the user was doing (§11.2). */
  finish: () => void;
};

export const useAuthGate = create<GateState>()((set, get) => ({
  open: false,
  reason: null,
  pending: null,
  request: (reason, action) => set({ open: true, reason, pending: action ?? null }),
  close: () => set({ open: false, pending: null }),
  finish: () => {
    const action = get().pending;
    set({ open: false, pending: null });
    if (action) setTimeout(action, 360); // after the sheet has slid away
  },
}));

/** Wrap an action that needs an account: runs now when signed in, otherwise opens sign-in and runs it after. */
export function requireAuth(reason: TKey, action: () => void): void {
  if (useSession.getState().user) action();
  else useAuthGate.getState().request(reason, action);
}
