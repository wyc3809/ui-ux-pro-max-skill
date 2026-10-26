import { router } from "expo-router";
import { View } from "react-native";
import Animated, { Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HeaderButton } from "@/components/ui/HeaderButton";
import { Txt } from "@/components/ui/Txt";
import { useT } from "@/i18n";
import { useTheme } from "@/theme/ThemeProvider";
import { space } from "@/theme/tokens";

type Props = { title?: string; right?: React.ReactNode; bottom?: React.ReactNode; children: React.ReactNode };

/**
 * Pushed detail page: content scrolls under a floating header whose solid bar and title
 * fade in once the hero has scrolled away. `bottom` is a BottomBar / StickyCTA.
 */
export function DetailScaffold({ title, right, bottom, children }: Props) {
  const { c } = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const y = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    y.value = e.contentOffset.y;
  });
  const bar = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [120, 200], [0, 1], Extrapolation.CLAMP) }));
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: insets.top + 56, paddingBottom: (bottom ? 64 : 0) + insets.bottom + 32, paddingHorizontal: space.gutter, gap: 20 }}
      >
        {children}
      </Animated.ScrollView>
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, paddingTop: insets.top }}>
        <Animated.View style={[{ position: "absolute", inset: 0, backgroundColor: c.bg, borderBottomWidth: 1, borderBottomColor: c.border }, bar]} />
        <View style={{ height: 52, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: space.gutter }}>
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
