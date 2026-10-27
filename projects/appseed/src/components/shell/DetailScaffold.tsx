import { router } from "expo-router";
import { View } from "react-native";
import Animated, { Extrapolation, interpolate, useAnimatedRef, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, type AnimatedRef } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFloatClearance } from "@/components/ui/BottomBar";
import { Glass } from "@/components/ui/Glass";
import { HeaderButton } from "@/components/ui/HeaderButton";
import { Txt } from "@/components/ui/Txt";
import { useT } from "@/i18n";
import { useTheme } from "@/theme/ThemeProvider";
import { gap, space } from "@/theme/tokens";

type Props = { title?: string; right?: React.ReactNode; bottom?: React.ReactNode; scrollRef?: AnimatedRef<Animated.ScrollView>; children: React.ReactNode };

/**
 * Pushed detail page: content scrolls under a floating header whose solid bar and title
 * fade in once the hero has scrolled away. The bar is the shared glass material, so the page stays visible
 * through it. `bottom` is a floating BottomBar / StickyCTA.
 */
export function DetailScaffold({ title, right, bottom, scrollRef, children }: Props) {
  const { c } = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const clearance = useFloatClearance();
  const ownRef = useAnimatedRef<Animated.ScrollView>();
  const y = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    y.value = e.contentOffset.y;
  });
  const bar = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [120, 200], [0, 1], Extrapolation.CLAMP) }));
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Animated.ScrollView
        ref={scrollRef ?? ownRef}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: insets.top + 56, paddingBottom: bottom ? clearance : insets.bottom + gap.xxl, paddingHorizontal: space.gutter, gap: gap.xl }}
      >
        {children}
      </Animated.ScrollView>
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, paddingTop: insets.top }}>
        <Animated.View pointerEvents="none" style={[{ position: "absolute", inset: 0 }, bar]}>
          <Glass style={{ flex: 1 }} />
        </Animated.View>
        <View style={{ height: 56, flexDirection: "row", alignItems: "center", gap: gap.md, paddingHorizontal: space.gutter }}>
          <HeaderButton icon="chevronLeft" motion="nudge" label={t("a11y.backBtn")} onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} />
          <Animated.View style={[{ flex: 1 }, bar]}>
            <Txt variant="section" numberOfLines={1} style={{ textAlign: "center" }}>
              {title}
            </Txt>
          </Animated.View>
          {right ?? <View style={{ width: 40 }} />}
        </View>
      </View>
      {bottom}
    </View>
  );
}
