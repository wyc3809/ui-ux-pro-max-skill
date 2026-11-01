import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { SourceChoice } from "@/api/types";
import type { PriceTier } from "@/lib/price";
import type { LicenseKind } from "@/lib/license";
import type { ListingMedia } from "@/lib/media";
import { isCategory, type CategoryKey } from "@/lib/categories";
import { mmkvStorage } from "./storage";

export type UploadDraft = {
  step: number;
  name: string;
  tagline: string;
  category: CategoryKey | null;
  secondaryCategory: CategoryKey | null;
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
  secondaryCategory: null,
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
      // v1: drafts saved before media existed had a screenshot count instead; start their media empty.
      // v2: the old six categories became App Store + vibe coding categories (lib/categories.ts); pick again.
      version: 2,
      migrate: (old, version) => {
        const s = old as { draft?: Partial<UploadDraft> & { screenshots?: unknown } } | undefined;
        const { screenshots: _count, ...rest } = s?.draft ?? {};
        const media = version < 1 ? { media: { screenshots: [] }, storeLinks: { appStore: "", googlePlay: "" } } : {};
        return { draft: { ...empty, ...rest, ...media, category: isCategory(rest.category) ? rest.category : null, secondaryCategory: isCategory(rest.secondaryCategory) ? rest.secondaryCategory : null } } as unknown as DraftState;
      },
    },
  ),
);
