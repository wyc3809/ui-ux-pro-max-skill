import { useEffect, useState } from "react";
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { tabEnterOffset } from "@/lib/motion";
import { motion } from "@/theme/tokens";

/**
 * Content keyed by a position in an ordered set (segments, hubs, wizard steps). When the key
 * changes, the new content slides in from the side of travel and fades up (§8 切換分頁).
 */
export function DirectionalSwap<T>({ value, order, offset = motion.tab.offset, children }: { value: T; order: readonly T[]; offset?: number; children: React.ReactNode }) {
  const [prev, setPrev] = useState(value);
  const x = useSharedValue(0);
  const o = useSharedValue(1);
  useEffect(() => {
    if (prev === value) return;
    const cfg = { duration: motion.tab.duration, easing: motion.tab.easing, reduceMotion: ReduceMotion.System };
    x.value = tabEnterOffset(order.indexOf(prev), order.indexOf(value), offset);
    o.value = 0;
    x.value = withTiming(0, cfg);
    o.value = withTiming(1, cfg);
    setPrev(value);
  }, [value, prev, order, offset, x, o]);
  const a = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateX: x.value }] }));
  return <Animated.View style={a}>{children}</Animated.View>;
}
