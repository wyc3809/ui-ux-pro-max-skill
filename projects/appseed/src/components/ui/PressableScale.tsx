import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { haptic } from "@/lib/haptic";
import { motion } from "@/theme/tokens";

const APressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, "style"> & {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  hapticKind?: Parameters<typeof haptic>[0];
};

/** Every tappable surface: scales to 0.97 on press-in on the UI thread (§8 "按下"). */
export function PressableScale({ style, scaleTo = motion.press.scale, hapticKind, onPressIn, onPressOut, onPress, ...rest }: Props) {
  const s = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  const cfg = { duration: motion.press.duration, reduceMotion: ReduceMotion.System };
  return (
    <APressable
      accessibilityRole="button"
      {...rest}
      onPressIn={(e) => {
        s.value = withTiming(scaleTo, cfg);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        s.value = withTiming(1, cfg);
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
