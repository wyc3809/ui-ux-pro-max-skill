import { useEffect } from "react";
import { Platform, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native";
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { staggerDelay } from "@/lib/motion";
import { curve, motion } from "@/theme/tokens";

export type RevealKind = "up" | "card" | "hero";

type Props = {
  children?: React.ReactNode;
  /** Section order on the page; the first three are staggered (§8). */
  index?: number;
  /** up: text and rows (10px, blur 4). card: surfaces (24px, .985, blur 6). hero: headlines (6px, blur 2). */
  kind?: RevealKind;
  style?: StyleProp<ViewStyle>;
  onLayout?: (e: LayoutChangeEvent) => void;
};

const SPEC = {
  up: { ...motion.reveal, scale: 1, step: motion.reveal.stagger },
  card: { ...motion.revealCard, step: motion.stagger },
  hero: { ...motion.hero, scale: 1, step: motion.hero.stagger },
} as const;

// Blur is a CSS filter, so it only runs on web; iOS and Android get the same rise, fade and scale without it.
const BLUR = Platform.OS === "web";

/**
 * Entrance used by every page section (design-to-motion "rise + blur"): content rises a few pixels out of a
 * soft blur on the shared (0.22, 1, 0.36, 1) curve. Driven by shared values rather than a layout animation, so
 * the web layout never collapses (see startFrom) and the filter is removed once settled — a lingering filter
 * would stop the glass bars from blurring what scrolls under them.
 */
export function Reveal({ children, index = 0, kind = "up", style, onLayout }: Props) {
  const s = SPEC[kind];
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withDelay(
      staggerDelay(index, s.step),
      withTiming(1, { duration: s.duration, easing: curve.out, reduceMotion: ReduceMotion.System }),
    );
  }, [p, index, s]);

  const a = useAnimatedStyle(() => {
    const k = 1 - p.value;
    return {
      opacity: p.value,
      transform: [{ translateY: k * s.rise }, { scale: 1 - k * (1 - s.scale) }],
      ...(BLUR ? { filter: k > 0 ? `blur(${(k * s.blur).toFixed(2)}px)` : "none" } : null),
    };
  });

  return (
    <Animated.View onLayout={onLayout} style={[style, a]}>
      {children}
    </Animated.View>
  );
}
