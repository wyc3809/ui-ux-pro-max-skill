import { useState } from "react";
import { Platform, RefreshControl, View } from "react-native";
import Animated, { Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFloatClearance } from "@/components/ui/BottomBar";
import { Glass } from "@/components/ui/Glass";
import { Txt } from "@/components/ui/Txt";
import { useTheme } from "@/theme/ThemeProvider";
import { gap, space } from "@/theme/tokens";

const HEADER = 52;

type Props = {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  onRefresh?: () => Promise<unknown>;
  bottomInset?: number;
};

/**
 * iOS large-title behaviour on every platform: the 30pt title shrinks and lifts as you scroll,
 * while a compact title and a glass bar fade in over the content scrolling beneath. Runs on the UI thread.
 */
export function LargeTitleScreen({ title, right, children, onRefresh, bottomInset }: Props) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const clearance = useFloatClearance();
  const top = insets.top + HEADER;
  // iOS insets the content (so pull to refresh appears below the glass bar); elsewhere it is padding.
  const inset = Platform.OS === "ios";
  const y = useSharedValue(0);
  const [refreshing, setRefreshing] = useState(false);
  const onScroll = useAnimatedScrollHandler((e) => {
    y.value = e.contentOffset.y + (inset ? top : 0);
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
  const glass = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [40, 60], [0, 1], Extrapolation.CLAMP) }));

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, paddingTop: insets.top, zIndex: 2 }}>
        <Animated.View pointerEvents="none" style={[{ position: "absolute", inset: 0 }, glass]}>
          <Glass style={{ flex: 1 }} />
        </Animated.View>
        <View style={{ height: HEADER, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", paddingHorizontal: space.gutter }}>
          <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, right: 0, alignItems: "center" }, compact]}>
            <Txt variant="section" style={{ fontSize: 16, lineHeight: 24 }}>
              {title}
            </Txt>
          </Animated.View>
          {right}
        </View>
      </View>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        contentInset={inset ? { top } : undefined}
        contentOffset={inset ? { x: 0, y: -top } : undefined}
        scrollIndicatorInsets={inset ? { top } : undefined}
        contentContainerStyle={{ paddingTop: inset ? 0 : top, paddingBottom: bottomInset != null ? bottomInset + insets.bottom : clearance }}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              tintColor={c.fgSubtle}
              progressViewOffset={top}
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
        <Animated.View style={[{ paddingHorizontal: space.gutter, paddingBottom: gap.lg, marginTop: -gap.sm, transformOrigin: "left center" }, big]}>
          <Txt variant="largeTitle" accessibilityRole="header">
            {title}
          </Txt>
        </Animated.View>
        {children}
      </Animated.ScrollView>
    </View>
  );
}
