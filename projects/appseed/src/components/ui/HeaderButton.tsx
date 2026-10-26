import type { LucideIcon } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { PressableScale } from "./PressableScale";

type Props = { icon: LucideIcon; onPress: () => void; label: string; tone?: "fg" | "accent" | "danger"; filled?: boolean };

/** 40px round header button with a 44pt hit area (§6). */
export function HeaderButton({ icon: Icon, onPress, label, tone = "fg", filled }: Props) {
  const { c, soft } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      accessibilityLabel={label}
      hitSlop={2}
      scaleTo={0.92}
      style={[{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: c.bgElevated }, soft]}
    >
      <Icon size={19} color={c[tone]} strokeWidth={2.2} fill={filled ? c[tone] : "transparent"} />
    </PressableScale>
  );
}
