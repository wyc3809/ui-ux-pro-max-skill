import { useState } from "react";
import { useTheme } from "@/theme/ThemeProvider";
import { Icon, type IconMotion, type IconName } from "./Icon";
import { PressableScale } from "./PressableScale";

type Props = { icon: IconName; onPress: () => void; label: string; tone?: "fg" | "accent" | "danger"; filled?: boolean; motion?: IconMotion };

/** 40px round header button with a 44pt hit area (§6). */
export function HeaderButton({ icon, onPress, label, tone = "fg", filled, motion = "pop" }: Props) {
  const { c, soft } = useTheme();
  const [taps, setTaps] = useState(0);
  return (
    <PressableScale
      onPress={() => {
        setTaps((n) => n + 1);
        onPress();
      }}
      accessibilityLabel={label}
      hitSlop={2}
      scaleTo={0.92}
      style={[{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: c.bgElevated }, soft]}
    >
      <Icon name={icon} size={20} color={c[tone]} active={filled} motion={motion} trigger={taps} />
    </PressableScale>
  );
}
