import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { useSettings } from "@/store/settings";

type Kind = "selection" | "tap" | "success" | "warning";

/** §9 — only call from event handlers. Fails silently; respects the settings toggle. */
export function haptic(kind: Kind): void {
  if (Platform.OS === "web" || !useSettings.getState().haptics) return;
  const run = {
    selection: () => Haptics.selectionAsync(),
    tap: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
    success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
    warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  }[kind];
  run().catch(() => {});
}
