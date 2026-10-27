import { useRef } from "react";
import type { LayoutChangeEvent } from "react-native";
import Animated, { scrollTo, useAnimatedRef } from "react-native-reanimated";
import { scheduleOnUI } from "react-native-worklets";

/** Smooth-scroll a page to one of its sections (e.g. the comments tile → the comment thread). */
export function useJumpTo() {
  const ref = useAnimatedRef<Animated.ScrollView>();
  const y = useRef(0);
  return {
    ref,
    /** Put on a direct child of the scroll content so its layout y is in content coordinates. */
    onLayout: (e: LayoutChangeEvent) => {
      y.current = e.nativeEvent.layout.y;
    },
    jump: () => {
      const target = Math.max(0, y.current - 72);
      scheduleOnUI(() => scrollTo(ref, 0, target, true));
    },
  };
}
