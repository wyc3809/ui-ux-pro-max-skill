import { ActivityIndicator, StyleSheet, View, type ViewStyle } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { hit, radius } from "@/theme/tokens";
import { PressableScale } from "./PressableScale";
import { Txt } from "./Txt";

type Props = {
  label: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  accessibilityHint?: string;
};

export function Button({ label, onPress, variant = "primary", loading, disabled, icon, style, accessibilityHint }: Props) {
  const { c } = useTheme();
  const bg = { primary: c.accent, secondary: c.bgMuted, danger: c.danger, ghost: "transparent" }[variant];
  const fg = variant === "primary" ? "accentFg" : variant === "danger" ? "accentFg" : variant === "ghost" ? "accent" : "fg";
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      hapticKind="tap"
      style={[styles.base, { backgroundColor: bg, opacity: disabled ? 0.45 : 1 }, style]}
    >
      {loading ? <ActivityIndicator color={variant === "primary" ? c.accentFg : c.fg} /> : null}
      {!loading && icon ? <View>{icon}</View> : null}
      <Txt variant="bodyStrong" tone={fg} style={{ fontSize: 15 }}>
        {label}
      </Txt>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: hit + 4,
    borderRadius: radius.control + 2,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
});
