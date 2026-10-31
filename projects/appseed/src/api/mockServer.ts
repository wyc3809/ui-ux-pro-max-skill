import { githubLogin, githubRepos, repoManifests, zipManifest } from "@/data/github";
import { buyouts, launches, prompts } from "@/data/marketplace";
import { buildReport } from "@/data/analytics";
import { SEED_POSTS, SEED_REPLIES } from "@/data/posts";
import { TERMS_VERSION } from "@/lib/contact";
import { forYou, type Viewer } from "@/lib/feed";
import { screenText, type ReportReason, type ReportTarget } from "@/lib/moderation";
import { BIO_MAX, normalizeSocial, SOCIALS, type SocialLinks } from "@/lib/socialLinks";
import { promoCountToday, sortPosts, validatePost, type PostSort } from "@/lib/posts";
import { creators, myListings, salesSeries, templates } from "@/data/mock";
import type { RangeDays } from "@/lib/analytics";
import { toggleVote } from "@/lib/launch";
import { boardScore, MOVEMENT_HOURS, rankBoard, REPORT_LIMIT, sponsoredPick, withMovement, type Period } from "@/lib/ranking";
import { detectStack, scanSource, type SourceManifest } from "@/lib/sourceScan";
import { matches } from "@/lib/search";
import { mmkv } from "@/store/storage";
import type { AuthResult, BuyoutListing, Comment, Creator, Engagement, Post, PostAttachment, CategoryKey, FileNode, Launch, Offer, Platform, PromptListing, ScanReport, Template, User } from "./types";
import { normalizeEmail, validateHandle, type AuthProvider } from "@/lib/auth";

/**
 * Stand-in for Supabase until the backend exists (§19). Purchase state lives
 * "server side" here — the UI only ever reads it through queries.
 */
const LATENCY = 420;
const wait = <T,>(v: T, ms = LATENCY) => new Promise<T>((r) => setTimeout(() => r(v), ms));

const PURCHASES_KEY = "mock-server:purchases";
const readPurchases = (): string[] => JSON.parse(mmkv.getString(PURCHASES_KEY) ?? '["tile-tap-2048"]') as string[];
const readJson = <T,>(key: string, fallback: T): T => JSON.parse(mmkv.getString(key) ?? JSON.stringify(fallback)) as T;
const PROMPTS_KEY = "mock-server:prompt-purchases";
const VOTES_KEY = "mock-server:votes";
const OFFERS_KEY = "mock-server:offers";

/** The real server never sends a prompt's full text to someone who hasn't bought it. */
function redactPrompt(p: PromptListing, owned: boolean): PromptListing {
  const lineCount = p.text.split("\n").length;
  if (owned || p.price === 0) return { ...p, lineCount };
  return { ...p, lineCount, text: p.text.split("\n").slice(0, p.previewLines).join("\n") + "\n" + "\u2588".repeat(24) };
}

const GITHUB_KEY = "mock-server:github";
const USERS_KEY = "mock-server:users";
const TICKETS_KEY = "mock-server:signup-tickets";

const LIKES_KEY = "mock-server:likes";
const VIEWS_KEY = "mock-server:views";
const SHARES_KEY = "mock-server:shares";
const COMMENTS_KEY = "mock-server:comments";
const POSTS_KEY = "mock-server:posts";
const PROFILES_KEY = "mock-server:profiles";

type ProfileEdit = { name: string; bio: string; links: SocialLinks };
/** Seed creators merged with any profile edits; a signed-in user without listings gets a profile on first save. */
function creatorProfile(handle: string): Creator | null {
  const edit = readJson<Record<string, ProfileEdit>>(PROFILES_KEY, {})[handle];
  const seed = creators.find((c) => c.handle === handle);
  if (!seed && !edit) return null;
  const base: Creator = seed ?? { handle, name: edit!.name, bio: "", avatarHue: 262, founding: false, totalSales: 0, avgRating: 0 };
  return edit ? { ...base, ...edit } : base;
}
const POST_LIKES_KEY = "mock-server:post-likes";
const POST_REPOSTS_KEY = "mock-server:post-reposts";
const POST_HIDDEN_KEY = "mock-server:post-hidden";
const REPORTS_KEY = "mock-server:reports";

/** All posts and replies, seeded on first read with timestamps relative to now. */
function readPosts(): Post[] {
  const stored = mmkv.getString(POSTS_KEY);
  if (stored) return JSON.parse(stored) as Post[];
  const now = Date.now();
  const seed = [...SEED_POSTS, ...SEED_REPLIES].map(({ hoursAgo, ...p }) => ({ ...p, createdAt: new Date(now - hoursAgo * 3_600_000).toISOString() }));
  mmkv.set(POSTS_KEY, JSON.stringify(seed));
  return seed;
}
const writePosts = (list: Post[]) => mmkv.set(POSTS_KEY, JSON.stringify(list));
/** Adds the viewer's own like / repost flags; reported posts disappear for the reporter only. */
function decorate(list: Post[]): Post[] {
  const liked = readJson<string[]>(POST_LIKES_KEY, []);
  const reposted = readJson<string[]>(POST_REPOSTS_KEY, []);
  const hidden = readJson<string[]>(POST_HIDDEN_KEY, []);
  return list.filter((p) => !hidden.includes(p.id)).map((p) => ({ ...p, liked: liked.includes(p.id), reposted: reposted.includes(p.id) }));
}
function toggleIn(store: string, id: string, field: "likes" | "reposts") {
  const set = readJson<string[]>(store, []);
  const on = !set.includes(id);
  mmkv.set(store, JSON.stringify(on ? [...set, id] : set.filter((x) => x !== id)));
  writePosts(readPosts().map((p) => (p.id === id ? { ...p, [field]: Math.max(0, p[field] + (on ? 1 : -1)) } : p)));
  return on;
}

/** Deterministic fictional starting counts per item, so numbers are stable across reloads and screenshots. */
function seeded(key: string) {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619) >>> 0;
  const r = (min: number, max: number, salt: number) => min + (((h >>> salt) ^ (h * (salt + 3))) >>> 0) % (max - min);
  return { likes: r(40, 420, 3), views: r(2_000, 32_000, 7), shares: r(4, 60, 11), bookmarks: r(20, 260, 5) };
}

const SEED_COMMENTS: Omit<Comment, "id" | "createdAt">[] = [
  { userId: "seed-1", author: "Jamie L.", handle: "jamie-l", body: "README 寫得很清楚，20 分鐘就跑起來了。" },
  { userId: "seed-2", author: "Wing", handle: "wingdev", body: "請問 Android 上有測試過鍵盤遮擋的問題嗎？" },
  { userId: "seed-3", author: "Alex T.", handle: "alex-t", body: "製作經歷的踩坑部分最有用，已收藏。" },
  { userId: "seed-4", author: "Mei", handle: "mei-builds", body: "想知道之後會不會加入 Web 版的支援？" },
];

function readComments(key: string): Comment[] {
  const all = readJson<Record<string, Comment[]>>(COMMENTS_KEY, {});
  if (all[key]) return all[key]!;
  // First read: 2–3 seeded comments, a few hours to days old.
  const n = 2 + (key.length % 2);
  const start = key.length % SEED_COMMENTS.length;
  return Array.from({ length: n }, (_, i) => {
    const c = SEED_COMMENTS[(start + i) % SEED_COMMENTS.length]!;
    return { ...c, id: `${key}-seed-${i}`, createdAt: new Date(Date.now() - (i + 1) * 9 * 3_600_000).toISOString() };
  });
}
const writeComments = (key: string, list: Comment[]) => mmkv.set(COMMENTS_KEY, JSON.stringify({ ...readJson<Record<string, Comment[]>>(COMMENTS_KEY, {}), [key]: list }));
const bump = (store: string, key: string) => mmkv.set(store, JSON.stringify({ ...readJson<Record<string, number>>(store, {}), [key]: (readJson<Record<string, number>>(store, {})[key] ?? 0) + 1 }));

/** Demo-only: the code every email "receives" until a real email provider is connected. */
export const DEMO_OTP = "123456";

type StoredUser = User & { appleSub?: string; googleSub?: string };
type Ticket = { provider: AuthProvider; email: string | null; name: string; appleSub?: string; googleSub?: string };
const TAKEN_HANDLES = creators.map((c) => c.handle);

/** User content needs the current terms; an older acceptance is refused so the client asks again. */
function assertTerms(userId: string) {
  const u = readJson<StoredUser[]>(USERS_KEY, []).find((x) => x.id === userId);
  if (u && (u.termsVersion ?? 0) < TERMS_VERSION) throw new Error("termsRequired");
}

function findOrTicket(match: (u: StoredUser) => boolean, t: Ticket): AuthResult {
  const user = readJson<StoredUser[]>(USERS_KEY, []).find(match);
  if (user) {
    // Provider subject ids stay on the server.
    const { appleSub: _a, googleSub: _g, ...publicUser } = user;
    return { status: "signedIn", user: publicUser as User };
  }
  const ticket = `t_${Date.now().toString(36)}`;
  mmkv.set(TICKETS_KEY, JSON.stringify({ ...readJson<Record<string, Ticket>>(TICKETS_KEY, {}), [ticket]: t }));
  return { status: "needsProfile", ticket, email: t.email, name: t.name };
}

const countFiles = (nodes: FileNode[]): number => nodes.reduce((n, x) => n + (x.children ? countFiles(x.children) : 1), 0);

function report(m: SourceManifest): ScanReport {
  return { checks: scanSource(m), stack: detectStack(m.dependencies), files: m.files, fileCount: countFiles(m.files), sizeBytes: m.sizeBytes };
}

/** The fictional launch dates are re-anchored so the newest launch is always a few hours old. */
const NEWEST = Math.max(...launches.map((l) => Date.parse(l.launchedAt)));
const anchored = (l: Launch, now = Date.now()): Launch => ({ ...l, launchedAt: new Date(Date.parse(l.launchedAt) + (now - 3 * 3_600_000 - NEWEST)).toISOString() });

function withVotes(l: Launch): Launch & { voted: boolean } {
  const votes = readJson<string[]>(VOTES_KEY, []);
  const voted = votes.includes(l.slug);
  return { ...anchored(l), upvotes: l.upvotes + (voted ? 1 : 0), voted };
}

/**
 * Leaderboard for a period, with rank movement against the board MOVEMENT_HOURS ago. The real server keeps
 * snapshots; here the earlier vote counts are estimated from how votes accrue over a launch's first days.
 */
function leaderboard(period: Period) {
  const now = Date.now();
  const all = launches.map(withVotes);
  const then = now - MOVEMENT_HOURS * 3_600_000;
  const earlier = all
    .filter((l) => Date.parse(l.launchedAt) <= then)
    .map((l) => {
      const age = (now - Date.parse(l.launchedAt)) / 3_600_000;
      const share = Math.pow((age - MOVEMENT_HOURS) / age, 0.6);
      return { ...l, upvotes: Math.round(l.upvotes * share), comments: Math.round(l.comments * share), shares: Math.round(l.shares * share) };
    });
  const board = withMovement(rankBoard(all, period, now), rankBoard(earlier, period, then));
  return { board, sponsored: sponsoredPick(all, period, now) ?? null };
}

export type SearchParams = {
  q: string;
  category?: CategoryKey | "all";
  price?: "any" | "free" | "paid";
  platform?: Platform | "any";
  sort?: "relevance" | "newest" | "rating" | "sales";
};

export function searchTemplates(list: Template[], p: SearchParams): Template[] {
  const out = list.filter(
    (t) =>
      (!p.category || p.category === "all" || t.category === p.category) &&
      (!p.price || p.price === "any" || (p.price === "free" ? t.price === 0 : t.price > 0)) &&
      (!p.platform || p.platform === "any" || t.platforms.includes(p.platform)) &&
      matches(p.q, [t.name, t.tagline, ...t.stack, t.category]),
  );
  switch (p.sort) {
    case "newest":
      return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    case "rating":
      return out.sort((a, b) => b.rating - a.rating);
    case "sales":
      return out.sort((a, b) => b.sales - a.sales);
    default:
      return out;
  }
}

export const api = {
  templates: () => wait(templates),
  template: (slug: string) => wait(templates.find((t) => t.slug === slug) ?? null),
  creator: (handle: string) => wait({ creator: creatorProfile(handle), templates: templates.filter((t) => t.creator === handle) }),
  /** Links are normalised again here, so a stored link can only be a bare handle or an https website. */
  saveProfile: async ({ handle, name, bio, links }: { handle: string } & ProfileEdit) => {
    await wait(null, 420);
    const clean: SocialLinks = {};
    for (const k of SOCIALS) {
      const r = links[k] ? normalizeSocial(k, links[k]!) : null;
      if (r && "error" in r) throw new Error(r.error);
      if (r && r.value) clean[k] = r.value;
    }
    if (bio.trim().length > BIO_MAX) throw new Error("bioTooLong");
    const screen = screenText(`${name} ${bio}`);
    if (!screen.ok) throw new Error(screen.reason);
    mmkv.set(PROFILES_KEY, JSON.stringify({ ...readJson<Record<string, ProfileEdit>>(PROFILES_KEY, {}), [handle]: { name: name.trim(), bio: bio.trim(), links: clean } }));
    return creatorProfile(handle)!;
  },
  search: (p: SearchParams) => wait(searchTemplates([...templates], p), 180),
  purchases: () => wait(readPurchases()),
  /**
   * Stand-in for RevenueCat `syncPurchases()` followed by re-reading the account's purchases from the server.
   * Price tiers are consumables, which StoreKit cannot restore, so ownership is kept per account and this is
   * how a new device or a reinstall gets it back.
   */
  restorePurchases: async () => {
    await wait(null, 900);
    return { templates: readPurchases().length, prompts: readJson<string[]>(PROMPTS_KEY, []).length };
  },
  /** Stand-in for the StoreKit / Play Billing purchase of BOOST_PRODUCT via RevenueCat. */
  purchaseBoost: async (productId: string) => {
    await wait(null, 900);
    return { ok: true as const, productId };
  },
  purchase: async (slug: string) => {
    await wait(null, 1100);
    const next = Array.from(new Set([slug, ...readPurchases()]));
    mmkv.set(PURCHASES_KEY, JSON.stringify(next));
    return { ok: true as const };
  },
  prompts: () => {
    const owned = readJson<string[]>(PROMPTS_KEY, []);
    return wait(prompts.map((p) => redactPrompt(p, owned.includes(p.slug))));
  },
  prompt: (slug: string) => {
    const p = prompts.find((x) => x.slug === slug);
    return wait(p ? redactPrompt(p, readJson<string[]>(PROMPTS_KEY, []).includes(slug)) : null);
  },
  promptPurchases: () => wait(readJson<string[]>(PROMPTS_KEY, [])),
  purchasePrompt: async (slug: string) => {
    await wait(null, 1000);
    mmkv.set(PROMPTS_KEY, JSON.stringify(Array.from(new Set([slug, ...readJson<string[]>(PROMPTS_KEY, [])]))));
    return { ok: true as const };
  },
  buyouts: () => wait<BuyoutListing[]>(buyouts),
  buyout: (slug: string) => wait(buyouts.find((b) => b.slug === slug) ?? null),
  offers: () => wait(readJson<Offer[]>(OFFERS_KEY, [])),
  makeOffer: async (o: { slug: string; amount: number; message: string }) => {
    await wait(null, 900);
    const screen = o.message.trim() ? screenText(o.message) : null;
    if (screen && !screen.ok) throw new Error(screen.reason);
    const offer: Offer = { ...o, createdAt: new Date().toISOString().slice(0, 10), status: "sent" };
    mmkv.set(OFFERS_KEY, JSON.stringify([offer, ...readJson<Offer[]>(OFFERS_KEY, []).filter((x) => x.slug !== o.slug)]));
    return offer;
  },
  /**
   * Every launch (search, related lists), ordered with the leaderboard's own weekly score so there is only
   * one ranking in the app; heavily reported launches are left out until reviewed.
   */
  launches: () => {
    const now = Date.now();
    return wait(launches.map(withVotes).filter((l) => l.reports < REPORT_LIMIT).sort((a, b) => boardScore(b, "week", now) - boardScore(a, "week", now)));
  },
  /** How many promotional posts this account made today, so the composer can say so before posting. */
  promoToday: (userId: string) => wait(promoCountToday(readPosts(), userId), 120),
  leaderboard: (period: Period) => wait(leaderboard(period), 320),
  launch: (slug: string) => {
    const l = launches.find((x) => x.slug === slug);
    return wait(l ? withVotes(l) : null);
  },
  vote: async (slug: string) => {
    const votes = readJson<string[]>(VOTES_KEY, []);
    const voted = votes.includes(slug);
    mmkv.set(VOTES_KEY, JSON.stringify(voted ? votes.filter((v) => v !== slug) : [slug, ...votes]));
    const base = launches.find((x) => x.slug === slug)?.upvotes ?? 0;
    return wait(toggleVote(base + (voted ? 1 : 0), voted), 120);
  },
  /** Supabase signInWithIdToken({ provider: "apple" }) in the real app. */
  signInWithApple: async (c: { sub: string; email: string | null; name: string | null }) => {
    await wait(null, 500);
    return findOrTicket((u) => u.appleSub === c.sub, { provider: "apple", email: c.email, name: c.name ?? "", appleSub: c.sub });
  },
  /** Google One Tap / OAuth in the real app; demo account here. */
  signInWithGoogle: async () => {
    await wait(null, 900);
    return findOrTicket((u) => u.googleSub === "demo-google-001", { provider: "google", email: "jamie.lee@gmail.com", name: "Jamie Lee", googleSub: "demo-google-001" });
  },
  /** Supabase signInWithOtp({ email }): sends a 6-digit code (and a magic link). */
  sendEmailCode: async (email: string) => {
    await wait(null, 700);
    return { email: normalizeEmail(email), sentAt: Date.now() };
  },
  verifyEmailCode: async ({ email, code }: { email: string; code: string }) => {
    await wait(null, 700);
    if (code !== DEMO_OTP) throw new Error("invalidCode");
    const e = normalizeEmail(email);
    return findOrTicket((u) => u.provider === "email" && u.email === e, { provider: "email", email: e, name: "" });
  },
  /** Web redirect sign-in (Supabase only); the demo server never leaves the page. */
  resumeSession: async (): Promise<AuthResult | null> => null,
  checkHandle: async (handle: string) => {
    await wait(null, 350);
    const taken = [...TAKEN_HANDLES, ...readJson<StoredUser[]>(USERS_KEY, []).map((u) => u.handle)];
    return { handle, available: !taken.includes(handle) };
  },
  completeProfile: async ({ ticket, name, handle, termsVersion }: { ticket: string; name: string; handle: string; termsVersion: number }) => {
    await wait(null, 800);
    // No account without agreeing to the terms and community rules (App Review 1.2).
    if (termsVersion < TERMS_VERSION) throw new Error("termsRequired");
    // The client's availability check can be stale or raced; the server decides (format, reserved, unique).
    const formatError = validateHandle(handle);
    if (formatError) throw new Error(formatError);
    const taken = [...TAKEN_HANDLES, ...creators.map((c) => c.handle), ...readJson<StoredUser[]>(USERS_KEY, []).map((u) => u.handle)];
    if (taken.includes(handle)) throw new Error("handleTaken");
    const nameScreen = screenText(name);
    if (!nameScreen.ok) throw new Error(nameScreen.reason);
    const tickets = readJson<Record<string, Ticket>>(TICKETS_KEY, {});
    const t = tickets[ticket];
    if (!t) throw new Error("ticketExpired");
    const user: StoredUser = { id: `u_${Date.now().toString(36)}`, name: name.trim(), handle, email: t.email, provider: t.provider, createdAt: new Date().toISOString().slice(0, 10), termsVersion, appleSub: t.appleSub, googleSub: t.googleSub };
    mmkv.set(USERS_KEY, JSON.stringify([...readJson<StoredUser[]>(USERS_KEY, []), user]));
    delete tickets[ticket];
    mmkv.set(TICKETS_KEY, JSON.stringify(tickets));
    const { appleSub: _a, googleSub: _g, ...publicUser } = user;
    return publicUser as User;
  },
  /** App Store 5.1.1(v): accounts must be deletable in the app; also revokes the Apple token server-side. */
  deleteAccount: async (id: string) => {
    await wait(null, 900);
    mmkv.set(USERS_KEY, JSON.stringify(readJson<StoredUser[]>(USERS_KEY, []).filter((u) => u.id !== id)));
    return { ok: true as const };
  },
  engagement: (key: string): Promise<Engagement> => {
    const base = seeded(key);
    const liked = readJson<string[]>(LIKES_KEY, []).includes(key);
    return wait(
      {
        likes: base.likes + (liked ? 1 : 0),
        views: base.views + (readJson<Record<string, number>>(VIEWS_KEY, {})[key] ?? 0),
        shares: base.shares + (readJson<Record<string, number>>(SHARES_KEY, {})[key] ?? 0),
        comments: readComments(key).length,
        bookmarks: base.bookmarks,
        liked,
      },
      200,
    );
  },
  toggleLike: async (key: string) => {
    const likes = readJson<string[]>(LIKES_KEY, []);
    const liked = !likes.includes(key);
    mmkv.set(LIKES_KEY, JSON.stringify(liked ? [key, ...likes] : likes.filter((k) => k !== key)));
    return wait({ liked }, 150);
  },
  /** The client already de-dupes (shouldCountView); the real server de-dupes again per viewer. */
  recordView: async (key: string) => {
    bump(VIEWS_KEY, key);
    return wait({ ok: true as const }, 100);
  },
  recordShare: async (key: string) => {
    bump(SHARES_KEY, key);
    return wait({ ok: true as const }, 100);
  },
  /** Comments reported by this viewer are hidden for them straight away. */
  comments: (key: string) => {
    const hidden = readJson<string[]>(POST_HIDDEN_KEY, []);
    return wait(readComments(key).filter((c) => !hidden.includes(c.id)), 300);
  },
  postComment: async ({ key, body, user }: { key: string; body: string; user: { id: string; name: string; handle: string } }) => {
    await wait(null, 500);
    assertTerms(user.id);
    const screen = screenText(body);
    if (!screen.ok) throw new Error(screen.reason);
    const c: Comment = { id: `c_${Date.now().toString(36)}`, userId: user.id, author: user.name, handle: user.handle, body: body.trim(), createdAt: new Date().toISOString() };
    writeComments(key, [c, ...readComments(key)]);
    return c;
  },
  deleteComment: async ({ key, id }: { key: string; id: string }) => {
    await wait(null, 300);
    writeComments(key, readComments(key).filter((c) => c.id !== id));
    return { ok: true as const };
  },
  /** GitHub App installation: read-only access to repos the creator picks. */
  githubAccount: () => wait<{ login: string } | null>(mmkv.getString(GITHUB_KEY) ? { login: githubLogin } : null, 200),
  connectGithub: async () => {
    await wait(null, 1400);
    mmkv.set(GITHUB_KEY, githubLogin);
    return { login: githubLogin };
  },
  disconnectGithub: async () => {
    await wait(null, 300);
    mmkv.remove(GITHUB_KEY);
    return null;
  },
  githubRepos: () => wait(githubRepos, 600),
  scanRepo: async (repo: string) => {
    await wait(null, 2400);
    const m = repoManifests[repo];
    if (!m) throw new Error("repo-not-found");
    return report(m);
  },
  uploadZip: async () => {
    await wait(null, 2400);
    return { fileName: "my-app.zip", report: report(zipManifest) };
  },
  studio: () => wait({ listings: myListings, sales: salesSeries, revenue: 8296, payout: 5420, nextPayout: "2026-11-09" }),
  /** For you is ranked per viewer (§28); the real server builds the viewer profile from its own records. */
  /** Records acceptance of the current terms and returns the updated account. */
  acceptTerms: async (userId: string) => {
    await wait(null, 400);
    const users = readJson<StoredUser[]>(USERS_KEY, []).map((u) => (u.id === userId ? { ...u, termsVersion: TERMS_VERSION } : u));
    mmkv.set(USERS_KEY, JSON.stringify(users));
    const found = users.find((u) => u.id === userId);
    if (!found) throw new Error("notFound");
    const { appleSub: _a, googleSub: _g, ...publicUser } = found;
    return publicUser as User;
  },
  posts: (sort: PostSort, viewer: Viewer) => {
    const list = decorate(readPosts().filter((p) => !p.parentId));
    return wait(sort === "forYou" ? forYou(list, viewer) : sortPosts(list, sort), 320);
  },
  thread: (id: string) => {
    const all = decorate(readPosts());
    const post = all.find((p) => p.id === id);
    if (!post) return Promise.reject(new Error("not-found"));
    return wait({ post, replies: sortPosts(all.filter((p) => p.parentId === id), "latest").reverse() }, 260);
  },
  /** The server re-runs the same rules as the composer, including the daily promotion limit. */
  createPost: async ({ body, attachment, parentId, user }: { body: string; attachment?: PostAttachment; parentId?: string; user: { id: string; name: string; handle: string } }) => {
    await wait(null, 380);
    const all = readPosts();
    assertTerms(user.id);
    const error = validatePost(body, { promo: !!attachment && !parentId, promoToday: promoCountToday(all, user.id) });
    if (error) throw new Error(error);
    const screen = screenText(body);
    if (!screen.ok) throw new Error(screen.reason);
    const post: Post = {
      id: `p_${Date.now().toString(36)}`,
      userId: user.id,
      author: user.name,
      handle: user.handle,
      body: body.trim(),
      createdAt: new Date().toISOString(),
      ...(attachment && !parentId ? { attachment, promo: true } : null),
      ...(parentId ? { parentId } : null),
      likes: 0,
      replies: 0,
      reposts: 0,
    };
    writePosts([post, ...all.map((p) => (p.id === parentId ? { ...p, replies: p.replies + 1 } : p))]);
    return post;
  },
  togglePostLike: async (id: string) => {
    await wait(null, 200);
    return toggleIn(POST_LIKES_KEY, id, "likes");
  },
  toggleRepost: async (id: string) => {
    await wait(null, 200);
    return toggleIn(POST_REPOSTS_KEY, id, "reposts");
  },
  /** Every report is queued for human review within 24 hours; posts and comments disappear for the reporter at once. */
  report: async ({ target, reason, detail, contact }: { target: ReportTarget; reason: ReportReason; detail: string; contact: string }) => {
    await wait(null, 400);
    mmkv.set(REPORTS_KEY, JSON.stringify([...readJson<unknown[]>(REPORTS_KEY, []), { target, reason, detail: detail.trim(), contact: contact.trim(), at: new Date().toISOString() }]));
    if (target.kind === "post" || target.kind === "comment") mmkv.set(POST_HIDDEN_KEY, JSON.stringify([...readJson<string[]>(POST_HIDDEN_KEY, []), target.id]));
  },
  /** Aggregated server side; the client never receives individual viewers or raw events (§26). */
  analytics: (range: RangeDays, slug: string | null) => wait(buildReport(range, slug), 360),
};

/** Synchronous lookup for cards; includes profile edits. */
export const findCreator = (handle: string) => creatorProfile(handle) ?? undefined;
export const findTemplate = (slug: string) => templates.find((t) => t.slug === slug);

/** Any listing by kind, for attachment cards: name, tagline, cover and owner. */
export function findListing(kind: PostAttachment["kind"], slug: string): { name: string; tagline: string; cover: Template["cover"]; owner: string; price?: number } | undefined {
  if (kind === "template") {
    const t = findTemplate(slug);
    return t && { name: t.name, tagline: t.tagline, cover: t.cover, owner: t.creator, price: t.price };
  }
  if (kind === "prompt") {
    const p = prompts.find((x) => x.slug === slug);
    return p && { name: p.title, tagline: p.summary, cover: p.cover, owner: p.creator, price: p.price };
  }
  if (kind === "buyout") {
    const b = buyouts.find((x) => x.slug === slug);
    return b && { name: b.name, tagline: b.tagline, cover: b.cover, owner: b.seller, price: b.asking };
  }
  const l = launches.find((x) => x.slug === slug);
  return l && { name: l.name, tagline: l.tagline, cover: l.cover, owner: l.maker };
}
