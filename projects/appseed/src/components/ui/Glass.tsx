import { BlurView } from "expo-blur";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import type { ReactNode } from "react";
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";

type Props = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Corner radius; the specular edge follows it. */
  radius?: number;
  /** Lets iOS 26 Liquid Glass react to touches (buttons, tab bar). */
  interactive?: boolean;
  /** Tints the material, e.g. the accent for a primary glass button. */
  tint?: string;
};

const LIQUID = Platform.OS === "ios" && isLiquidGlassAvailable();

/**
 * The one glass material every floating surface uses (tab bar, header buttons, bottom bars, toast).
 * iOS 26: native Liquid Glass. Older iOS: system chrome blur. Web: backdrop-filter. Android: a near-opaque fill,
 * because software blur there costs frames for little gain. All of them share the same hairline specular edge.
 */
export function Glass({ children, style, radius = 0, interactive, tint }: Props) {
  const { c, isDark } = useTheme();
  const edge = { borderRadius: radius, borderWidth: StyleSheet.hairlineWidth, borderColor: c.glassEdge };
  const shape: ViewStyle = { borderRadius: radius, overflow: "hidden" };

  if (LIQUID) {
    return (
      <GlassView glassEffectStyle="regular" isInteractive={interactive} tintColor={tint} colorScheme={isDark ? "dark" : "light"} style={[shape, style]}>
        {children}
      </GlassView>
    );
  }
  if (Platform.OS === "ios") {
    return (
      <BlurView intensity={70} tint={isDark ? "systemChromeMaterialDark" : "systemChromeMaterialLight"} style={[shape, style]}>
        {tint ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: tint, opacity: 0.85 }]} /> : null}
        {children}
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, edge]} />
      </BlurView>
    );
  }
  const web = Platform.OS === "web" ? ({ backdropFilter: "blur(24px) saturate(180%)", WebkitBackdropFilter: "blur(24px) saturate(180%)" } as ViewStyle) : null;
  const fill = tint ?? (Platform.OS === "web" ? c.glass : isDark ? "rgba(39,39,39,0.96)" : "rgba(255,255,255,0.96)");
  return (
    <View style={[shape, { backgroundColor: fill }, web, style]}>
      {children}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, edge]} />
    </View>
  );
}

/** Soft floating shadow for glass in light mode; dark mode relies on the edge alone. */
export function useGlassShadow(): ViewStyle {
  const { isDark } = useTheme();
  return isDark
    ? {}
    : { shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 12 };
}
