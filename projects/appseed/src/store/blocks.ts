import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { api } from "@/api/backend";
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
      // Hidden on this device at once; with Supabase the block is also saved to the account (so the server can
      // stop the person replying) and comes back on other devices at sign-in (store/account.ts).
      block: (h) => {
        if (!get().handles.includes(h)) set({ handles: [h, ...get().handles] });
        api.blockHandle(h).catch(() => {});
      },
      unblock: (h) => {
        set({ handles: get().handles.filter((x) => x !== h) });
        api.unblockHandle(h).catch(() => {});
      },
    }),
    { name: "blocks", storage: createJSONStorage(() => mmkvStorage) },
  ),
);
