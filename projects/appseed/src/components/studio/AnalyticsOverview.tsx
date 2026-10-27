import { router } from "expo-router";
import { View } from "react-native";
import { useAnalytics } from "@/api/queries";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { NumberRoll } from "@/components/ui/NumberRoll";
import { PressableScale } from "@/components/ui/PressableScale";
import { Skeleton } from "@/components/ui/Skeleton";
import { Txt } from "@/components/ui/Txt";
import { useT } from "@/i18n";
import { totals, type Metric } from "@/lib/analytics";
import { formatCompact } from "@/lib/engagement";
import { useTheme } from "@/theme/ThemeProvider";
import { gap, radius } from "@/theme/tokens";
import { ChangeBadge, TILE_ICON } from "./Analytics";

const SHOWN: Metric[] = ["views", "likes", "shares"];

/** Studio summary: the last 7 days of views, likes and shares with their change, opening the full report. */
export function AnalyticsOverview() {
  const { c } = useTheme();
  const t = useT();
  const { data } = useAnalytics(7, null);
  if (!data) return <Skeleton height={168} radius={radius.card} />;
  const cur = totals(data.current);
  const prev = totals(data.previous);
  return (
    <PressableScale onPress={() => router.push("/studio/analytics")} accessibilityLabel={t("analytics.open")} hapticKind="tap">
      <Card style={{ gap: gap.lg }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: gap.sm }}>
          <Icon name="report" size={18} color={c.accent} active />
          <Txt variant="bodyStrong" style={{ flex: 1 }}>
            {t("analytics.title")}
          </Txt>
          <Txt variant="caption" tone="fgSubtle">
            {t("analytics.overview")}
          </Txt>
        </View>
        <View style={{ flexDirection: "row", gap: gap.md }}>
          {SHOWN.map((m) => (
            <View key={m} style={{ flex: 1, gap: gap.xs }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: gap.xs }}>
                <Icon name={TILE_ICON[m]} size={14} color={c.fgMuted} enter={false} />
                <Txt variant="caption" tone="fgMuted">
                  {t(`analytics.${m}`)}
                </Txt>
              </View>
              <NumberRoll value={cur[m]} variant="price" format={(n) => formatCompact(n, t.locale)} />
              <ChangeBadge curr={cur[m]} prev={prev[m]} />
            </View>
          ))}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: gap.md, paddingHorizontal: gap.md, borderRadius: radius.control, backgroundColor: c.bgMuted }}>
          <Txt variant="bodyStrong" tone="accent">
            {t("analytics.open")}
          </Txt>
          <Icon name="chevronRight" size={16} color={c.accent} motion="nudge" />
        </View>
      </Card>
    </PressableScale>
  );
}
