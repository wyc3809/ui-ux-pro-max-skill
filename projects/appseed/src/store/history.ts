import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { pushHistory } from "@/lib/search";
import { mmkvStorage } from "./storage";

type HistoryState = {
  queries: string[];
  add: (q: string) => void;
  clear: () => void;
};

export const useHistory = create<HistoryState>()(
  persist(
    (set, get) => ({
      queries: [],
      add: (q) => set({ queries: pushHistory(get().queries, q) }),
      clear: () => set({ queries: [] }),
    }),
    { name: "search-history", storage: createJSONStorage(() => mmkvStorage) },
  ),
);
