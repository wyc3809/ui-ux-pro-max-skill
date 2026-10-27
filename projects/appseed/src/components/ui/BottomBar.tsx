import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { gap } from "@/theme/tokens";
import { Glass, useGlassShadow } from "./Glass";

/** Height of every floating bar (tab bar, purchase bar). */
export const FLOAT_BAR_HEIGHT = 64;
/** Floating bars sit 12pt above the home indicator, or 12pt off the screen edge without one. */
export function useFloatGap() {
  return Math.max(useSafeAreaInsets().bottom, gap.md);
}
/** Scroll padding that keeps the last item clear of a floating bar. */
export function useFloatClearance() {
  return FLOAT_BAR_HEIGHT + useFloatGap() + gap.xl;
}

/** Radius of the floating bar; controls inside it use `nested(BAR_RADIUS, 8)` so the curves stay concentric. */
export const BAR_RADIUS = 24;

/** Floating glass action bar shared by every purchase / offer bar (64pt, concentric with its 48pt button). */
export function BottomBar({ children }: { children: React.ReactNode }) {
  const bottom = useFloatGap();
  const shadow = useGlassShadow();
  return (
    <View style={[{ position: "absolute", left: gap.md, right: gap.md, bottom }, shadow]}>
      <Glass radius={BAR_RADIUS}>
        <View style={{ height: FLOAT_BAR_HEIGHT, flexDirection: "row", alignItems: "center", gap: gap.md, paddingLeft: gap.lg, paddingRight: gap.sm }}>{children}</View>
      </Glass>
    </View>
  );
}
