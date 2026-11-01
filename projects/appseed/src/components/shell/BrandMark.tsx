import { Image } from "expo-image";
import { useEffect } from "react";
import { View } from "react-native";
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from "react-native-reanimated";

/**
 * The VCseed mark (docs/BRAND.md): two glass leaves crossing into a V. The three layers are rendered from
 * brand/src/mark.js on the same canvas, so stacking them rebuilds the mark exactly.
 *
 * Animated, it plays the brand intro: the leaves rise from where the stems cross, closed together like a seed,
 * open into the V, then the overlap lights up (the same timing as store/video/brand-intro.mp4).
 */
const LAYERS = { left: require("../../../assets/brand/leaf-left.png"), right: require("../../../assets/brand/leaf-right.png"), overlap: require("../../../assets/brand/overlap.png") };
/** Each leaf's angle from upright, and the pivot (where the stems cross) on the 1024 grid: (512, 792). */
export const LEAF_TILT = 27.2;
const ORIGIN = "50% 77.34%";

export function BrandMark({ size = 96, animated = false, delay = 0 }: { size?: number; animated?: boolean; delay?: number }) {
  const grow = useSharedValue(animated ? 0 : 1);
  const open = useSharedValue(animated ? 0 : 1);
  const light = useSharedValue(animated ? 0 : 1);
  useEffect(() => {
    if (!animated) return;
    const grow_ = { damping: 16, stiffness: 150, reduceMotion: ReduceMotion.System }; // ~4% overshoot on the grow
    const spring = { damping: 12, stiffness: 140, reduceMotion: ReduceMotion.System };
    grow.value = withDelay(delay, withSpring(1, grow_));
    open.value = withDelay(delay + 180, withSpring(1, spring));
    light.value = withDelay(delay + 800, withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System }));
  }, [animated, delay, grow, open, light]);
  const left = useAnimatedStyle(() => ({ transform: [{ rotate: `${LEAF_TILT * (1 - open.value)}deg` }, { scale: grow.value }] }));
  const right = useAnimatedStyle(() => ({ transform: [{ rotate: `${-LEAF_TILT * (1 - open.value)}deg` }, { scale: grow.value }] }));
  const glow = useAnimatedStyle(() => ({ opacity: light.value }));
  const layer = { position: "absolute", width: size, height: size, transformOrigin: ORIGIN } as const;
  return (
    <View accessible={false} style={{ width: size, height: size }}>
      <Animated.View style={[layer, left]}>
        <Image source={LAYERS.left} style={{ width: size, height: size }} />
      </Animated.View>
      <Animated.View style={[layer, right]}>
        <Image source={LAYERS.right} style={{ width: size, height: size }} />
      </Animated.View>
      <Animated.View style={[layer, glow]}>
        <Image source={LAYERS.overlap} style={{ width: size, height: size }} />
      </Animated.View>
    </View>
  );
}
