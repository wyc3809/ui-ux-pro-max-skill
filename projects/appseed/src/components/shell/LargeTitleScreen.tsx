import { useState } from "react";
import { RefreshControl, View } from "react-native";
import Animated, { Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Txt } from "@/components/ui/Txt";
import { useTheme } from "@/theme/ThemeProvider";
import { space } from "@/theme/tokens";
import { TAB_BAR_HEIGHT } from "./TabBar";

type Props = {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  onRefresh?: () => Promise<unknown>;
  bottomInset?: number;
};

/**
 * iOS large-title behaviour on every platform: the 30pt title shrinks and lifts as you scroll,
 * while a compact title + hairline fade into the pinned bar. Runs entirely on the UI thread.
 */
export function LargeTitleScreen({ title, right, children, onRefresh, bottomInset }: Props) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const y = useSharedValue(0);
  const [refreshing, setRefreshing] = useState(false);
  const onScroll = useAnimatedScrollHandler((e) => {
    y.value = e.contentOffset.y;
  });
  const big = useAnimatedStyle(() => ({
    opacity: interpolate(y.value, [0, 36], [1, 0], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(y.value, [-80, 0], [12, 0], Extrapolation.CLAMP) },
      { scale: interpolate(y.value, [-100, 0, 40], [1.06, 1, 0.94], Extrapolation.CLAMP) },
    ],
  }));
  const compact = useAnimatedStyle(() => ({
    opacity: interpolate(y.value, [28, 52], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(y.value, [28, 52], [6, 0], Extrapolation.CLAMP) }],
  }));
  const hairline = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [40, 60], [0, 1], Extrapolation.CLAMP) }));

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ paddingTop: insets.top, backgroundColor: c.bg, zIndex: 2 }}>
        <View style={{ height: 52, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", paddingHorizontal: space.gutter }}>
          <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, right: 0, alignItems: "center" }, compact]}>
            <Txt variant="section" style={{ fontSize: 16, lineHeight: 24 }}>
              {title}
            </Txt>
          </Animated.View>
          {right}
        </View>
        <Animated.View style={[{ height: 1, backgroundColor: c.border }, hairline]} />
      </View>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingBottom: (bottomInset ?? TAB_BAR_HEIGHT + 32) + insets.bottom }}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              tintColor={c.fgSubtle}
              colors={[c.accent]}
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await onRefresh().finally(() => setRefreshing(false));
              }}
            />
          ) : undefined
        }
      >
        <Animated.View style={[{ paddingHorizontal: space.gutter, paddingBottom: 14, marginTop: -8, transformOrigin: "left center" }, big]}>
          <Txt variant="largeTitle" accessibilityRole="header">
            {title}
          </Txt>
        </Animated.View>
        {children}
      </Animated.ScrollView>
    </View>
  );
}
