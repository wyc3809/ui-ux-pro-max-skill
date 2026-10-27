import { postScore, type Rankable } from "./posts";

/**
 * "For you" discussion algorithm (docs/DESIGN.md §28). Starts from the conversation score (`postScore`) and
 * adjusts it for the viewer, then reorders for variety:
 *
 * 1. Affinity: +0.6 if the viewer saved or bought something by the author, +0.25 per #tag that matches the
 *    viewer's interests (searches and saved categories, at most +0.5), +0.2 if the attached listing is a kind
 *    the viewer engages with.
 * 2. Freshness: posts under an hour old get ×1.5 so new posts are seen before they can earn engagement.
 * 3. Seen: posts the viewer already opened drop to ×0.6.
 * 4. Reports: three or more reports drop a post to ×0.3 while it waits for review.
 * 5. Variety: never two posts in a row from the same author, and at most one promotional post in any three.
 * 6. The viewer's own post from the last 10 minutes is pinned on top so they see it land.
 * Signed-out visitors get the same ranking without affinity and seen.
 */

export type Viewer = {
  userId?: string;
  /** Handles of creators whose listings the viewer saved or bought. */
  authors: string[];
  /** Lower-cased interest words: recent searches and saved categories. */
  interests: string[];
  /** Listing kinds the viewer engages with (from saves and purchases). */
  kinds: string[];
  /** Post ids the viewer opened. */
  seen: string[];
};

export const ANON: Viewer = { authors: [], interests: [], kinds: [], seen: [] };

export type FeedPost = Rankable & {
  id: string;
  userId: string;
  handle: string;
  body: string;
  promo?: boolean;
  reports?: number;
  attachment?: { kind: string };
};

export const tagsOf = (body: string) => [...body.matchAll(/#([\p{L}\p{N}_]+)/gu)].map((m) => m[1]!.toLowerCase());

export function affinity(p: FeedPost, v: Viewer): number {
  let a = 0;
  if (v.authors.includes(p.handle)) a += 0.6;
  const matches = tagsOf(p.body).filter((t) => v.interests.some((i) => t.includes(i) || i.includes(t))).length;
  a += Math.min(0.5, matches * 0.25);
  if (p.attachment && v.kinds.includes(p.attachment.kind)) a += 0.2;
  return a;
}

export function forYouScore(p: FeedPost, v: Viewer, now: number): number {
  const ageH = (now - Date.parse(p.createdAt)) / 3_600_000;
  const fresh = ageH < 1 ? 1.5 : 1;
  const seen = v.seen.includes(p.id) ? 0.6 : 1;
  const reported = (p.reports ?? 0) >= 3 ? 0.3 : 1;
  return postScore(p, now) * (1 + affinity(p, v)) * fresh * seen * reported;
}

/** Greedy re-rank: take the best post that keeps authors apart and promotion to one in three. */
export function diversify<T extends FeedPost>(sorted: T[]): T[] {
  const pool = [...sorted];
  const out: T[] = [];
  while (pool.length) {
    const prev = out[out.length - 1];
    const promosInWindow = out.slice(-2).filter((p) => p.promo).length;
    const i = pool.findIndex((p) => p.handle !== prev?.handle && !(p.promo && promosInWindow >= 1));
    out.push(pool.splice(i === -1 ? 0 : i, 1)[0]!);
  }
  return out;
}

export function forYou<T extends FeedPost>(posts: T[], v: Viewer, now = Date.now()): T[] {
  const ranked = diversify([...posts].sort((a, b) => forYouScore(b, v, now) - forYouScore(a, v, now)));
  const mine = v.userId ? ranked.find((p) => p.userId === v.userId && now - Date.parse(p.createdAt) < 10 * 60_000) : undefined;
  return mine ? [mine, ...ranked.filter((p) => p !== mine)] : ranked;
}
