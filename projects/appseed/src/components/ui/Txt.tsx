import type { Ref } from "react";
import { Platform, StyleSheet, Text, type TextInstance, type TextProps, type TextStyle } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { type as typeScale, type Palette } from "@/theme/tokens";

export type TxtVariant = keyof typeof typeScale;
type Tone = keyof Pick<Palette, "fg" | "fgMuted" | "fgSubtle" | "accent" | "accentFg" | "price" | "danger" | "warn" | "live">;

type Props = TextProps & { ref?: Ref<TextInstance>; variant?: TxtVariant; tone?: Tone; style?: TextStyle | TextStyle[]; tabular?: boolean };

const WEIGHT: Record<string, TextStyle["fontWeight"]> = {
  Geist_400Regular: "400",
  Geist_500Medium: "500",
  Geist_600SemiBold: "600",
  Geist_700Bold: "700",
  GeistMono_400Regular: "400",
  GeistMono_700Bold: "700",
};

/** Typography primitive: type scale + token colour, capped at 1.4× Dynamic Type (§5). */
export function Txt({ variant = "body", tone = "fg", tabular, style, ...rest }: Props) {
  const { c } = useTheme();
  const merged = StyleSheet.flatten([typeScale[variant], { color: c[tone] }, tabular && { fontVariant: ["tabular-nums"] }, style]);
  // Chinese glyphs fall back to the system CJK font; on web that fallback needs an explicit weight to render bold.
  const webWeight = Platform.OS === "web" && merged?.fontFamily ? { fontWeight: WEIGHT[merged.fontFamily] } : null;
  return <Text maxFontSizeMultiplier={1.4} {...rest} style={[merged, webWeight]} />;
}
