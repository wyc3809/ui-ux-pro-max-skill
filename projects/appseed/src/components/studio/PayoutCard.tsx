import { useState } from "react";
import { View } from "react-native";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { NumberRoll } from "@/components/ui/NumberRoll";
import { PressableScale } from "@/components/ui/PressableScale";
import { Txt } from "@/components/ui/Txt";
import { useT } from "@/i18n";
import { formatDate } from "@/lib/format";
import { useTheme } from "@/theme/ThemeProvider";

export function PayoutCard({ amount, next }: { amount: number; next: string }) {
  const { c } = useTheme();
  const t = useT();
  const [taps, setTaps] = useState(0);
  return (
    <Card style={{ gap: 6 }}>
      <Txt variant="eyebrow" tone="fgSubtle">
        {t("studio.payoutAvailable")}
      </Txt>
      <NumberRoll value={amount} prefix="HK$" variant="largeTitle" />
      <Txt variant="caption" tone="fgSubtle">
        {t("studio.payoutNext", { date: formatDate(next, t.locale) })}
      </Txt>
      <View style={{ height: 1, backgroundColor: c.border, marginVertical: 8 }} />
      <PressableScale onPress={() => setTaps((n) => n + 1)} scaleTo={0.98} style={{ flexDirection: "row", alignItems: "center", minHeight: 36 }}>
        <Txt variant="bodyStrong" tone="accent" style={{ flex: 1 }}>
          {t("studio.payoutHistory")}
        </Txt>
        <Icon name="chevronRight" size={18} color={c.accent} motion="nudge" trigger={taps} />
      </PressableScale>
    </Card>
  );
}
