import { githubLogin, githubRepos, repoManifests, zipManifest } from "@/data/github";
import { buyouts, launches, prompts } from "@/data/marketplace";
import { creators, myListings, salesSeries, templates } from "@/data/mock";
import { rankLaunches, toggleVote } from "@/lib/launch";
import { detectStack, scanSource, type SourceManifest } from "@/lib/sourceScan";
import { matches } from "@/lib/search";
import { mmkv } from "@/store/storage";
import type { AuthResult, BuyoutListing, CategoryKey, FileNode, Launch, Offer, Platform, PromptListing, ScanReport, Template, User } from "./types";
import { normalizeEmail, type AuthProvider } from "@/lib/auth";

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

/** Demo-only: the code every email "receives" until a real email provider is connected. */
export const DEMO_OTP = "123456";

type StoredUser = User & { appleSub?: string; googleSub?: string };
type Ticket = { provider: AuthProvider; email: string | null; name: string; appleSub?: string; googleSub?: string };
const TAKEN_HANDLES = creators.map((c) => c.handle);

function findOrTicket(match: (u: StoredUser) => boolean, t: Ticket): AuthResult {
  const user = readJson<StoredUser[]>(USERS_KEY, []).find(match);
  if (user) return { status: "signedIn", user };
  const ticket = `t_${Date.now().toString(36)}`;
  mmkv.set(TICKETS_KEY, JSON.stringify({ ...readJson<Record<string, Ticket>>(TICKETS_KEY, {}), [ticket]: t }));
  return { status: "needsProfile", ticket, email: t.email, name: t.name };
}

const countFiles = (nodes: FileNode[]): number => nodes.reduce((n, x) => n + (x.children ? countFiles(x.children) : 1), 0);

function report(m: SourceManifest): ScanReport {
  return { checks: scanSource(m), stack: detectStack(m.dependencies), files: m.files, fileCount: countFiles(m.files), sizeBytes: m.sizeBytes };
}

function withVotes(l: Launch): Launch & { voted: boolean } {
  const votes = readJson<string[]>(VOTES_KEY, []);
  const voted = votes.includes(l.slug);
  return { ...l, upvotes: l.upvotes + (voted ? 1 : 0), voted };
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
  creator: (handle: string) =>
    wait({ creator: creators.find((c) => c.handle === handle) ?? null, templates: templates.filter((t) => t.creator === handle) }),
  search: (p: SearchParams) => wait(searchTemplates([...templates], p), 180),
  purchases: () => wait(readPurchases()),
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
    const offer: Offer = { ...o, createdAt: new Date().toISOString().slice(0, 10), status: "sent" };
    mmkv.set(OFFERS_KEY, JSON.stringify([offer, ...readJson<Offer[]>(OFFERS_KEY, []).filter((x) => x.slug !== o.slug)]));
    return offer;
  },
  launches: () => wait(rankLaunches(launches.map(withVotes), new Date())),
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
  checkHandle: async (handle: string) => {
    await wait(null, 350);
    const taken = [...TAKEN_HANDLES, ...readJson<StoredUser[]>(USERS_KEY, []).map((u) => u.handle)];
    return { handle, available: !taken.includes(handle) };
  },
  completeProfile: async ({ ticket, name, handle }: { ticket: string; name: string; handle: string }) => {
    await wait(null, 800);
    const tickets = readJson<Record<string, Ticket>>(TICKETS_KEY, {});
    const t = tickets[ticket];
    if (!t) throw new Error("ticketExpired");
    const user: StoredUser = { id: `u_${Date.now().toString(36)}`, name: name.trim(), handle, email: t.email, provider: t.provider, createdAt: new Date().toISOString().slice(0, 10), appleSub: t.appleSub, googleSub: t.googleSub };
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
};

export const findCreator = (handle: string) => creators.find((c) => c.handle === handle);
export const findTemplate = (slug: string) => templates.find((t) => t.slug === slug);
