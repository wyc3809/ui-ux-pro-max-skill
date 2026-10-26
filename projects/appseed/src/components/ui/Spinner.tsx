import { useEffect } from "react";
import { View } from "react-native";
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from "react-native-reanimated";

/** Three dots that ripple up in turn — the app's only loading indicator (no native spinner). */
export function Spinner({ color, size = 6 }: { color: string; size?: number }) {
  return (
    <View accessibilityRole="progressbar" style={{ flexDirection: "row", gap: size * 0.7, alignItems: "center", height: size * 3 }}>
      {[0, 1, 2].map((i) => (
        <Dot key={i} i={i} color={color} size={size} />
      ))}
    </View>
  );
}

function Dot({ i, color, size }: { i: number; color: string; size: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    const cfg = { duration: 280, easing: Easing.inOut(Easing.quad), reduceMotion: ReduceMotion.System };
    p.value = withDelay(i * 120, withRepeat(withSequence(withTiming(1, cfg), withTiming(0, cfg), withTiming(0, { duration: 200 })), -1));
  }, [i, p]);
  const a = useAnimatedStyle(() => ({ opacity: 0.45 + p.value * 0.55, transform: [{ translateY: -p.value * size * 0.9 }, { scale: 1 + p.value * 0.2 }] }));
  return <Animated.View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }, a]} />;
}
