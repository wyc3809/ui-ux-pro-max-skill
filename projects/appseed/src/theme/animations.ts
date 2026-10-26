import {
  Keyframe,
  ZoomIn,
  FadeInLeft,
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutUp,
  LinearTransition,
  ReduceMotion,
} from "react-native-reanimated";
import { Platform } from "react-native";
import { staggerDelay } from "@/lib/motion";
import { motion } from "./tokens";

type StartValues = Parameters<typeof FadeInDown.withInitialValues>[0];

/**
 * Sets a custom start state on native only. Reanimated 4.7's web layer pins any entering animation
 * with custom keyframes (withInitialValues / Keyframe) to `position: absolute` about 5× its duration
 * after mount, which collapses the layout. On web the stock preset (same motion, default offset) is used.
 */
export function startFrom<T extends { withInitialValues: (v: StartValues) => T }>(builder: T, values: StartValues): T {
  return Platform.OS === "web" ? builder : builder.withInitialValues(values);
}

/**
 * Layout-animation presets built from motion tokens. Every preset honours the
 * OS "reduce motion" setting via ReduceMotion.System, so they become instant.
 */
export const enterAt = (index = 0) =>
  startFrom(FadeInDown.duration(motion.enter.duration).easing(motion.enter.easing).delay(staggerDelay(index, motion.stagger)), {
    opacity: 0,
    transform: [{ translateY: motion.enter.offset }],
  }).reduceMotion(ReduceMotion.System);

export const rowIn = startFrom(FadeInDown.duration(motion.rowIn.duration).easing(motion.rowIn.easing), {
  opacity: 0,
  transform: [{ translateY: 8 }],
}).reduceMotion(ReduceMotion.System);

export const rowOut = FadeOutUp.duration(motion.rowOut.duration).easing(motion.rowOut.easing).reduceMotion(ReduceMotion.System);

export const reorder = LinearTransition.duration(motion.rowIn.duration).easing(motion.rowIn.easing).reduceMotion(ReduceMotion.System);

export const crossfadeIn = FadeIn.duration(motion.crossfade).reduceMotion(ReduceMotion.System);
export const crossfadeOut = FadeOut.duration(motion.crossfade).reduceMotion(ReduceMotion.System);

/** A timeline connector drawing itself downward (pair with transformOrigin "top"). */
export const growDown = (delay = 0) =>
  Platform.OS === "web"
    ? FadeIn.duration(520).delay(delay).reduceMotion(ReduceMotion.System)
    : new Keyframe({ 0: { transform: [{ scaleY: 0 }] }, 100: { transform: [{ scaleY: 1 }], easing: motion.rowIn.easing } })
    .duration(520)
    .delay(delay)
    .reduceMotion(ReduceMotion.System);

/** Small elements (tags, dots, badges) popping in on a spring, staggered by index. */
export const popIn = (index = 0, step = 40) =>
  ZoomIn.springify().damping(13).stiffness(260).delay(index * step).reduceMotion(ReduceMotion.System);

/** List bullets / bars sliding in from the left, staggered by index. */
export const slideInAt = (index = 0, step = 60) =>
  startFrom(FadeInLeft.duration(motion.rowIn.duration).easing(motion.rowIn.easing).delay(index * step), {
    opacity: 0,
    transform: [{ translateX: -10 }],
  }).reduceMotion(ReduceMotion.System);
