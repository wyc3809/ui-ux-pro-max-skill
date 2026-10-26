import { Check, Laptop } from "lucide-react-native";
import { useEffect } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import Animated, {
  FadeInDown,
  FadeOutUp,
  interpolateColor,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useT } from "@/i18n";
import { useTheme } from "@/theme/ThemeProvider";
import { motion, radius, space } from "@/theme/tokens";
import { PressableScale } from "./PressableScale";
import { PriceTag } from "./PriceTag";
import { Txt } from "./Txt";

export type CtaPhase = "buy" | "processing" | "success" | "send" | "unavailable";

type Props = { phase: CtaPhase; price: number; onBuy: () => void; onSend: () => void; reason?: string };

const swap = {
  in: FadeInDown.duration(220).withInitialValues({ opacity: 0, transform: [{ translateY: 8 }] }).reduceMotion(ReduceMotion.System),
  out: FadeOutUp.duration(160).reduceMotion(ReduceMotion.System),
};

/**
 * Bottom-pinned purchase bar (§6.5, §7). The purchase moment is the hero animation:
 * the button melts from brand purple into `live` green over 600ms, the label lifts away
 * and a check springs in; then it settles into "send to computer".
 */
export function StickyCTA({ phase, price, onBuy, onSend, reason }: Props) {
  const { c, isDark } = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const p = useSharedValue(phase === "success" ? 1 : 0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    const cfg = { duration: motion.purchase.duration, easing: motion.enter.easing, reduceMotion: ReduceMotion.System };
    p.value = withTiming(phase === "success" ? 1 : 0, cfg);
    if (phase === "success") {
      pulse.value = withSequence(withTiming(1.04, { duration: 160 }), withSpring(1, { ...motion.pop, reduceMotion: ReduceMotion.System }));
    }
  }, [phase, p, pulse]);

  const btn = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(p.value, [0, 1], [c.accent, c.live]),
    transform: [{ scale: pulse.value }],
  }));

  const label =
    phase === "buy" ? (price === 0 ? t("cta.getFree") : t("cta.buy")) : phase === "processing" ? t("cta.processing") : phase === "success" ? t("common.purchased") : phase === "send" ? t("cta.send") : t("cta.unavailable");
  const fg = phase === "success" && !isDark ? "#ffffff" : c.accentFg;

  return (
    <View
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        paddingBottom: insets.bottom,
        paddingHorizontal: space.gutter,
        backgroundColor: c.bgElevated,
        borderTopWidth: Platform.OS === "web" ? 1 : 0.5,
        borderTopColor: c.border,
        shadowColor: "#0f1412",
        shadowOpacity: isDark ? 0 : 0.08,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: -6 },
        elevation: 12,
      }}
    >
      <View style={{ height: 64, flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ flex: 1 }}>
          {phase === "unavailable" && reason ? (
            <Txt variant="caption" tone="fgSubtle" numberOfLines={2}>
              {reason}
            </Txt>
          ) : (
            <PriceTag amount={price} owned={phase === "send" || phase === "success"} />
          )}
        </View>
        <PressableScale
          onPress={phase === "buy" ? onBuy : phase === "send" ? onSend : undefined}
          disabled={phase === "processing" || phase === "success" || phase === "unavailable"}
          accessibilityLabel={label}
          accessibilityState={{ busy: phase === "processing", disabled: phase === "unavailable" }}
          hapticKind="tap"
          style={{ width: "60%" }}
        >
          <Animated.View style={[{ height: 48, borderRadius: radius.control + 2, alignItems: "center", justifyContent: "center", overflow: "hidden", opacity: phase === "unavailable" ? 0.45 : 1 }, btn]}>
            <Animated.View key={phase} entering={swap.in} exiting={swap.out} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {phase === "processing" && <ActivityIndicator color={c.accentFg} size="small" />}
              {phase === "success" && (
                <Animated.View entering={ZoomIn.springify().damping(10).stiffness(260).reduceMotion(ReduceMotion.System)}>
                  <Check size={20} color={fg} strokeWidth={3} />
                </Animated.View>
              )}
              {phase === "send" && <Laptop size={18} color={c.accentFg} strokeWidth={2.2} />}
              <Txt variant="bodyStrong" style={{ color: fg, fontSize: 15 }}>
                {label}
              </Txt>
            </Animated.View>
          </Animated.View>
        </PressableScale>
      </View>
    </View>
  );
}
