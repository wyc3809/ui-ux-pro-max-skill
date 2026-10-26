import { useState } from "react";
import { View, type LayoutChangeEvent } from "react-native";
import Animated, { Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, type SharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import type { Template } from "@/api/types";
import { useT } from "@/i18n";
import { haptic } from "@/lib/haptic";
import { useTheme } from "@/theme/ThemeProvider";
import { radius } from "@/theme/tokens";
import { Cover } from "./Cover";

/** Paged screenshots. Each page subtly scales/fades with scroll; the active dot stretches into a pill. */
export function MediaCarousel({ t }: { t: Template }) {
  const tr = useT();
  const [w, setW] = useState(0);
  const x = useSharedValue(0);
  const page = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    x.value = e.contentOffset.x;
    if (w > 0) {
      const p = Math.round(e.contentOffset.x / w);
      if (p !== page.value) {
        page.value = p;
        scheduleOnRN(haptic, "selection");
      }
    }
  });
  const screens = Array.from({ length: t.screens }, (_, i) => i);
  return (
    <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)} style={{ gap: 10 }}>
      {w > 0 && (
        <Animated.ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={16} style={{ borderRadius: radius.media }}>
          {screens.map((i) => (
            <Page key={i} i={i} w={w} x={x} label={tr("a11y.media", { i: i + 1, n: t.screens })}>
              <Cover t={t} screen={i} />
            </Page>
          ))}
        </Animated.ScrollView>
      )}
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 6 }}>
        {screens.map((i) => (
          <Dot key={i} i={i} w={w} x={x} />
        ))}
      </View>
    </View>
  );
}

function Page({ i, w, x, label, children }: { i: number; w: number; x: SharedValue<number>; label: string; children: React.ReactNode }) {
  const a = useAnimatedStyle(() => {
    const d = (x.value - i * w) / w;
    return { opacity: interpolate(Math.abs(d), [0, 1], [1, 0.6], Extrapolation.CLAMP), transform: [{ scale: interpolate(Math.abs(d), [0, 1], [1, 0.94], Extrapolation.CLAMP) }] };
  });
  return (
    <Animated.View accessible accessibilityLabel={label} style={[{ width: w }, a]}>
      {children}
    </Animated.View>
  );
}

function Dot({ i, w, x }: { i: number; w: number; x: SharedValue<number> }) {
  const { c } = useTheme();
  const a = useAnimatedStyle(() => {
    const d = w > 0 ? Math.abs(x.value / w - i) : i === 0 ? 0 : 1;
    return {
      width: interpolate(d, [0, 1], [18, 6], Extrapolation.CLAMP),
      opacity: interpolate(d, [0, 1], [1, 0.35], Extrapolation.CLAMP),
    };
  });
  return <Animated.View style={[{ height: 6, borderRadius: 3, backgroundColor: c.fg }, a]} />;
}
