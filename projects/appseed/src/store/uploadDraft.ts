import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { PriceTier } from "@/lib/price";
import type { LicenseKind } from "@/lib/license";
import { mmkvStorage } from "./storage";

export type UploadDraft = {
  step: number;
  name: string;
  tagline: string;
  category: string | null;
  platforms: string[];
  repoUrl: string;
  screenshots: number;
  storySteps: { title: string; body: string }[];
  freePreviewSteps: number;
  tier: PriceTier | null;
  license: LicenseKind | null;
  originalityConfirmed: boolean;
};

const empty: UploadDraft = {
  step: 0,
  name: "",
  tagline: "",
  category: null,
  platforms: [],
  repoUrl: "",
  screenshots: 0,
  storySteps: [{ title: "", body: "" }],
  freePreviewSteps: 1,
  tier: null,
  license: null,
  originalityConfirmed: false,
};

type DraftState = {
  draft: UploadDraft;
  patch: (p: Partial<UploadDraft>) => void;
  reset: () => void;
};

/** Auto-saved on every change (§7 UploadStepper) — closing the app keeps the draft. */
export const useUploadDraft = create<DraftState>()(
  persist(
    (set, get) => ({
      draft: empty,
      patch: (p) => set({ draft: { ...get().draft, ...p } }),
      reset: () => set({ draft: empty }),
    }),
    { name: "upload-draft", storage: createJSONStorage(() => mmkvStorage) },
  ),
);
