import { useEffect } from "react";
import { View } from "react-native";
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { useTheme } from "@/theme/ThemeProvider";

/**
 * Shown for the instant fonts are loading: a brand tile springs in and its "seed"
 * bounces, built from plain Views so it needs no font or image.
 */
export function LaunchMark() {
  const { c } = useTheme();
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
    <View style={{ flex: 1, backgroundColor: c.bg, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={[{ width: 76, height: 76, borderRadius: 24, backgroundColor: c.accent, alignItems: "center", justifyContent: "flex-end", paddingBottom: 16 }, tile]}>
        <Animated.View style={[{ width: 18, height: 22, borderRadius: 11, backgroundColor: c.accentFg }, seed]} />
      </Animated.View>
    </View>
  );
}
