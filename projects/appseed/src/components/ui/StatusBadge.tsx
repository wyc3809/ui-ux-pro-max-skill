import { useEffect, useRef } from "react";
import Animated, { interpolateColor, ReduceMotion, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useT } from "@/i18n";
import { statusTone, toneColors, type TemplateStatus } from "@/lib/status";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, font } from "@/theme/tokens";
import { Txt } from "./Txt";

export function StatusBadge({ status }: { status: TemplateStatus }) {
  const { c } = useTheme();
  const t = useT();
  const { fg, bg } = toneColors(statusTone(status), c);
  const label = t(`status.${status}`);
  // Pop in on mount; when the status changes, the background glides from the old tone to the new one.
  const prevBg = useRef(bg);
  const fromBg = useSharedValue(bg);
  const p = useSharedValue(1);
  const s = useSharedValue(0.6);
  useEffect(() => {
    s.value = withSpring(1, { damping: 12, stiffness: 240, reduceMotion: ReduceMotion.System });
  }, [s]);
  useEffect(() => {
    if (prevBg.current === bg) return;
    fromBg.value = prevBg.current;
    prevBg.current = bg;
    p.value = 0;
    p.value = withTiming(1, { duration: 320, reduceMotion: ReduceMotion.System });
    s.value = 0.85;
    s.value = withSpring(1, { damping: 10, stiffness: 260, reduceMotion: ReduceMotion.System });
  }, [bg, p, s, fromBg]);
  const a = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(p.value, [0, 1], [fromBg.value, bg]), transform: [{ scale: s.value }] }));
  return (
    <Animated.View accessible accessibilityLabel={label} style={[{ alignSelf: "flex-start", paddingHorizontal: 9, height: 22, justifyContent: "center", borderRadius: radius.chip }, a]}>
      <Txt style={{ fontSize: 12, lineHeight: 16, fontFamily: font.semibold, color: fg }}>{label}</Txt>
    </Animated.View>
  );
}
