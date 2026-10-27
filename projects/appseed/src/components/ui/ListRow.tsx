import { useState } from "react";
import { View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { hit, radius, space } from "@/theme/tokens";
import { Icon, type IconName } from "./Icon";
import { PressableScale } from "./PressableScale";
import { Txt } from "./Txt";

type Props = {
  icon?: IconName;
  title: string;
  detail?: string;
  value?: string;
  trailing?: React.ReactNode;
  onPress?: () => void;
  danger?: boolean;
  chevron?: boolean;
};

/** Whole row is tappable (§11.1). */
export function ListRow({ icon, title, detail, value, trailing, onPress, danger, chevron = !!onPress }: Props) {
  const { c } = useTheme();
  const [taps, setTaps] = useState(0);
  const body = (
    <View style={{ minHeight: hit + 8, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: space.rowPadX, paddingVertical: space.rowPadY }}>
      {icon ? (
        <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: danger ? c.dangerSoft : c.bgMuted, alignItems: "center", justifyContent: "center" }}>
          <Icon name={icon} size={17} color={danger ? c.danger : c.fg} active={taps > 0} motion={danger ? "wiggle" : "pop"} trigger={taps} />
        </View>
      ) : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="bodyStrong" tone={danger ? "danger" : "fg"}>
          {title}
        </Txt>
        {detail ? (
          <Txt variant="caption" tone="fgSubtle">
            {detail}
          </Txt>
        ) : null}
      </View>
      {value ? <Txt tone="fgMuted">{value}</Txt> : null}
      {trailing}
      {chevron ? <Icon name="chevronRight" size={17} color={c.fgSubtle} motion="nudge" trigger={taps} enter={false} /> : null}
    </View>
  );
  if (!onPress) return body;
  return (
    <PressableScale
      onPress={() => {
        setTaps((n) => n + 1);
        onPress();
      }}
      scaleTo={0.985} hapticKind="selection" accessibilityLabel={title} style={{ borderRadius: radius.row }}>
      {body}
    </PressableScale>
  );
}

export function RowDivider() {
  const { c } = useTheme();
  return <View style={{ height: 1, backgroundColor: c.border, marginLeft: space.rowPadX + 44 }} />;
}
