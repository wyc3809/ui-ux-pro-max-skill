import { View } from "react-native";
import { useT } from "@/i18n";
import { statusTone, toneColors, type TemplateStatus } from "@/lib/status";
import { useTheme } from "@/theme/ThemeProvider";
import { radius } from "@/theme/tokens";
import { Txt } from "./Txt";

export function StatusBadge({ status }: { status: TemplateStatus }) {
  const { c } = useTheme();
  const t = useT();
  const { fg, bg } = toneColors(statusTone(status), c);
  const label = t(`status.${status}`);
  return (
    <View accessible accessibilityLabel={label} style={{ alignSelf: "flex-start", paddingHorizontal: 9, height: 22, justifyContent: "center", borderRadius: radius.chip, backgroundColor: bg }}>
      <Txt style={{ fontSize: 11, fontFamily: "DMSans_700Bold", color: fg }}>{label}</Txt>
    </View>
  );
}
