import { View } from "react-native";
import { Switch } from "@/components/ui/Switch";
import { Txt } from "@/components/ui/Txt";
import { useT } from "@/i18n";
import { useTheme } from "@/theme/ThemeProvider";
import { gap, radius } from "@/theme/tokens";

/**
 * Required on the last step of every listing wizard (§30, App Review 5.2): the seller confirms they own the
 * work or have the rights to sell it, and accepts that infringing listings are taken down.
 */
export function OwnershipAttest({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const { c } = useTheme();
  const t = useT();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: gap.md, padding: gap.lg, borderRadius: radius.inset, backgroundColor: c.bgMuted }}>
      <Txt style={{ flex: 1 }}>{t("upload.original")}</Txt>
      <Switch label={t("upload.original")} value={value} onValueChange={onChange} />
    </View>
  );
}
