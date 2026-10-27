import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { mmkvStorage } from "./storage";

const MAX = 200;

/** Posts the viewer opened, so the For you feed can rank them lower (§28). Kept on the device. */
type SeenState = { ids: string[]; mark: (id: string) => void };

export const useSeenPosts = create<SeenState>()(
  persist(
    (set, get) => ({
      ids: [],
      mark: (id) => {
        if (!get().ids.includes(id)) set({ ids: [id, ...get().ids].slice(0, MAX) });
      },
    }),
    { name: "seen-posts", storage: createJSONStorage(() => mmkvStorage) },
  ),
);
