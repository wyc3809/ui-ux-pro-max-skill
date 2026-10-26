import { CircleAlert, CircleCheck } from "lucide-react-native";
import { useEffect } from "react";
import Animated, { FadeOutUp, ReduceMotion, SlideInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { create } from "zustand";
import { haptic } from "@/lib/haptic";
import { useTheme } from "@/theme/ThemeProvider";
import { dark, light } from "@/theme/tokens";
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

/** Pill that drops in from the top with a soft spring, then lifts away after 2.2s. */
export function ToastHost() {
  const { c, soft, isDark } = useTheme();
  // The pill is inverted (fg-coloured), so its icon borrows the opposite palette's status colour.
  const inv = isDark ? light : dark;
  const insets = useSafeAreaInsets();
  const { id, message, kind, hide } = useToast();
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(hide, 2200);
    return () => clearTimeout(timer);
  }, [id, message, hide]);
  if (!message) return null;
  const Icon = kind === "success" ? CircleCheck : CircleAlert;
  return (
    <Animated.View
      key={id}
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      entering={SlideInUp.springify().damping(18).stiffness(220).reduceMotion(ReduceMotion.System)}
      exiting={FadeOutUp.duration(200)}
      style={[
        { position: "absolute", top: insets.top + 8, alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, height: 44, borderRadius: 22, backgroundColor: c.fg, zIndex: 100 },
        soft,
      ]}
    >
      <Icon size={18} color={kind === "success" ? inv.live : inv.warn} strokeWidth={2.4} />
      <Txt variant="bodyStrong" style={{ color: c.bg }}>
        {message}
      </Txt>
    </Animated.View>
  );
}
