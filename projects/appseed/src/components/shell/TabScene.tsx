import { useIsFocused } from "expo-router";
import { useEffect } from "react";
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { tabEnterOffset } from "@/lib/motion";
import { useUi } from "@/store/ui";
import { motion } from "@/theme/tokens";

/**
 * Wraps each tab screen. On focus it slides in 18px from the side the user is
 * travelling towards (right tab → from right) and fades up (§8 切換分頁).
 */
export function TabScene({ index, children }: { index: number; children: React.ReactNode }) {
  const focused = useIsFocused();
  const x = useSharedValue(0);
  const o = useSharedValue(1);
  useEffect(() => {
    if (!focused) return;
    const { prevTabIndex, tabIndex } = useUi.getState();
    if (tabIndex !== index) return;
    const cfg = { duration: motion.tab.duration, easing: motion.tab.easing, reduceMotion: ReduceMotion.System };
    x.value = tabEnterOffset(prevTabIndex, index, motion.tab.offset);
    o.value = prevTabIndex === index ? 1 : 0;
    x.value = withTiming(0, cfg);
    o.value = withTiming(1, cfg);
  }, [focused, index, x, o]);
  const a = useAnimatedStyle(() => ({ flex: 1, opacity: o.value, transform: [{ translateX: x.value }] }));
  return <Animated.View style={a}>{children}</Animated.View>;
}
