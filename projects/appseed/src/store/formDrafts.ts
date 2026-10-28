import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { mmkvStorage } from "./storage";

type DraftsState = {
  drafts: Record<string, unknown>;
  save: (key: string, value: unknown) => void;
  clear: (key: string) => void;
};

const useDrafts = create<DraftsState>()(
  persist(
    (set, get) => ({
      drafts: {},
      save: (key, value) => set({ drafts: { ...get().drafts, [key]: value } }),
      clear: (key) => {
        const { [key]: _gone, ...rest } = get().drafts;
        set({ drafts: rest });
      },
    }),
    { name: "form-drafts", storage: createJSONStorage(() => mmkvStorage) },
  ),
);

/** Wipes every saved listing draft (used when the account changes). */
export const clearAllDrafts = () => useDrafts.setState({ drafts: {} });

/** A listing form's draft, auto-saved to MMKV on every change so closing the app never loses it. */
export function useFormDraft<T extends object>(key: string, initial: T): [T, (patch: Partial<T>) => void, () => void] {
  const stored = useDrafts((s) => s.drafts[key]) as Partial<T> | undefined;
  const save = useDrafts((s) => s.save);
  const clear = useDrafts((s) => s.clear);
  const value = { ...initial, ...stored } as T;
  // Merge into the latest stored draft, not the render-time value: async callbacks (scan results)
  // can patch twice in a row and must not overwrite each other.
  const patch = (p: Partial<T>) => save(key, { ...initial, ...(useDrafts.getState().drafts[key] as Partial<T> | undefined), ...p });
  return [value, patch, () => clear(key)];
}
