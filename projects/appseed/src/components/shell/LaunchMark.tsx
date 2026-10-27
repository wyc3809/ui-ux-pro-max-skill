import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { useT } from "@/i18n";
import { useTheme } from "@/theme/ThemeProvider";
import { gap } from "@/theme/tokens";

/**
 * Shown for the instant fonts are loading: a brand tile springs in and its "seed"
 * bounces, built from plain Views so it needs no font or image. The name and subtitle use the system
 * font for the same reason (Geist is what is still loading).
 */
export function LaunchMark() {
  const { c } = useTheme();
  const t = useT();
  const s = useSharedValue(0.5);
  const y = useSharedValue(0);
  useEffect(() => {
    s.value = withSpring(1, { damping: 10, stiffness: 180, reduceMotion: ReduceMotion.System });
    y.value = withRepeat(
      withSequence(withTiming(-10, { duration: 320, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 320, easing: Easing.in(Easing.quad) })),
      -1,
      false,
      undefined,
      ReduceMotion.System,
    );
  }, [s, y]);
  const tile = useAnimatedStyle(() => ({ transform: [{ scale: s.value }], opacity: s.value }));
  const seed = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, alignItems: "center", justifyContent: "center", gap: gap.lg }}>
      <Animated.View style={[{ width: 76, height: 76, borderRadius: 24, backgroundColor: c.accent, alignItems: "center", justifyContent: "flex-end", paddingBottom: 16 }, tile]}>
        <Animated.View style={[{ width: 18, height: 22, borderRadius: 11, backgroundColor: c.accentFg }, seed]} />
      </Animated.View>
      <Animated.View style={[{ alignItems: "center", gap: gap.xs }, tile]}>
        <Text style={{ color: c.fg, fontSize: 24, lineHeight: 32, fontWeight: "700", letterSpacing: -0.5 }}>{t("brand.name")}</Text>
        <Text style={{ color: c.fgMuted, fontSize: 14, lineHeight: 20 }}>{t("brand.tagline")}</Text>
      </Animated.View>
    </View>
  );
}
