import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { api } from "@/api/backend";
import { mmkvStorage } from "./storage";

type FavoritesState = {
  slugs: string[];
  toggle: (slug: string) => boolean;
  has: (slug: string) => boolean;
};

export const useFavorites = create<FavoritesState>()(
  persist(
    (set, get) => ({
      slugs: [],
      // Instant on this device; with Supabase also saved to the account, so iOS, Android and the web agree.
      toggle: (slug) => {
        const on = !get().slugs.includes(slug);
        set({ slugs: on ? [slug, ...get().slugs] : get().slugs.filter((s) => s !== slug) });
        api.setFavorite(slug, on).catch(() => {});
        return on;
      },
      has: (slug) => get().slugs.includes(slug),
    }),
    { name: "favorites", storage: createJSONStorage(() => mmkvStorage) },
  ),
);
