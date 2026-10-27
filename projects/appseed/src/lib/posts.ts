/**
 * Discussion posts (docs/DESIGN.md §27): a Threads-style feed on Explore where makers talk about and
 * promote their apps. Pure rules shared by the client (instant feedback) and the server (enforcement).
 */

export const POST_MAX = 500;
export const POST_MAX_LINKS = 2;
/** Posts with an attached app count as promotion; each person gets a few per day so the feed stays a conversation. */
export const PROMO_PER_DAY = 3;

export type PostError = "empty" | "tooLong" | "tooManyLinks" | "promoLimit";

const LINK = /https?:\/\/\S+/g;

export function validatePost(body: string, opts: { promo: boolean; promoToday: number }): PostError | null {
  const text = body.trim();
  if (!text) return "empty";
  if (text.length > POST_MAX) return "tooLong";
  if ((text.match(LINK) ?? []).length > POST_MAX_LINKS) return "tooManyLinks";
  if (opts.promo && opts.promoToday >= PROMO_PER_DAY) return "promoLimit";
  return null;
}

/** Characters left, shown once the writer is within 100 of the limit (Threads-style counter). */
export function remaining(body: string): number | null {
  const left = POST_MAX - body.trim().length;
  return left <= 100 ? left : null;
}

export type Segment = { text: string; kind: "text" | "tag" | "link" };

/** Splits a post into plain text, #tags and links so they can be styled (tags and links in the accent colour). */
export function segments(body: string): Segment[] {
  const out: Segment[] = [];
  const re = /(https?:\/\/\S+)|(#[\p{L}\p{N}_]+)/gu;
  let last = 0;
  for (const m of body.matchAll(re)) {
    if (m.index! > last) out.push({ text: body.slice(last, m.index), kind: "text" });
    out.push({ text: m[0], kind: m[1] ? "link" : "tag" });
    last = m.index! + m[0].length;
  }
  if (last < body.length) out.push({ text: body.slice(last), kind: "text" });
  return out;
}

export type Rankable = { createdAt: string; likes: number; replies: number; reposts: number };

/**
 * "Top" ordering: replies and reposts weigh more than likes (they start conversations), and age decays the
 * score so yesterday's hit gives way to today's posts.
 */
export function postScore(p: Rankable, now: number): number {
  const hours = Math.max(0, (now - Date.parse(p.createdAt)) / 3_600_000);
  return (p.likes + 2 * p.replies + 3 * p.reposts + 1) / Math.pow(hours + 2, 1.5);
}

export type PostSort = "latest" | "top";

export function sortPosts<T extends Rankable>(posts: T[], sort: PostSort, now = Date.now()): T[] {
  const copy = [...posts];
  return sort === "latest" ? copy.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)) : copy.sort((a, b) => postScore(b, now) - postScore(a, now));
}

/** How many promotional posts this person has made since local midnight. */
export function promoCountToday(posts: { userId: string; createdAt: string; attachment?: unknown; parentId?: string }[], userId: string, now = new Date()): number {
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return posts.filter((p) => p.userId === userId && p.attachment && !p.parentId && Date.parse(p.createdAt) >= midnight).length;
}
