import { create } from "zustand";

/** Remembers which tab was active last so the next tab can slide in from the correct side. */
type UiState = {
  tabIndex: number;
  prevTabIndex: number;
  setTab: (i: number) => void;
};

export const useUi = create<UiState>()((set, get) => ({
  tabIndex: 0,
  prevTabIndex: 0,
  setTab: (i) => {
    if (i !== get().tabIndex) set({ prevTabIndex: get().tabIndex, tabIndex: i });
  },
}));
