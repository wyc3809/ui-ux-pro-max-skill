import { buyouts, launches, prompts } from "@/data/marketplace";
import { creators, myListings, salesSeries, templates } from "@/data/mock";
import { rankLaunches, toggleVote } from "@/lib/launch";
import { matches } from "@/lib/search";
import { mmkv } from "@/store/storage";
import type { BuyoutListing, CategoryKey, Launch, Offer, Platform, PromptListing, Template } from "./types";

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
  studio: () => wait({ listings: myListings, sales: salesSeries, revenue: 8296, payout: 5420, nextPayout: "2026-11-09" }),
};

export const findCreator = (handle: string) => creators.find((c) => c.handle === handle);
export const findTemplate = (slug: string) => templates.find((t) => t.slug === slug);
