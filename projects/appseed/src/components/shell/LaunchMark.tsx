import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { useT } from "@/i18n";
import { useTheme } from "@/theme/ThemeProvider";
import { gap } from "@/theme/tokens";
import { BrandMark } from "./BrandMark";

/**
 * Shown for the instant fonts are loading, straight after the splash screen (which shows the still mark): the
 * mark plays the brand intro and the name rises in under it. The name uses the system font because Geist is
 * what is still loading.
 */
export function LaunchMark() {
  const { c } = useTheme();
  const t = useT();
  const y = useSharedValue(8);
  const o = useSharedValue(0);
  useEffect(() => {
    const cfg = { duration: 360, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System };
    y.value = withDelay(700, withTiming(0, cfg));
    o.value = withDelay(700, withTiming(1, cfg));
  }, [y, o]);
  const words = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateY: y.value }] }));
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, alignItems: "center", justifyContent: "center", gap: gap.md }}>
      <BrandMark size={120} animated />
      <Animated.View style={[{ alignItems: "center", gap: gap.xs }, words]}>
        <Text style={{ color: c.fg, fontSize: 24, lineHeight: 32, fontWeight: "700", letterSpacing: -0.5 }}>{t("brand.name")}</Text>
        <Text style={{ color: c.fgMuted, fontSize: 14, lineHeight: 20 }}>{t("brand.tagline")}</Text>
      </Animated.View>
    </View>
  );
}
