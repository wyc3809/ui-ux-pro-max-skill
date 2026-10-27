import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { haptic } from "@/lib/haptic";
import { motion } from "@/theme/tokens";

const APressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, "style"> & {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  hapticKind?: Parameters<typeof haptic>[0];
};

/**
 * Every tappable surface (§8 "按下"). Press-in eases down to `scaleTo` (0.98) on the UI thread; release springs back
 * with a slight overshoot, so surfaces feel like liquid rather than a hard toggle.
 */
export function PressableScale({ style, scaleTo = motion.press.scale, hapticKind, onPressIn, onPressOut, onPress, ...rest }: Props) {
  const s = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  const cfg = { duration: motion.press.duration, reduceMotion: ReduceMotion.System };
  const release = { damping: motion.liquid.damping, stiffness: motion.liquid.stiffness, mass: motion.liquid.mass, reduceMotion: ReduceMotion.System };
  return (
    <APressable
      accessibilityRole="button"
      {...rest}
      onPressIn={(e) => {
        s.value = withTiming(scaleTo, cfg);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        s.value = withSpring(1, release);
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (hapticKind) haptic(hapticKind);
        onPress?.(e);
      }}
      style={[style, animated]}
    />
  );
}
