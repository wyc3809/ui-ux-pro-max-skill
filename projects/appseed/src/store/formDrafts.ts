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

/** A listing form's draft, auto-saved to MMKV on every change so closing the app never loses it. */
export function useFormDraft<T extends object>(key: string, initial: T): [T, (patch: Partial<T>) => void, () => void] {
  const stored = useDrafts((s) => s.drafts[key]) as Partial<T> | undefined;
  const save = useDrafts((s) => s.save);
  const clear = useDrafts((s) => s.clear);
  const value = { ...initial, ...stored } as T;
  return [value, (patch) => save(key, { ...value, ...patch }), () => clear(key)];
}
