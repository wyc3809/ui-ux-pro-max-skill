import { useState } from "react";
import { View, type LayoutChangeEvent } from "react-native";
import Animated, { ReduceMotion, useAnimatedStyle, withTiming } from "react-native-reanimated";
import { haptic } from "@/lib/haptic";
import { useTheme } from "@/theme/ThemeProvider";
import { motion, radius } from "@/theme/tokens";
import { PressableScale } from "./PressableScale";
import { Txt } from "./Txt";

type Props<T extends string> = { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void };

/** A thumb glides under the labels with the tab curve; labels never jump. */
export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  const { c, isDark } = useTheme();
  const [w, setW] = useState(0);
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  const seg = w / options.length;
  const thumb = useAnimatedStyle(() => ({
    width: seg,
    transform: [{ translateX: withTiming(idx * seg, { duration: motion.tab.duration, easing: motion.tab.easing, reduceMotion: ReduceMotion.System }) }],
  }));
  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width - 6)}
      accessibilityRole="tablist"
      style={{ flexDirection: "row", backgroundColor: c.segmentTrack, borderRadius: radius.control + 2, padding: 3 }}
    >
      {w > 0 && (
        <Animated.View
          style={[
            { position: "absolute", top: 3, bottom: 3, left: 3, borderRadius: radius.control, backgroundColor: isDark ? c.bgMuted : c.bgElevated, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
            thumb,
          ]}
        />
      )}
      {options.map((o) => {
        const active = o.value === value;
        return (
          <PressableScale
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (!active) {
                haptic("selection");
                onChange(o.value);
              }
            }}
            scaleTo={0.96}
            style={{ flex: 1, height: 36, alignItems: "center", justifyContent: "center" }}
          >
            <Txt variant="bodyStrong" tone={active ? "fg" : "fgMuted"} numberOfLines={1}>
              {o.label}
            </Txt>
          </PressableScale>
        );
      })}
    </View>
  );
}
