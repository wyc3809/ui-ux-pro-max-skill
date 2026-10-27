import * as SystemUI from "expo-system-ui";
import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { Platform, useColorScheme, type ViewStyle } from "react-native";
import { useSettings } from "@/store/settings";
import { dark, light, shadow, type Palette } from "./tokens";

type Theme = { c: Palette; isDark: boolean; card: ViewStyle; soft: ViewStyle };

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const pref = useSettings((s) => s.theme);
  const isDark = pref === "system" ? system === "dark" : pref === "dark";

  const value = useMemo<Theme>(() => {
    const c = isDark ? dark : light;
    // Light mode floats on shadow; dark mode shadows vanish so use a hairline border instead (§4).
    const elevate = (s: ViewStyle): ViewStyle => (isDark ? { borderWidth: 1, borderColor: c.border } : s);
    return { c, isDark, card: elevate(shadow.card), soft: elevate(shadow.soft) };
  }, [isDark]);

  useEffect(() => {
    // Root background matches the theme so there's no white flash on launch / transitions.
    SystemUI.setBackgroundColorAsync(value.c.bg).catch(() => {});
  }, [value.c.bg]);

  useEffect(() => {
    // Web keyboard users get a visible accent focus ring on anything tappable (pointer focus stays clean).
    if (Platform.OS !== "web") return;
    let tag = document.getElementById("focus-ring");
    if (!tag) {
      tag = document.createElement("style");
      tag.id = "focus-ring";
      document.head.appendChild(tag);
    }
    tag.textContent = `[role=button]:focus-visible,[role=tab]:focus-visible,[role=switch]:focus-visible,a:focus-visible{outline:2px solid ${value.c.accent}!important;outline-offset:2px}`;
  }, [value.c.accent]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const t = useContext(ThemeContext);
  if (!t) throw new Error("useTheme must be used inside ThemeProvider");
  return t;
}
