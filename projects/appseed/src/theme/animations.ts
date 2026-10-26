import {
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutUp,
  LinearTransition,
  ReduceMotion,
} from "react-native-reanimated";
import { staggerDelay } from "@/lib/motion";
import { motion } from "./tokens";

/**
 * Layout-animation presets built from motion tokens. Every preset honours the
 * OS "reduce motion" setting via ReduceMotion.System, so they become instant.
 */
export const enterAt = (index = 0) =>
  FadeInDown.duration(motion.enter.duration)
    .easing(motion.enter.easing)
    .delay(staggerDelay(index, motion.stagger))
    .withInitialValues({ opacity: 0, transform: [{ translateY: motion.enter.offset }] })
    .reduceMotion(ReduceMotion.System);

export const rowIn = FadeInDown.duration(motion.rowIn.duration)
  .easing(motion.rowIn.easing)
  .withInitialValues({ opacity: 0, transform: [{ translateY: 8 }] })
  .reduceMotion(ReduceMotion.System);

export const rowOut = FadeOutUp.duration(motion.rowOut.duration).easing(motion.rowOut.easing).reduceMotion(ReduceMotion.System);

export const reorder = LinearTransition.duration(motion.rowIn.duration).easing(motion.rowIn.easing).reduceMotion(ReduceMotion.System);

export const crossfadeIn = FadeIn.duration(motion.crossfade).reduceMotion(ReduceMotion.System);
export const crossfadeOut = FadeOut.duration(motion.crossfade).reduceMotion(ReduceMotion.System);
