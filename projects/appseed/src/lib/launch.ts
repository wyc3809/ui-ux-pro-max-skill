/** "新作推廣" launch board rules. */

/**
 * A 24 hour sponsored slot is a digital service used inside the app, so it is sold with in-app purchase
 * (App Review 3.1.1) at a fixed tier, never through Stripe in the app.
 */
export const BOOST_PRODUCT = { id: "launch_boost_24h", price: 38 } as const;

/** Hacker-News-style ranking: upvotes decay with age so new launches get a fair window. */
export function hotScore(upvotes: number, ageHours: number): number {
  return (Math.max(upvotes, 0) + 1) / Math.pow(Math.max(ageHours, 0) + 2, 1.5);
}

export function ageHours(launchedAt: string, now: Date): number {
  return Math.max(0, (now.getTime() - new Date(launchedAt).getTime()) / 3_600_000);
}

/** Paid boosts must always be disclosed as sponsored, and never outrank more than one organic slot. */
export function rankLaunches<T extends { upvotes: number; launchedAt: string; boosted: boolean }>(items: T[], now: Date): T[] {
  const byScore = [...items].sort((a, b) => hotScore(b.upvotes, ageHours(b.launchedAt, now)) - hotScore(a.upvotes, ageHours(a.launchedAt, now)));
  const boosted = byScore.find((x) => x.boosted);
  if (!boosted) return byScore;
  const rest = byScore.filter((x) => x !== boosted);
  // Sponsored slot sits second, below the top organic launch.
  return [...rest.slice(0, 1), boosted, ...rest.slice(1)];
}

/** Toggle an upvote; returns the new count. One vote per user, enforced by the server too. */
export function toggleVote(count: number, voted: boolean): { count: number; voted: boolean } {
  return voted ? { count: Math.max(0, count - 1), voted: false } : { count: count + 1, voted: true };
}
