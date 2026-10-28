import { create } from "zustand";
import type { TKey } from "@/i18n";
import { TERMS_VERSION } from "@/lib/contact";
import { useSession } from "./session";

type GateState = {
  open: boolean;
  reason: TKey | null;
  pending: (() => void) | null;
  request: (reason: TKey | null, action?: () => void) => void;
  close: () => void;
  /** Called by the auth sheet after a successful sign-in: closes, then resumes what the user was doing (§11.2). */
  finish: () => void;
  /** Terms re-acceptance gate (§30): open when the signed-in user accepted an older TERMS_VERSION. */
  termsOpen: boolean;
  termsPending: (() => void) | null;
  requestTerms: (action?: () => void) => void;
  closeTerms: () => void;
  finishTerms: () => void;
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
  termsOpen: false,
  termsPending: null,
  requestTerms: (action) => set({ termsOpen: true, termsPending: action ?? null }),
  closeTerms: () => set({ termsOpen: false, termsPending: null }),
  finishTerms: () => {
    const action = get().termsPending;
    set({ termsOpen: false, termsPending: null });
    if (action) setTimeout(action, 360);
  },
}));

/**
 * For actions that publish user content: needs an account and the current terms. Signed-out people sign in
 * first; people who accepted an older version see the terms again; then the action resumes.
 */
export function requireTerms(reason: TKey, action: () => void): void {
  requireAuth(reason, () => {
    const user = useSession.getState().user;
    if ((user?.termsVersion ?? 0) >= TERMS_VERSION) action();
    else useAuthGate.getState().requestTerms(action);
  });
}

/** Wrap an action that needs an account: runs now when signed in, otherwise opens sign-in and runs it after. */
export function requireAuth(reason: TKey, action: () => void): void {
  if (useSession.getState().user) action();
  else useAuthGate.getState().request(reason, action);
}
