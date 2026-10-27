import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Pressable, ScrollView, View } from "react-native";
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useTheme } from "@/theme/ThemeProvider";
import { motion, radius, space, font } from "@/theme/tokens";
import type { SheetProps } from "./Sheet";
import { useSheetDepth } from "@/store/ui";
import { Txt } from "./Txt";

/**
 * Web counterpart of Sheet.tsx with the same props, tokens and 320ms sheet curve.
 * Closes on backdrop click and Escape. On wide screens it floats as a centred card.
 * Portaled to <body>: the page behind recedes with a transform, which would otherwise trap `position: fixed`.
 */
export function Sheet({ open, onClose, title, footer, children }: SheetProps) {
  const { c } = useTheme();
  useSheetDepth(open);
  const [mounted, setMounted] = useState(open);
  const p = useSharedValue(0);

  useEffect(() => {
    const cfg = { duration: motion.sheet.duration, easing: motion.sheet.easing, reduceMotion: ReduceMotion.System };
    if (open) {
      setMounted(true);
      p.value = withTiming(1, cfg);
    } else {
      p.value = withTiming(0, cfg, (done) => {
        if (done) scheduleOnRN(setMounted, false);
      });
    }
  }, [open, p]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const backdrop = useAnimatedStyle(() => ({ opacity: p.value }));
  const panel = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - p.value) * 480 }] }));

  if (!mounted) return null;
  return createPortal(
    <View style={{ position: "fixed" as "absolute", inset: 0, zIndex: 50, justifyContent: "flex-end", alignItems: "center" }}>
      <Animated.View style={[{ position: "absolute", inset: 0, backgroundColor: c.overlay }, backdrop]}>
        <Pressable accessibilityLabel="close" onPress={onClose} style={{ flex: 1 }} />
      </Animated.View>
      <Animated.View
        accessibilityViewIsModal
        style={[{ width: "100%", maxWidth: 560, maxHeight: "85%", backgroundColor: c.bgElevated, borderTopLeftRadius: radius.hero, borderTopRightRadius: radius.hero, paddingTop: 8 }, panel]}
      >
        <View style={{ alignSelf: "center", width: 36, height: 4, borderRadius: 2, backgroundColor: c.fgSubtle, opacity: 0.4, marginBottom: 8 }} />
        {title ? (
          <View style={{ paddingHorizontal: space.gutter + 8, paddingBottom: 12 }}>
            <Txt variant="section" accessibilityRole="header" style={{ fontFamily: font.bold }}>
              {title}
            </Txt>
          </View>
        ) : null}
        <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingHorizontal: space.gutter + 8, paddingBottom: footer ? 12 : 24, gap: 12 }}>
          {children}
        </ScrollView>
        {footer ? <View style={{ paddingHorizontal: space.gutter + 8, paddingTop: 12, paddingBottom: 16, gap: 12 }}>{footer}</View> : null}
      </Animated.View>
    </View>,
    document.body,
  );
}
