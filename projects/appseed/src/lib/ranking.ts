/**
 * Launch leaderboard algorithm (docs/DESIGN.md §28). The first thing people see when they open the app, so it
 * has to be fair to new launches, hard to game and explainable in one sheet.
 *
 * 1. Trust-weighted votes: a vote from an established account counts 1, from a brand new account 0.5.
 *    If more than 40% of a launch's votes come from accounts under 7 days old, the votes are halved again
 *    (a vote ring signature). The maker's own vote never counts (server side).
 * 2. Engagement: weighted votes + 0.5 × comments + 0.3 × shares. Comments mean people tried it.
 * 3. Time decay per period: today decays hard (gravity 1.8) so the board turns over daily, this week gently
 *    (1.2), this month not at all (a straight total within the window).
 * 4. Reports: three or more open reports take a launch off the board until moderators clear it.
 * 5. Sponsored: never ranked organically; one sponsored slot sits second, labelled, with no rank number.
 */

export type Period = "today" | "week" | "month";
export const PERIODS: Period[] = ["today", "week", "month"];

const WINDOW_HOURS: Record<Period, number> = { today: 24, week: 24 * 7, month: 24 * 30 };
const GRAVITY: Record<Period, number> = { today: 1.8, week: 1.2, month: 0 };
export const NEW_ACCOUNT_RING = 0.4;
export const REPORT_LIMIT = 3;
/** Rank movement compares against the board this many hours ago. */
export const MOVEMENT_HOURS = 6;

export type RankSignals = {
  upvotes: number;
  /** Share of votes from accounts older than 30 days with a purchase or listing (0–1). */
  trustedShare: number;
  /** Share of votes from accounts younger than 7 days (0–1). */
  newAccountShare: number;
  comments: number;
  shares: number;
  reports: number;
  launchedAt: string;
  boosted: boolean;
};

export function weightedVotes(s: Pick<RankSignals, "upvotes" | "trustedShare" | "newAccountShare">): number {
  const base = Math.max(0, s.upvotes) * (0.5 + 0.5 * clamp01(s.trustedShare));
  return s.newAccountShare > NEW_ACCOUNT_RING ? base * 0.5 : base;
}

export function engagement(s: RankSignals): number {
  return weightedVotes(s) + 0.5 * Math.max(0, s.comments) + 0.3 * Math.max(0, s.shares);
}

export const hoursSince = (iso: string, now: number) => Math.max(0, (now - Date.parse(iso)) / 3_600_000);

export function boardScore(s: RankSignals, period: Period, now: number): number {
  const g = GRAVITY[period];
  const decay = g === 0 ? 1 : Math.pow(hoursSince(s.launchedAt, now) + 2, g);
  return (engagement(s) + 1) / decay;
}

export function eligible(s: RankSignals, period: Period, now: number): boolean {
  return !s.boosted && s.reports < REPORT_LIMIT && hoursSince(s.launchedAt, now) <= WINDOW_HOURS[period];
}

export type Movement = { kind: "up" | "down"; by: number } | { kind: "same" } | { kind: "new" };

export type Ranked<T> = T & { rank: number; score: number; movement: Movement };

/** Organic ranking for a period; ties go to more comments, then the earlier launch (it got there first). */
export function rankBoard<T extends RankSignals & { slug: string }>(items: T[], period: Period, now: number): Ranked<T>[] {
  return items
    .filter((x) => eligible(x, period, now))
    .map((x) => ({ x, score: boardScore(x, period, now) }))
    .sort((a, b) => b.score - a.score || b.x.comments - a.x.comments || Date.parse(a.x.launchedAt) - Date.parse(b.x.launchedAt))
    .map(({ x, score }, i) => ({ ...x, rank: i + 1, score, movement: { kind: "same" } as Movement }));
}

/** Compares today's ranks with an earlier snapshot of the same board. */
export function withMovement<T extends { slug: string; rank: number }>(current: T[], previous: { slug: string; rank: number }[]): (T & { movement: Movement })[] {
  const before = new Map(previous.map((p) => [p.slug, p.rank]));
  return current.map((c) => {
    const was = before.get(c.slug);
    const movement: Movement = was == null ? { kind: "new" } : was > c.rank ? { kind: "up", by: was - c.rank } : was < c.rank ? { kind: "down", by: c.rank - was } : { kind: "same" };
    return { ...c, movement };
  });
}

/** The one sponsored launch shown in the period (highest engagement in the window), or none. */
export function sponsoredPick<T extends RankSignals>(items: T[], period: Period, now: number): T | undefined {
  return items
    .filter((x) => x.boosted && x.reports < REPORT_LIMIT && hoursSince(x.launchedAt, now) <= WINDOW_HOURS[period])
    .sort((a, b) => engagement(b) - engagement(a))[0];
}

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}
