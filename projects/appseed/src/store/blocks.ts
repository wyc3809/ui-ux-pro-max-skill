import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { mmkvStorage } from "./storage";

/**
 * People the viewer blocked (§30). Their posts, replies and comments are hidden everywhere for the viewer;
 * the real server also stops them from replying to the viewer. They are never notified.
 */
type BlocksState = { handles: string[]; block: (h: string) => void; unblock: (h: string) => void };

export const useBlocks = create<BlocksState>()(
  persist(
    (set, get) => ({
      handles: [],
      block: (h) => {
        if (!get().handles.includes(h)) set({ handles: [h, ...get().handles] });
      },
      unblock: (h) => set({ handles: get().handles.filter((x) => x !== h) }),
    }),
    { name: "blocks", storage: createJSONStorage(() => mmkvStorage) },
  ),
);
