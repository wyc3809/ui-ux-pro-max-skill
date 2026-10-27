import { StyleSheet, View, type ViewStyle } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { gap, nested } from "@/theme/tokens";
import { BAR_RADIUS } from "./BottomBar";
import { PressableScale } from "./PressableScale";
import { Spinner } from "./Spinner";
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
      {loading ? <Spinner color={variant === "primary" ? c.accentFg : c.fg} /> : null}
      {!loading && icon ? <View>{icon}</View> : null}
      <Txt variant="bodyStrong" tone={fg}>
        {label}
      </Txt>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    // Concentric with the floating bar it usually sits in (24 outer, 8 inset).
    borderRadius: nested(BAR_RADIUS, gap.sm),
    paddingHorizontal: gap.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: gap.sm,
  },
});
