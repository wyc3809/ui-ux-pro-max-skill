import type { BottomTabBarProps } from "expo-router/js-tabs";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Compass, Library, PenTool, Search, UserRound, type LucideIcon } from "lucide-react-native";
import { useEffect } from "react";
import { Platform, View } from "react-native";
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PressableScale } from "@/components/ui/PressableScale";
import { Txt } from "@/components/ui/Txt";
import { useT, type TKey } from "@/i18n";
import { haptic } from "@/lib/haptic";
import { useUi } from "@/store/ui";
import { useTheme } from "@/theme/ThemeProvider";
import { motion } from "@/theme/tokens";

const TABS: Record<string, { icon: LucideIcon; label: TKey }> = {
  index: { icon: Compass, label: "tab.explore" },
  library: { icon: Library, label: "tab.library" },
  studio: { icon: PenTool, label: "tab.studio" },
  me: { icon: UserRound, label: "tab.me" },
};

export const TAB_BAR_HEIGHT = 60;

/** Custom tab bar (§6): blur, hairline, 1:1:72px:1:1 columns, a raised gradient search button in the middle. */
export function TabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const { c, isDark } = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const setTab = useUi((s) => s.setTab);

  const items = state.routes.map((route, index) => {
    const meta = TABS[route.name];
    if (!meta) return null;
    const focused = state.index === index;
    return (
      <TabItem
        key={route.key}
        icon={meta.icon}
        label={t(meta.label)}
        focused={focused}
        onPress={() => {
          const e = emitter.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!focused && !e.defaultPrevented) {
            haptic("selection");
            setTab(index);
            navigateToTab(route.key);
          }
        }}
      />
    );
  });

  const bar = (
    <View style={{ flexDirection: "row", height: TAB_BAR_HEIGHT, alignItems: "center" }}>
      {items.slice(0, 2)}
      <View style={{ width: 72, alignItems: "center" }}>
        <SearchFab label={t("a11y.search")} />
      </View>
      {items.slice(2)}
    </View>
  );

  return (
    <View
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        shadowColor: "#0f1412",
        shadowOpacity: isDark ? 0 : 0.06,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: -6 },
        elevation: 16,
      }}
    >
      <View style={{ height: 0.5, backgroundColor: c.border }} />
      {Platform.OS === "ios" ? (
        <BlurView intensity={60} tint={isDark ? "systemChromeMaterialDark" : "systemChromeMaterialLight"} style={{ paddingBottom: insets.bottom }}>
          {bar}
        </BlurView>
      ) : (
        // Android/web: a 94% opaque surface reads cleaner than a software blur.
        <View style={{ paddingBottom: insets.bottom, backgroundColor: isDark ? "rgba(20,24,22,0.94)" : "rgba(255,255,255,0.94)" }}>{bar}</View>
      )}
    </View>
  );
}

function TabItem({ icon: Icon, label, focused, onPress }: { icon: LucideIcon; label: string; focused: boolean; onPress: () => void }) {
  const { c } = useTheme();
  const s = useSharedValue(1);
  useEffect(() => {
    // Selected icon pops 1 → 1.18 → 1 on a spring (§8).
    if (focused) s.value = withSequence(withTiming(1.18, { duration: 110, reduceMotion: ReduceMotion.System }), withSpring(1, { ...motion.pop, reduceMotion: ReduceMotion.System }));
  }, [focused, s]);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  const color = focused ? c.accent : c.fgSubtle;
  return (
    <PressableScale onPress={onPress} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: focused }} scaleTo={0.92} style={{ flex: 1, height: TAB_BAR_HEIGHT, alignItems: "center", justifyContent: "center", gap: 3 }}>
      <Animated.View style={a}>
        <Icon size={23} color={color} strokeWidth={focused ? 2.4 : 2} />
      </Animated.View>
      <Txt variant="tabLabel" style={{ color }}>
        {label}
      </Txt>
    </PressableScale>
  );
}

/** 56px brand-gradient circle floating 22px above the bar with a 4px background ring (§6.2). */
function SearchFab({ label }: { label: string }) {
  const { c } = useTheme();
  return (
    <PressableScale
      onPress={() => {
        haptic("tap");
        router.push("/search");
      }}
      accessibilityLabel={label}
      scaleTo={0.95}
      style={{ marginTop: -22 - 4, width: 64, height: 64, borderRadius: 32, padding: 4, backgroundColor: c.bg }}
    >
      <LinearGradient
        colors={[c.accent, c.accentPressed]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1, borderRadius: 28, alignItems: "center", justifyContent: "center", shadowColor: c.accent, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8 }}
      >
        <Search size={24} color={c.accentFg} strokeWidth={2.6} />
      </LinearGradient>
    </PressableScale>
  );
}
