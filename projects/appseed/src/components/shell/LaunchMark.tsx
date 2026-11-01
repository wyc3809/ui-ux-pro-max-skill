import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { useT } from "@/i18n";
import { useTheme } from "@/theme/ThemeProvider";
import { gap } from "@/theme/tokens";
import { BrandMark } from "./BrandMark";

/** How long the opening plays before the app may show: the mark's intro, the name rising in, a short hold. */
export const INTRO_MS = 1900;
const INTRO_REDUCED_MS = 600;

/**
 * The loading page every launch opens on (docs/BRAND.md §5). The native splash is only the background colour,
 * so this picks up on the same colour: the mark grows from its seed and opens into the V, then VCseed and the
 * subtitle rise in. `onFinish` fires once the opening has played; the app fades it out when it is also ready.
 * The name uses the system font because Geist may still be loading.
 */
export function LaunchMark({ onFinish, onReady }: { onFinish?: () => void; onReady?: () => void }) {
  const { c } = useTheme();
  const t = useT();
  const reduced = useReducedMotion();
  const y = useSharedValue(reduced ? 0 : 10);
  const o = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    onReady?.();
    const cfg = { duration: 420, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System };
    y.value = withDelay(720, withTiming(0, cfg));
    o.value = withDelay(720, withTiming(1, cfg));
    const done = setTimeout(() => onFinish?.(), reduced ? INTRO_REDUCED_MS : INTRO_MS);
    return () => clearTimeout(done);
    // Plays once per launch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const words = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateY: y.value }] }));
  return (
    <View testID="launch-intro" accessibilityRole="progressbar" accessibilityLabel={t("brand.name")} style={{ flex: 1, backgroundColor: c.bg, alignItems: "center", justifyContent: "center", gap: gap.lg }}>
      <BrandMark size={136} animated={!reduced} />
      <Animated.View style={[{ alignItems: "center", gap: gap.xs }, words]}>
        <Text style={{ color: c.fg, fontSize: 30, lineHeight: 36, fontWeight: "700", letterSpacing: -0.8 }}>{t("brand.name")}</Text>
        <Text style={{ color: c.fgMuted, fontSize: 14, lineHeight: 20, letterSpacing: 0.2 }}>{t("brand.tagline")}</Text>
      </Animated.View>
    </View>
  );
}
