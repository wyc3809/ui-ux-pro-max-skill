import { creators, myListings, salesSeries, templates } from "@/data/mock";
import { matches } from "@/lib/search";
import { mmkv } from "@/store/storage";
import type { CategoryKey, Platform, Template } from "./types";

/**
 * Stand-in for Supabase until the backend exists (§19). Purchase state lives
 * "server side" here — the UI only ever reads it through queries.
 */
const LATENCY = 420;
const wait = <T,>(v: T, ms = LATENCY) => new Promise<T>((r) => setTimeout(() => r(v), ms));

const PURCHASES_KEY = "mock-server:purchases";
const readPurchases = (): string[] => JSON.parse(mmkv.getString(PURCHASES_KEY) ?? '["tile-tap-2048"]') as string[];

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
  studio: () => wait({ listings: myListings, sales: salesSeries, revenue: 8296, payout: 5420, nextPayout: "2026-11-09" }),
};

export const findCreator = (handle: string) => creators.find((c) => c.handle === handle);
export const findTemplate = (slug: string) => templates.find((t) => t.slug === slug);
