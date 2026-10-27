import { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { findTemplate } from "@/api/mockServer";
import { Cover } from "@/components/template/Cover";
import { BrandIcon, Icon, type IconName } from "@/components/ui/Icon";
import { NumberRoll } from "@/components/ui/NumberRoll";
import { PressableScale } from "@/components/ui/PressableScale";
import { Txt } from "@/components/ui/Txt";
import { useT, type TKey } from "@/i18n";
import { average, change, type AnalyticsReport, type Metric, type Source, type TileMetric } from "@/lib/analytics";
import { formatCompact } from "@/lib/engagement";
import { formatShortDate } from "@/lib/format";
import { haptic } from "@/lib/haptic";
import { formatPrice } from "@/lib/price";
import { useTheme } from "@/theme/ThemeProvider";
import { curve, gap, nested, radius, type Palette } from "@/theme/tokens";

const RM = ReduceMotion.System;

export const TILE_ICON: Record<TileMetric, IconName> = {
  views: "eye",
  likes: "heart",
  shares: "share",
  bookmarks: "bookmark",
  comments: "comment",
  units: "download",
  proceeds: "cash",
  conversion: "funnel",
};

/** Formats a metric the way its tile and chart show it: money, a percentage, or a compact count. */
export function useMetricFormat() {
  const t = useT();
  return (metric: TileMetric, n: number) =>
    metric === "proceeds" ? formatPrice(n, "HKD", "HK$0") : metric === "conversion" ? `${n.toFixed(1)}%` : formatCompact(Math.round(n), t.locale);
}

/** ▲ 12% in green, ▼ 8% in red, or a dash when the earlier period had nothing to compare with. */
export function ChangeBadge({ curr, prev }: { curr: number; prev: number }) {
  const { c } = useTheme();
  const t = useT();
  const pct = change(curr, prev);
  if (pct == null) {
    return (
      <Txt variant="caption" tone="fgSubtle" accessibilityLabel={t("analytics.noBaseline")}>
        —
      </Txt>
    );
  }
  const up = pct >= 0;
  const color = up ? c.live : c.danger;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: gap.xxs }}>
      <Icon name={up ? "arrowUp" : "arrowDown"} size={12} color={color} motion="bounce" trigger={pct} />
      <Txt variant="caption" tabular style={{ color }}>
        {Math.abs(pct)}%
      </Txt>
    </View>
  );
}

/**
 * One headline number (App Store Connect's metric cards). Tapping selects it for the chart below; the
 * selected tile fills with the brand tint so the link between tile and chart is obvious.
 */
export function MetricTile({ metric, value, prev, selected, onPress }: { metric: TileMetric; value: number; prev: number; selected: boolean; onPress: () => void }) {
  const { c, card } = useTheme();
  const t = useT();
  const fmt = useMetricFormat();
  // NumberRoll counts whole numbers, so conversion rolls in tenths and is divided back for display.
  const scale = metric === "conversion" ? 10 : 1;
  return (
    <PressableScale
      onPress={() => {
        haptic("selection");
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${t(`analytics.${metric}`)} ${fmt(metric, value)}`}
      style={[{ flex: 1, minHeight: 96, padding: gap.md, gap: gap.xs, borderRadius: radius.inset, backgroundColor: selected ? c.accentSoft : c.bgElevated }, selected ? null : card]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: gap.xs }}>
        <Icon name={TILE_ICON[metric]} size={16} color={selected ? c.accent : c.fgMuted} active={selected} motion="pop" />
        <Txt variant="caption" tone={selected ? "accent" : "fgMuted"} numberOfLines={1} style={{ flex: 1 }}>
          {t(`analytics.${metric}`)}
        </Txt>
      </View>
      <NumberRoll value={Math.round(value * scale)} variant="price" format={(n) => fmt(metric, n / scale)} />
      <ChangeBadge curr={value} prev={prev} />
    </PressableScale>
  );
}

const CHART_H = 160;

/**
 * Bars for the selected metric with an average line. Tap a bar to read its exact value and date in the
 * callout above (no hover on a phone). Bars grow in a left-to-right wave whenever the range or metric changes.
 */
export function TrendChart({ buckets, metric, weekly }: { buckets: { date: string; value: number }[]; metric: Metric; weekly: boolean }) {
  const { c } = useTheme();
  const t = useT();
  const fmt = useMetricFormat();
  const [sel, setSel] = useState(buckets.length - 1);
  useEffect(() => setSel(buckets.length - 1), [buckets.length, metric]);
  const max = Math.max(1, ...buckets.map((b) => b.value));
  const avg = average(buckets.map((b) => b.value));
  const picked = buckets[Math.min(sel, buckets.length - 1)];
  const label = (d: string) => (weekly ? t("analytics.weekOf", { date: formatShortDate(d, t.locale) }) : formatShortDate(d, t.locale));
  return (
    <View style={{ gap: gap.md }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
        <Txt variant="caption" tone="fgSubtle">
          {picked ? label(picked.date) : ""}
        </Txt>
        <Txt variant="bodyStrong" tabular>
          {picked ? fmt(metric, picked.value) : ""}
        </Txt>
      </View>
      <View style={{ height: CHART_H }}>
        <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, bottom: (avg / max) * CHART_H, height: 1, backgroundColor: c.fgSubtle, opacity: 0.35 }} />
        <View style={{ flex: 1, flexDirection: "row", alignItems: "flex-end", gap: buckets.length > 14 ? gap.xxs : gap.xs }}>
          {buckets.map((b, i) => (
            <Bar key={`${metric}-${buckets.length}-${i}`} i={i} h={(b.value / max) * CHART_H} selected={i === sel} c={c} onPress={() => setSel(i)} label={`${label(b.date)} ${fmt(metric, b.value)}`} />
          ))}
        </View>
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Txt variant="caption" tone="fgSubtle">
          {buckets[0] ? formatShortDate(buckets[0].date, t.locale) : ""}
        </Txt>
        <Txt variant="caption" tone="fgSubtle">
          {t("analytics.average", { v: fmt(metric, avg) })}
        </Txt>
        <Txt variant="caption" tone="fgSubtle">
          {buckets.length ? formatShortDate(buckets[buckets.length - 1]!.date, t.locale) : ""}
        </Txt>
      </View>
    </View>
  );
}

function Bar({ i, h, selected, c, onPress, label }: { i: number; h: number; selected: boolean; c: Palette; onPress: () => void; label: string }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(i * 12, withTiming(1, { duration: 520, easing: curve.e, reduceMotion: RM }));
  }, [i, p]);
  const a = useAnimatedStyle(() => ({ height: Math.max(4, h * p.value) }));
  return (
    <PressableScale onPress={onPress} accessibilityLabel={label} accessibilityState={{ selected }} scaleTo={0.94} hitSlop={{ top: CHART_H }} style={{ flex: 1, height: "100%", justifyContent: "flex-end" }}>
      <Animated.View style={[{ borderRadius: radius.chip, backgroundColor: selected ? c.accent : c.accentSoft }, a]} />
    </PressableScale>
  );
}

/** A horizontal bar that grows to `fraction` of the track; used by the funnel, sources and breakdown lists. */
export function GrowBar({ fraction, color, delay = 0 }: { fraction: number; color: string; delay?: number }) {
  const { c } = useTheme();
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withTiming(Math.max(0, Math.min(1, fraction)), { duration: 600, easing: Easing.bezier(0.22, 1, 0.36, 1), reduceMotion: RM }));
  }, [fraction, delay, p]);
  const a = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));
  return (
    <View style={{ height: 8, borderRadius: radius.chip, backgroundColor: c.bgMuted, overflow: "hidden" }}>
      <Animated.View style={[{ height: 8, borderRadius: radius.chip, backgroundColor: color }, a]} />
    </View>
  );
}

const FUNNEL_LABEL = { views: "analytics.funnelViews", engaged: "analytics.funnelEngaged", units: "analytics.funnelUnits" } as const;

export function FunnelList({ steps }: { steps: { key: keyof typeof FUNNEL_LABEL; value: number; rate: number }[] }) {
  const { c } = useTheme();
  const t = useT();
  const max = Math.max(1, steps[0]?.value ?? 1);
  return (
    <View style={{ gap: gap.lg }}>
      {steps.map((s, i) => (
        <View key={s.key} style={{ gap: gap.sm }}>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: gap.sm }}>
            <Txt variant="bodyStrong" style={{ flex: 1 }}>
              {t(FUNNEL_LABEL[s.key])}
            </Txt>
            <Txt variant="bodyStrong" tabular>
              {formatCompact(s.value, t.locale)}
            </Txt>
          </View>
          <GrowBar fraction={s.value / max} color={i === 0 ? c.accent : i === 1 ? c.pending : c.live} delay={i * 120} />
          {i > 0 && (
            <Txt variant="caption" tone="fgSubtle" tabular>
              {t("analytics.ofViews", { p: s.rate.toFixed(1) })}
            </Txt>
          )}
        </View>
      ))}
    </View>
  );
}

const SOURCE_TONE: Record<Source, keyof Palette> = { explore: "accent", search: "pending", shareLink: "live", creatorPage: "warn", external: "fgSubtle" };

/** One stacked bar for the traffic mix, then a legend with share and count per source. */
export function SourceMix({ counts, pct }: { counts: AnalyticsReport["sources"]; pct: Record<Source, number> }) {
  const { c } = useTheme();
  const t = useT();
  const keys = Object.keys(counts) as Source[];
  return (
    <View style={{ gap: gap.lg }}>
      <View style={{ height: 12, flexDirection: "row", gap: gap.xxs, borderRadius: radius.chip, overflow: "hidden" }}>
        {keys.map((k, i) => (
          <Segment key={k} flex={pct[k]} color={c[SOURCE_TONE[k]]} delay={i * 80} />
        ))}
      </View>
      <View style={{ gap: gap.md }}>
        {keys.map((k) => (
          <View key={k} style={{ flexDirection: "row", alignItems: "center", gap: gap.sm }}>
            <View style={{ width: 8, height: 8, borderRadius: radius.chip, backgroundColor: c[SOURCE_TONE[k]] }} />
            <Txt style={{ flex: 1 }}>{t(`analytics.${k}`)}</Txt>
            <Txt variant="caption" tone="fgSubtle" tabular>
              {formatCompact(counts[k], t.locale)}
            </Txt>
            <Txt variant="bodyStrong" tabular style={{ width: 48, textAlign: "right" }}>
              {pct[k]}%
            </Txt>
          </View>
        ))}
      </View>
    </View>
  );
}

function Segment({ flex, color, delay }: { flex: number; color: string; delay: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withTiming(1, { duration: 500, easing: curve.e, reduceMotion: RM }));
  }, [delay, p]);
  const a = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ scaleY: 0.4 + p.value * 0.6 }] }));
  if (flex <= 0) return null;
  return <Animated.View style={[{ flex, backgroundColor: color }, a]} />;
}

type ShareKey = keyof AnalyticsReport["shareTargets"];
const SHARE_ROWS: { key: ShareKey; label?: TKey; brand?: "x" | "linkedin" | "threads" | "whatsapp"; icon?: IconName }[] = [
  { key: "link", label: "analytics.link", icon: "link" },
  { key: "whatsapp", brand: "whatsapp" },
  { key: "threads", brand: "threads" },
  { key: "x", brand: "x" },
  { key: "linkedin", brand: "linkedin" },
  { key: "more", label: "analytics.more", icon: "more" },
];
const BRAND_NAME = { whatsapp: "WhatsApp", threads: "Threads", x: "X", linkedin: "LinkedIn" } as const;

export function ShareTargets({ counts }: { counts: AnalyticsReport["shareTargets"] }) {
  const { c } = useTheme();
  const t = useT();
  const max = Math.max(1, ...Object.values(counts));
  const rows = [...SHARE_ROWS].sort((a, b) => counts[b.key] - counts[a.key]);
  return (
    <View style={{ gap: gap.md }}>
      {rows.map((r, i) => (
        <View key={r.key} style={{ flexDirection: "row", alignItems: "center", gap: gap.md }}>
          <View style={{ width: 32, height: 32, borderRadius: radius.control, backgroundColor: c.bgMuted, alignItems: "center", justifyContent: "center" }}>
            {r.brand ? <BrandIcon brand={r.brand} size={16} color={c.fg} /> : <Icon name={r.icon!} size={16} color={c.fg} />}
          </View>
          <View style={{ flex: 1, gap: gap.xs }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Txt>{r.brand ? BRAND_NAME[r.brand] : t(r.label!)}</Txt>
              <Txt variant="bodyStrong" tabular>
                {formatCompact(counts[r.key], t.locale)}
              </Txt>
            </View>
            <GrowBar fraction={counts[r.key] / max} color={c.accent} delay={i * 60} />
          </View>
        </View>
      ))}
    </View>
  );
}

/** Per listing breakdown for the selected metric: cover, name, value and its share of the total. */
export function ListingBreakdown({ rows, metric, onOpen }: { rows: { slug: string; value: number; share: number }[]; metric: Metric; onOpen: (slug: string) => void }) {
  const { c } = useTheme();
  const fmt = useMetricFormat();
  return (
    <View style={{ gap: gap.lg }}>
      {rows.map((r, i) => {
        const tpl = findTemplate(r.slug);
        if (!tpl) return null;
        return (
          <PressableScale key={r.slug} onPress={() => onOpen(r.slug)} accessibilityLabel={`${tpl.name} ${fmt(metric, r.value)}`} style={{ flexDirection: "row", alignItems: "center", gap: gap.md }}>
            <Cover t={tpl} style={{ width: 56 }} rounded={nested(radius.inset, gap.sm)} />
            <View style={{ flex: 1, gap: gap.xs }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: gap.sm }}>
                <Txt variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
                  {tpl.name}
                </Txt>
                <Txt variant="bodyStrong" tabular>
                  {fmt(metric, r.value)}
                </Txt>
              </View>
              <GrowBar fraction={r.share} color={c.accent} delay={i * 80} />
              <Txt variant="caption" tone="fgSubtle" tabular>
                {Math.round(r.share * 100)}%
              </Txt>
            </View>
          </PressableScale>
        );
      })}
    </View>
  );
}
