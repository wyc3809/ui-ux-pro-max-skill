import { useEffect, useState } from "react";
import { Easing, ReduceMotion, useAnimatedReaction, useSharedValue, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { formatCount } from "@/lib/format";
import { motion } from "@/theme/tokens";
import { Txt, type TxtVariant } from "./Txt";

type Props = { value: number; prefix?: string; variant?: TxtVariant };

/** Counts up/down to a new value over 480ms with tabular digits so width stays put (§8). */
export function NumberRoll({ value, prefix = "", variant = "price" }: Props) {
  const v = useSharedValue(0);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    v.value = withTiming(value, { duration: motion.numberRoll, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System });
  }, [value, v]);
  useAnimatedReaction(
    () => Math.round(v.value),
    (n, prev) => {
      if (n !== prev) scheduleOnRN(setShown, n);
    },
  );
  return (
    <Txt variant={variant} tabular accessibilityLabel={`${prefix}${formatCount(value)}`}>
      {prefix}
      {formatCount(shown)}
    </Txt>
  );
}
