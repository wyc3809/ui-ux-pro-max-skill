import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Locale } from "@/i18n";
import { mmkvStorage } from "./storage";

export type ThemePref = "system" | "light" | "dark";

type SettingsState = {
  theme: ThemePref;
  haptics: boolean;
  locale: Locale;
  setTheme: (t: ThemePref) => void;
  setHaptics: (on: boolean) => void;
  setLocale: (l: Locale) => void;
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "system",
      haptics: true,
      locale: "zh-Hant",
      setTheme: (theme) => set({ theme }),
      setHaptics: (haptics) => set({ haptics }),
      setLocale: (locale) => set({ locale }),
    }),
    { name: "settings", storage: createJSONStorage(() => mmkvStorage) },
  ),
);
