import { useState } from "react";
import { useTheme } from "@/theme/ThemeProvider";
import { Glass, useGlassShadow } from "./Glass";
import { Icon, type IconMotion, type IconName } from "./Icon";
import { PressableScale } from "./PressableScale";

type Props = { icon: IconName; onPress: () => void; label: string; tone?: "fg" | "accent" | "danger"; filled?: boolean; motion?: IconMotion };

/** 40px round glass header button with a 44pt hit area (§6). Floats over content like the tab bar. */
export function HeaderButton({ icon, onPress, label, tone = "fg", filled, motion = "pop" }: Props) {
  const { c } = useTheme();
  const shadow = useGlassShadow();
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
      style={[{ width: 40, height: 40, borderRadius: 20 }, shadow]}
    >
      <Glass radius={20} interactive style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={20} color={c[tone]} active={filled} motion={motion} trigger={taps} />
      </Glass>
    </PressableScale>
  );
}
