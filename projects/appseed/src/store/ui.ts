import { useEffect } from "react";
import { create } from "zustand";

/**
 * Remembers which tab was active last so the next tab can slide in from the correct side,
 * and how many sheets are open so the page behind them can recede.
 */
type UiState = {
  tabIndex: number;
  prevTabIndex: number;
  setTab: (i: number) => void;
  sheets: number;
  sheetOpened: () => void;
  sheetClosed: () => void;
};

export const useUi = create<UiState>()((set, get) => ({
  tabIndex: 0,
  prevTabIndex: 0,
  setTab: (i) => {
    if (i !== get().tabIndex) set({ prevTabIndex: get().tabIndex, tabIndex: i });
  },
  sheets: 0,
  sheetOpened: () => set({ sheets: get().sheets + 1 }),
  sheetClosed: () => set({ sheets: Math.max(0, get().sheets - 1) }),
}));

/** Reports an open sheet to the shell so the page behind it recedes (§7). */
export function useSheetDepth(open: boolean) {
  useEffect(() => {
    if (!open) return;
    useUi.getState().sheetOpened();
    return () => useUi.getState().sheetClosed();
  }, [open]);
}
