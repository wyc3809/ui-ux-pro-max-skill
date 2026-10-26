import { useEffect } from "react";
import type { DimensionValue, ViewStyle } from "react-native";
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { useTheme } from "@/theme/ThemeProvider";

type Props = { width?: DimensionValue; height: number; radius?: number; style?: ViewStyle };

/** Breathing placeholder, same footprint as the content it stands in for (no layout jump). */
export function Skeleton({ width = "100%", height, radius = 10, style }: Props) {
  const { c } = useTheme();
  const o = useSharedValue(0.55);
  useEffect(() => {
    o.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad), reduceMotion: ReduceMotion.System }), -1, true);
  }, [o]);
  const a = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View accessibilityElementsHidden style={[{ width, height, borderRadius: radius, backgroundColor: c.bgMuted }, a, style]} />;
}
