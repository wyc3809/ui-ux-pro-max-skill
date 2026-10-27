import { emptyTotals, METRICS, totals, type AnalyticsReport, type DayStat, type RangeDays } from "@/lib/analytics";

/**
 * Fictional analytics for the demo creator's live listings. Values are a pure function of
 * (listing, calendar day), so the same day always shows the same numbers and screenshots stay stable.
 */
const PROFILES: Record<string, { views: number; price: number; trend: number }> = {
  "pocket-ledger": { views: 180, price: 158, trend: 0.006 },
  "habit-seed": { views: 260, price: 0, trend: 0.003 },
};

const DAY = 86_400_000;
const EPOCH = Date.UTC(2026, 0, 1);

/** Small deterministic noise in [0, 1). */
function noise(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function hash(s: string) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(h);
}

function dayStat(slug: string, dayIndex: number): DayStat {
  const p = PROFILES[slug]!;
  const n = (k: number) => noise(hash(slug) + dayIndex * 7 + k);
  const weekday = new Date(EPOCH + dayIndex * DAY).getUTCDay();
  const weekend = weekday === 0 || weekday === 6 ? 1.25 : 1;
  const views = Math.round(p.views * weekend * (1 + p.trend * dayIndex) * (0.7 + n(1) * 0.6));
  const units = Math.round(views * (p.price === 0 ? 0.08 : 0.022) * (0.6 + n(2) * 0.8));
  return {
    date: new Date(EPOCH + dayIndex * DAY).toISOString().slice(0, 10),
    views,
    likes: Math.round(views * 0.05 * (0.6 + n(3) * 0.8)),
    shares: Math.round(views * 0.012 * (0.5 + n(4))),
    bookmarks: Math.round(views * 0.03 * (0.6 + n(5) * 0.8)),
    comments: Math.round(views * 0.004 * (0.3 + n(6) * 1.4)),
    units,
    proceeds: units * p.price,
  };
}

export const analyticsSlugs = Object.keys(PROFILES);

/** `slug` null = all live listings combined. `today` is injectable for tests. */
export function buildReport(range: RangeDays, slug: string | null, today = new Date()): AnalyticsReport {
  const todayIndex = Math.floor((Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) - EPOCH) / DAY);
  const slugs = slug ? [slug] : analyticsSlugs;
  const series = (from: number) =>
    Array.from({ length: range }, (_, i) => {
      const idx = from + i;
      const per = slugs.map((s) => dayStat(s, idx));
      const d = { ...emptyTotals(), date: per[0]!.date } as DayStat;
      for (const x of per) for (const m of METRICS) d[m] += x[m];
      return d;
    });
  const current = series(todayIndex - range + 1);
  const previous = series(todayIndex - 2 * range + 1);
  const t = totals(current);
  return {
    range,
    current,
    previous,
    sources: { explore: Math.round(t.views * 0.41), search: Math.round(t.views * 0.27), shareLink: Math.round(t.views * 0.16), creatorPage: Math.round(t.views * 0.1), external: Math.round(t.views * 0.06) },
    shareTargets: { link: Math.round(t.shares * 0.34), whatsapp: Math.round(t.shares * 0.24), threads: Math.round(t.shares * 0.16), x: Math.round(t.shares * 0.12), linkedin: Math.round(t.shares * 0.06), more: Math.round(t.shares * 0.08) },
    listings: slugs.map((s) => ({ slug: s, totals: totals(Array.from({ length: range }, (_, i) => dayStat(s, todayIndex - range + 1 + i))) })),
  };
}
