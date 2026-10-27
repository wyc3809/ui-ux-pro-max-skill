import { useEffect } from "react";
import { View } from "react-native";
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { Txt } from "@/components/ui/Txt";
import { useTheme } from "@/theme/ThemeProvider";

const H = 96;

/** 30-day bars that grow from the baseline in a left-to-right wave. Today's bar is brand-coloured. */
export function SalesChart({ data, label }: { data: number[]; label: string }) {
  const { c } = useTheme();
  const max = Math.max(1, ...data);
  const total = data.reduce((a, b) => a + b, 0);
  return (
    <View accessible accessibilityLabel={`${label}: ${total}`} style={{ gap: 12 }}>
      <View style={{ height: H, flexDirection: "row", alignItems: "flex-end", gap: 4 }}>
        {data.map((v, i) => (
          <Bar key={i} i={i} h={(v / max) * H} color={i === data.length - 1 ? c.accent : c.accentSoft} />
        ))}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Txt variant="caption" tone="fgSubtle">
          −30d
        </Txt>
        <Txt variant="caption" tone="fgSubtle">
          0d
        </Txt>
      </View>
    </View>
  );
}

function Bar({ i, h, color }: { i: number; h: number; color: string }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(i * 14, withTiming(1, { duration: 520, easing: Easing.bezier(0.16, 1, 0.3, 1), reduceMotion: ReduceMotion.System }));
  }, [i, p]);
  const a = useAnimatedStyle(() => ({ height: Math.max(3, h * p.value) }));
  return <Animated.View style={[{ flex: 1, borderRadius: 3, backgroundColor: color }, a]} />;
}
