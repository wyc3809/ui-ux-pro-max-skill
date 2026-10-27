import { useEffect } from "react";
import Animated, { FadeOutUp, ReduceMotion, SlideInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { create } from "zustand";
import { haptic } from "@/lib/haptic";
import { useTheme } from "@/theme/ThemeProvider";
import { gap } from "@/theme/tokens";
import { Glass, useGlassShadow } from "./Glass";
import { Icon } from "./Icon";
import { Txt } from "./Txt";

type ToastKind = "success" | "warning";
type ToastState = { id: number; message: string | null; kind: ToastKind; show: (message: string, kind?: ToastKind) => void; hide: () => void };

export const useToast = create<ToastState>()((set, get) => ({
  id: 0,
  message: null,
  kind: "success",
  show: (message, kind = "success") => {
    haptic(kind);
    set({ message, kind, id: get().id + 1 });
  },
  hide: () => set({ message: null }),
}));

export const toast = (message: string, kind?: ToastKind) => useToast.getState().show(message, kind);

/** Glass pill that drops in from the top with a soft spring, then lifts away after 2.2s. */
export function ToastHost() {
  const { c } = useTheme();
  const shadow = useGlassShadow();
  const insets = useSafeAreaInsets();
  const { id, message, kind, hide } = useToast();
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(hide, 2200);
    return () => clearTimeout(timer);
  }, [id, message, hide]);
  if (!message) return null;
  return (
    <Animated.View
      key={id}
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      entering={SlideInUp.springify().damping(18).stiffness(220).reduceMotion(ReduceMotion.System)}
      exiting={FadeOutUp.duration(200)}
      style={[{ position: "absolute", top: insets.top + gap.sm, alignSelf: "center", borderRadius: 24, zIndex: 100 }, shadow]}
    >
      <Glass radius={24} style={{ flexDirection: "row", alignItems: "center", gap: gap.sm, paddingHorizontal: gap.lg, height: 48 }}>
        <Icon name={kind === "success" ? "checkCircle" : "alert"} size={20} color={kind === "success" ? c.live : c.warn} active enterDelay={120} motion={kind === "success" ? "pop" : "wiggle"} />
        <Txt variant="bodyStrong">{message}</Txt>
      </Glass>
    </Animated.View>
  );
}
