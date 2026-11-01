import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { SourceChoice } from "@/api/types";
import type { PriceTier } from "@/lib/price";
import type { LicenseKind } from "@/lib/license";
import type { ListingMedia } from "@/lib/media";
import { mmkvStorage } from "./storage";

export type UploadDraft = {
  step: number;
  name: string;
  tagline: string;
  category: string | null;
  platforms: string[];
  source: SourceChoice | null;
  /** Filled from the scan; the creator can still edit it later. */
  stack: string[];
  /** Uploaded icon, screenshots and video (URLs once uploaded). */
  media: ListingMedia;
  storeLinks: { appStore: string; googlePlay: string };
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
  source: null,
  stack: [],
  media: { screenshots: [] },
  storeLinks: { appStore: "", googlePlay: "" },
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
    {
      name: "upload-draft",
      storage: createJSONStorage(() => mmkvStorage),
      // Drafts saved before media existed had a screenshot count instead; start their media empty.
      version: 1,
      migrate: (old) => {
        const s = old as { draft?: Partial<UploadDraft> & { screenshots?: unknown } } | undefined;
        const { screenshots: _count, ...rest } = s?.draft ?? {};
        return { draft: { ...empty, ...rest, media: { screenshots: [] }, storeLinks: { appStore: "", googlePlay: "" } } } as unknown as DraftState;
      },
    },
  ),
);
