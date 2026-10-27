import type { BottomTabBarProps } from "expo-router/js-tabs";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { FLOAT_BAR_HEIGHT, useFloatGap } from "@/components/ui/BottomBar";
import { Glass, useGlassShadow } from "@/components/ui/Glass";
import { Icon, type IconName } from "@/components/ui/Icon";
import { PressableScale } from "@/components/ui/PressableScale";
import { Txt } from "@/components/ui/Txt";
import { useT, type TKey } from "@/i18n";
import { haptic } from "@/lib/haptic";
import { useUi } from "@/store/ui";
import { useTheme } from "@/theme/ThemeProvider";
import { gap, motion } from "@/theme/tokens";

const TABS: Record<string, { icon: IconName; label: TKey }> = {
  index: { icon: "compass", label: "tab.explore" },
  library: { icon: "library", label: "tab.library" },
  studio: { icon: "pen", label: "tab.studio" },
  me: { icon: "user", label: "tab.me" },
};

export const TAB_BAR_HEIGHT = FLOAT_BAR_HEIGHT;
/** Inset of the selection pill inside the capsule; the pill radius is the capsule's minus this. */
const PILL_INSET = gap.xs;
const PILL_SPRING = { damping: 18, stiffness: 220, mass: 0.8, reduceMotion: ReduceMotion.System };

/**
 * Floating glass tab bar (§6, iOS 26 style): a capsule of four tabs with a selection pill that glides between
 * them like a drop of liquid, plus a separate glass search button. Content scrolls under both.
 */
export function TabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const { c, isDark } = useTheme();
  const t = useT();
  const bottom = useFloatGap();
  const shadow = useGlassShadow();
  const setTab = useUi((s) => s.setTab);
  const [width, setWidth] = useState(0);

  const routes = state.routes.filter((r) => TABS[r.name]);
  const selected = Math.max(0, routes.findIndex((r) => r.key === state.routes[state.index]?.key));
  const slot = routes.length ? (width - PILL_INSET * 2) / routes.length : 0;

  const x = useSharedValue(0);
  const stretch = useSharedValue(1);
  useEffect(() => {
    if (!slot) return;
    x.value = withSpring(selected * slot, PILL_SPRING);
    // The pill widens mid-flight and settles back, so it reads as liquid rather than a sliding block.
    stretch.value = withSequence(withTiming(1.18, { duration: 120, reduceMotion: ReduceMotion.System }), withSpring(1, PILL_SPRING));
  }, [selected, slot, x, stretch]);
  const pill = useAnimatedStyle(() => ({ width: slot, transform: [{ translateX: x.value }, { scaleX: stretch.value }] }));

  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: gap.lg, right: gap.lg, bottom, flexDirection: "row", gap: gap.md }}>
      <View style={[{ flex: 1, borderRadius: FLOAT_BAR_HEIGHT / 2 }, shadow]}>
        <Glass radius={FLOAT_BAR_HEIGHT / 2} interactive>
          <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height: FLOAT_BAR_HEIGHT, flexDirection: "row", alignItems: "center", paddingHorizontal: PILL_INSET }}>
            {slot > 0 && (
              <Animated.View
                pointerEvents="none"
                style={[
                  { position: "absolute", left: PILL_INSET, top: PILL_INSET, bottom: PILL_INSET, borderRadius: FLOAT_BAR_HEIGHT / 2 - PILL_INSET, backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)" },
                  pill,
                ]}
              />
            )}
            {routes.map((route, i) => {
              const meta = TABS[route.name]!;
              const focused = i === selected;
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
                      setTab(state.routes.indexOf(route));
                      navigateToTab(route.key);
                    }
                  }}
                />
              );
            })}
          </View>
        </Glass>
      </View>
      <SearchButton label={t("a11y.search")} tint={c.accent} fg={c.accentFg} shadow={shadow} />
    </View>
  );
}

function TabItem({ icon, label, focused, onPress }: { icon: IconName; label: string; focused: boolean; onPress: () => void }) {
  const { c } = useTheme();
  const s = useSharedValue(1);
  useEffect(() => {
    // Selected icon pops 1 → 1.18 → 1 on a spring (§8).
    if (focused) s.value = withSequence(withTiming(1.18, { duration: 110, reduceMotion: ReduceMotion.System }), withSpring(1, { ...motion.pop, reduceMotion: ReduceMotion.System }));
  }, [focused, s]);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  const color = focused ? c.accent : c.fgMuted;
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: focused }}
      scaleTo={0.92}
      style={{ flex: 1, height: FLOAT_BAR_HEIGHT - PILL_INSET * 2, alignItems: "center", justifyContent: "center", gap: gap.xxs }}
    >
      <Animated.View style={a}>
        {/* Outline → filled morph on selection, on top of the 1 → 1.18 → 1 pop. */}
        <Icon name={icon} size={24} color={color} active={focused} motion="none" />
      </Animated.View>
      <Txt variant="tabLabel" style={{ color }}>
        {label}
      </Txt>
    </PressableScale>
  );
}

/** Search sits apart from the tabs as its own accent-tinted glass circle, the way iOS 26 separates search. */
function SearchButton({ label, tint, fg, shadow }: { label: string; tint: string; fg: string; shadow: object }) {
  return (
    <PressableScale
      onPress={() => {
        haptic("tap");
        router.push("/search");
      }}
      accessibilityLabel={label}
      scaleTo={0.92}
      style={[{ width: FLOAT_BAR_HEIGHT, height: FLOAT_BAR_HEIGHT, borderRadius: FLOAT_BAR_HEIGHT / 2 }, shadow]}
    >
      <Glass radius={FLOAT_BAR_HEIGHT / 2} interactive tint={tint} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Icon name="search" size={24} color={fg} active enterDelay={200} />
      </Glass>
    </PressableScale>
  );
}
