/**
 * Creator analytics (docs/DESIGN.md §26), modelled on App Store Connect: totals for a period, change against
 * the period before it, conversion, traffic sources and a per-listing breakdown. Everything here is pure; the
 * server aggregates the raw events and never sends anything that identifies a single viewer.
 */

export const METRICS = ["views", "likes", "shares", "bookmarks", "comments", "units", "proceeds"] as const;
export type Metric = (typeof METRICS)[number];
/** The headline tiles add conversion, which is derived (units ÷ views), not summed. */
export type TileMetric = Metric | "conversion";

export type DayStat = { date: string } & Record<Metric, number>;

export const RANGES = [7, 30, 90] as const;
export type RangeDays = (typeof RANGES)[number];

export const SOURCES = ["explore", "search", "shareLink", "creatorPage", "external"] as const;
export type Source = (typeof SOURCES)[number];

export type ListingTotals = { slug: string; totals: Record<Metric, number> };

export type AnalyticsReport = {
  range: RangeDays;
  /** Oldest first, one entry per day, `range` long. */
  current: DayStat[];
  /** The `range` days before `current`, for the change badges. */
  previous: DayStat[];
  sources: Record<Source, number>;
  shareTargets: Record<"link" | "x" | "linkedin" | "threads" | "whatsapp" | "more", number>;
  listings: ListingTotals[];
};

export const emptyTotals = (): Record<Metric, number> => ({ views: 0, likes: 0, shares: 0, bookmarks: 0, comments: 0, units: 0, proceeds: 0 });

export function totals(days: DayStat[]): Record<Metric, number> {
  const t = emptyTotals();
  for (const d of days) for (const m of METRICS) t[m] += d[m];
  return t;
}

/** Units per view, as a percentage with one decimal. 0 when there were no views. */
export function conversion(units: number, views: number): number {
  return views > 0 ? Math.round((units / views) * 1000) / 10 : 0;
}

export function tileValue(t: Record<Metric, number>, metric: TileMetric): number {
  return metric === "conversion" ? conversion(t.units, t.views) : t[metric];
}

/**
 * Percentage change from `prev` to `curr`, rounded to a whole number. `null` when there is no baseline
 * (App Store Connect shows a dash rather than an infinite increase).
 */
export function change(curr: number, prev: number): number | null {
  if (prev <= 0) return null;
  return Math.round(((curr - prev) / prev) * 100);
}

/**
 * Chart buckets: daily for 7 and 30 days; weekly for 90 days so the bars stay tappable on a phone.
 * Each bucket keeps the date of its first day. Buckets are filled from the newest end, so a partial
 * bucket (if any) is the oldest one.
 */
export function bucketize(days: DayStat[], metric: Metric): { date: string; value: number }[] {
  const size = days.length > 31 ? 7 : 1;
  const out: { date: string; value: number }[] = [];
  for (let end = days.length; end > 0; end -= size) {
    const slice = days.slice(Math.max(0, end - size), end);
    out.unshift({ date: slice[0]!.date, value: slice.reduce((a, d) => a + d[metric], 0) });
  }
  return out;
}

export function average(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

/** Whole-number percentages that always add up to 100 (largest remainder), so a stacked bar never overflows. */
export function percentages<K extends string>(counts: Record<K, number>): Record<K, number> {
  const keys = Object.keys(counts) as K[];
  const sum = keys.reduce((a, k) => a + counts[k], 0);
  const out = Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;
  if (sum <= 0) return out;
  const raw = keys.map((k) => ({ k, exact: (counts[k] / sum) * 100 }));
  for (const r of raw) out[r.k] = Math.floor(r.exact);
  let left = 100 - raw.reduce((a, r) => a + Math.floor(r.exact), 0);
  for (const r of [...raw].sort((a, b) => b.exact - Math.floor(b.exact) - (a.exact - Math.floor(a.exact)))) {
    if (left-- <= 0) break;
    out[r.k] += 1;
  }
  return out;
}

/** Funnel steps from the period totals: views → engaged (liked or bookmarked) → units. Rates are of views. */
export function funnel(t: Record<Metric, number>) {
  const engaged = Math.min(t.views, t.likes + t.bookmarks);
  return [
    { key: "views" as const, value: t.views, rate: t.views > 0 ? 100 : 0 },
    { key: "engaged" as const, value: engaged, rate: conversion(engaged, t.views) },
    { key: "units" as const, value: t.units, rate: conversion(t.units, t.views) },
  ];
}

/** Listings sorted by the chosen metric, each with its share of the total for the breakdown bars. */
export function rankListings(listings: ListingTotals[], metric: Metric) {
  const sum = listings.reduce((a, l) => a + l.totals[metric], 0);
  return [...listings]
    .sort((a, b) => b.totals[metric] - a.totals[metric])
    .map((l) => ({ slug: l.slug, value: l.totals[metric], share: sum > 0 ? l.totals[metric] / sum : 0 }));
}
