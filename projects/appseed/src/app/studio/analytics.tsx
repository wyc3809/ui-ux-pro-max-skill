import { useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { useAnalytics, useStudio } from "@/api/queries";
import { findTemplate } from "@/api/mockServer";
import { DetailScaffold } from "@/components/shell/DetailScaffold";
import { FunnelList, ListingBreakdown, MetricTile, ShareTargets, SourceMix, TrendChart, useMetricFormat } from "@/components/studio/Analytics";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Reveal } from "@/components/ui/Reveal";
import { Section } from "@/components/ui/Section";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Skeleton } from "@/components/ui/Skeleton";
import { Txt } from "@/components/ui/Txt";
import { useT } from "@/i18n";
import { bucketize, funnel, percentages, rankListings, tileValue, totals, type Metric, type RangeDays, type TileMetric } from "@/lib/analytics";
import { gap, radius, space } from "@/theme/tokens";

const TILES: TileMetric[] = ["views", "likes", "shares", "bookmarks", "comments", "units", "proceeds", "conversion"];

/**
 * Creator analytics (§26), shaped like App Store Connect: pick a period and a listing, scan the headline
 * tiles with their change against the period before, tap a tile to chart it, then read the funnel, traffic
 * sources, share destinations and per listing split. Changing the period keeps the old report on screen
 * while the new one loads, so numbers roll to their new values instead of blanking.
 */
export default function AnalyticsScreen() {
  const t = useT();
  const fmt = useMetricFormat();
  const [range, setRange] = useState<RangeDays>(30);
  const [slug, setSlug] = useState<string | null>(null);
  const [metric, setMetric] = useState<TileMetric>("views");
  const { data: studio } = useStudio();
  const { data } = useAnalytics(range, slug);

  const live = (studio?.listings ?? []).filter((l) => l.status === "live");
  const cur = useMemo(() => (data ? totals(data.current) : null), [data]);
  const prev = useMemo(() => (data ? totals(data.previous) : null), [data]);
  // Conversion is a ratio, so its chart shows the units behind it.
  const chartMetric: Metric = metric === "conversion" ? "units" : metric;
  const buckets = useMemo(() => (data ? bucketize(data.current, chartMetric) : []), [data, chartMetric]);

  return (
    <DetailScaffold title={t("analytics.title")}>
      <Reveal>
        <Txt variant="largeTitle" accessibilityRole="header">
          {t("analytics.title")}
        </Txt>
      </Reveal>

      <Reveal index={1} style={{ gap: gap.md }}>
        <SegmentedControl
          options={[
            { value: "7", label: t("analytics.range7") },
            { value: "30", label: t("analytics.range30") },
            { value: "90", label: t("analytics.range90") },
          ]}
          value={String(range)}
          onChange={(v) => setRange(Number(v) as RangeDays)}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.gutter }} contentContainerStyle={{ gap: gap.sm, paddingHorizontal: space.gutter }}>
          <Chip label={t("analytics.all")} selected={slug === null} onPress={() => setSlug(null)} />
          {live.map((l) => (
            <Chip key={l.slug} label={findTemplate(l.slug)?.name ?? l.slug} selected={slug === l.slug} onPress={() => setSlug(l.slug)} />
          ))}
        </ScrollView>
      </Reveal>

      {!data || !cur || !prev ? (
        <View style={{ gap: gap.md }}>
          <Skeleton height={224} radius={radius.card} />
          <Skeleton height={240} radius={radius.card} />
        </View>
      ) : (
        <>
          <Reveal index={2} style={{ gap: gap.sm }}>
            {[0, 2, 4, 6].map((row) => (
              <View key={row} style={{ flexDirection: "row", gap: gap.sm }}>
                {TILES.slice(row, row + 2).map((m) => (
                  <MetricTile key={m} metric={m} value={tileValue(cur, m)} prev={tileValue(prev, m)} selected={metric === m} onPress={() => setMetric(m)} />
                ))}
              </View>
            ))}
            <Txt variant="caption" tone="fgSubtle">
              {t("analytics.vsPrev", { n: range })}
            </Txt>
          </Reveal>

          <Section title={t(`analytics.${metric}`)} index={2} inset={false} right={<Txt variant="caption" tone="fgSubtle">{range > 31 ? t("analytics.weekly") : t("analytics.daily")}</Txt>}>
            <Card style={{ gap: gap.md }}>
              <Txt variant="largeTitle" tabular>
                {fmt(metric, tileValue(cur, metric))}
              </Txt>
              <TrendChart buckets={buckets} metric={chartMetric} weekly={range > 31} />
              <Txt variant="caption" tone="fgSubtle">
                {t("analytics.tapBar")}
              </Txt>
            </Card>
          </Section>

          <Section title={t("analytics.funnelTitle")} index={2} inset={false}>
            <Card>
              <FunnelList steps={funnel(cur)} />
            </Card>
          </Section>

          <Section title={t("analytics.sourcesTitle")} index={2} inset={false}>
            <Card>
              <SourceMix counts={data.sources} pct={percentages(data.sources)} />
            </Card>
          </Section>

          <Section title={t("analytics.shareTargetsTitle")} index={2} inset={false}>
            <Card>
              <ShareTargets counts={data.shareTargets} />
            </Card>
          </Section>

          {slug === null && data.listings.length > 1 && (
            <Section title={t("analytics.byListing")} index={2} inset={false}>
              <Card>
                <ListingBreakdown rows={rankListings(data.listings, chartMetric)} metric={chartMetric} onOpen={(s) => setSlug(s)} />
              </Card>
            </Section>
          )}

          <Txt variant="caption" tone="fgSubtle">
            {t("analytics.privacy")}
          </Txt>
        </>
      )}
    </DetailScaffold>
  );
}
