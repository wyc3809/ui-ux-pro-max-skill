import { useEffect } from "react";
import { interpolateColor, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import Animated from "react-native-reanimated";
import { useTheme } from "@/theme/ThemeProvider";
import { radius } from "@/theme/tokens";
import { popIn } from "@/theme/animations";
import { PressableScale } from "./PressableScale";

type Props = { label: string; selected?: boolean; onPress?: () => void; trailing?: React.ReactNode };

/** Selectable chip. The fill cross-fades between muted and brand so selection feels continuous, not a flip. */
export function Chip({ label, selected = false, onPress, trailing }: Props) {
  const { c } = useTheme();
  const p = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    p.value = withTiming(selected ? 1 : 0, { duration: 200, reduceMotion: ReduceMotion.System });
  }, [selected, p]);
  const bg = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(p.value, [0, 1], [c.bgElevated, c.fg]) }));
  const fg = useAnimatedStyle(() => ({ color: interpolateColor(p.value, [0, 1], [c.fg, c.bg]) }));
  return (
    <PressableScale
      onPress={onPress}
      hapticKind="selection"
      accessibilityRole="button"
      accessibilityState={{ selected }}
      scaleTo={0.95}
      style={{ minHeight: 36, justifyContent: "center", borderRadius: radius.chip }}
    >
      <Animated.View style={[{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, height: 36, borderRadius: radius.chip, borderWidth: 1, borderColor: c.border }, bg]}>
        <Animated.Text maxFontSizeMultiplier={1.3} style={[{ fontFamily: "DMSans_600SemiBold", fontSize: 13 }, fg]}>
          {label}
        </Animated.Text>
        {trailing}
      </Animated.View>
    </PressableScale>
  );
}

/** Non-selectable tag (StackChips). */
export function Tag({ label, index = 0 }: { label: string; index?: number }) {
  const { c } = useTheme();
  return (
    <Animated.View entering={popIn(index)} style={{ paddingHorizontal: 10, height: 26, borderRadius: radius.chip, backgroundColor: c.bgMuted, justifyContent: "center" }}>
      <Animated.Text maxFontSizeMultiplier={1.3} style={{ fontFamily: "DMSans_600SemiBold", fontSize: 12, color: c.fgMuted }}>
        {label}
      </Animated.Text>
    </Animated.View>
  );
}
