import { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/Button";
import { Txt } from "@/components/ui/Txt";
import { useT } from "@/i18n";
import { tabEnterOffset } from "@/lib/motion";
import { useTheme } from "@/theme/ThemeProvider";
import { motion, space } from "@/theme/tokens";

type Props = {
  step: number;
  total: number;
  titles: string[];
  onBack: () => void;
  onNext: () => void;
  nextLabel: string;
  shakeKey: number;
  children: React.ReactNode;
};

/**
 * Wizard chrome (§7): a progress bar that eases to the new fraction, step content that slides in
 * from the direction of travel, and a horizontal shake on the Next button when validation fails.
 */
export function UploadStepper({ step, total, titles, onBack, onNext, nextLabel, shakeKey, children }: Props) {
  const { c } = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const progress = useSharedValue((step + 1) / total);
  const x = useSharedValue(0);
  const o = useSharedValue(1);
  const shake = useSharedValue(0);
  const [prev, setPrev] = useState(step);

  useEffect(() => {
    progress.value = withTiming((step + 1) / total, { duration: 420, easing: motion.rowIn.easing, reduceMotion: ReduceMotion.System });
    if (prev !== step) {
      const cfg = { duration: motion.tab.duration, easing: motion.tab.easing, reduceMotion: ReduceMotion.System };
      x.value = tabEnterOffset(prev, step, 28);
      o.value = 0;
      x.value = withTiming(0, cfg);
      o.value = withTiming(1, cfg);
      setPrev(step);
    }
  }, [step, total, prev, progress, x, o]);

  useEffect(() => {
    if (shakeKey === 0) return;
    const d = { duration: 50, reduceMotion: ReduceMotion.System };
    shake.value = withSequence(withTiming(-8, d), withTiming(8, d), withTiming(-6, d), withTiming(6, d), withTiming(0, d));
  }, [shakeKey, shake]);

  const bar = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));
  const body = useAnimatedStyle(() => ({ flex: 1, opacity: o.value, transform: [{ translateX: x.value }] }));
  const next = useAnimatedStyle(() => ({ flex: 1.4, transform: [{ translateX: shake.value }] }));

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: space.gutter, gap: 8, paddingBottom: 16 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Txt variant="eyebrow" tone="fgSubtle">
            {t("upload.stepOf", { n: step + 1, total })}
          </Txt>
          <Txt variant="caption" tone="fgSubtle">
            {t("upload.draftSaved")}
          </Txt>
        </View>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: c.bgMuted, overflow: "hidden" }}>
          <Animated.View style={[{ height: 6, borderRadius: 3, backgroundColor: c.accent }, bar]} />
        </View>
        <Txt variant="heroTitle" style={{ marginTop: 8 }}>
          {titles[step]}
        </Txt>
      </View>
      <Animated.View style={body}>{children}</Animated.View>
      <View style={{ flexDirection: "row", gap: 12, paddingHorizontal: space.gutter, paddingTop: 12, paddingBottom: insets.bottom + 12, backgroundColor: c.bg }}>
        <Button label={t("common.back")} variant="secondary" onPress={onBack} disabled={step === 0} style={{ flex: 1 }} />
        <Animated.View style={next}>
          <Button label={nextLabel} onPress={onNext} />
        </Animated.View>
      </View>
    </View>
  );
}
