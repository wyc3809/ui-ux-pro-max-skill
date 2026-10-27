import { useEffect } from "react";
import { View } from "react-native";
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
import { useT } from "@/i18n";
import { startFrom } from "@/theme/animations";
import { useTheme } from "@/theme/ThemeProvider";
import { gap, motion, nested } from "@/theme/tokens";
import { BAR_RADIUS, BottomBar } from "./BottomBar";
import { Icon, type IconName } from "./Icon";
import { PressableScale } from "./PressableScale";
import { PriceTag } from "./PriceTag";
import { Spinner } from "./Spinner";
import { Txt } from "./Txt";

export type CtaPhase = "buy" | "processing" | "success" | "send" | "unavailable";

/** `owned` overrides the label/icon of the owned state (templates: send to computer; prompts: copy). */
type Props = { phase: CtaPhase; price: number; onBuy: () => void; onSend: () => void; reason?: string; owned?: { label: string; icon: IconName } };

const swap = {
  in: startFrom(FadeInDown.duration(220), { opacity: 0, transform: [{ translateY: 8 }] }).reduceMotion(ReduceMotion.System),
  out: FadeOutUp.duration(160).reduceMotion(ReduceMotion.System),
};

/**
 * Bottom-pinned purchase bar (§6.5, §7). The purchase moment is the hero animation:
 * the button melts from brand purple into `live` green over 600ms, the label lifts away
 * and a check springs in; then it settles into "send to computer".
 */
export function StickyCTA({ phase, price, onBuy, onSend, reason, owned }: Props) {
  const { c, isDark } = useTheme();
  const t = useT();
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
    phase === "buy" ? (price === 0 ? t("cta.getFree") : t("cta.buy")) : phase === "processing" ? t("cta.processing") : phase === "success" ? t("common.purchased") : phase === "send" ? owned?.label ?? t("cta.send") : t("cta.unavailable");
  const fg = phase === "success" && !isDark ? "#ffffff" : c.accentFg;

  return (
    <BottomBar>
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
        <Animated.View style={[{ height: 48, borderRadius: nested(BAR_RADIUS, gap.sm), alignItems: "center", justifyContent: "center", overflow: "hidden", opacity: phase === "unavailable" ? 0.45 : 1 }, btn]}>
          <Animated.View key={phase} entering={swap.in} exiting={swap.out} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {phase === "processing" && <Spinner color={c.accentFg} />}
            {phase === "success" && (
              <Animated.View entering={ZoomIn.springify().damping(10).stiffness(260).reduceMotion(ReduceMotion.System)}>
                <Icon name="checkCircle" size={21} color={fg} active enterDelay={80} />
              </Animated.View>
            )}
            {phase === "send" && <Icon name={owned?.icon ?? "laptop"} size={19} color={c.accentFg} active motion="bounce" enterDelay={120} />}
            <Txt variant="bodyStrong" style={{ color: fg }}>
              {label}
            </Txt>
          </Animated.View>
        </Animated.View>
      </PressableScale>
    </BottomBar>
  );
}
