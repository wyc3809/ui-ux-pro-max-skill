import { createMMKV } from "react-native-mmkv";
import type { StateStorage } from "zustand/middleware";

export const mmkv = createMMKV({ id: "appseed" });

/** zustand `persist` adapter backed by MMKV (synchronous, works on web via localStorage). */
export const mmkvStorage: StateStorage = {
  getItem: (key) => mmkv.getString(key) ?? null,
  setItem: (key, value) => mmkv.set(key, value),
  removeItem: (key) => {
    mmkv.remove(key);
  },
};
