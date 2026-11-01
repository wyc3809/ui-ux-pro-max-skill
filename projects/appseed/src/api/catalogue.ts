import type { SupabaseClient } from "@supabase/supabase-js";
import { boardScore, buildLeaderboard, REPORT_LIMIT, type Period } from "@/lib/ranking";
import { categoryKeys, type CategoryKey } from "@/lib/categories";
import { searchTemplates, type SearchParams } from "./mockServer";
import type { BuyoutListing, Launch, PromptListing, Template } from "./types";

/**
 * Catalogue reads from Supabase (docs/DESIGN.md §33): every market lives in `listings`, its public fields in
 * `data` (the shapes in types.ts) and its price in cents. Prompt text beyond the preview comes from
 * `prompt_texts`, which RLS opens only to owners and the seller. Launch counters add the live vote, share and
 * comment totals from `launch_stats` to whatever the listing started with.
 */
export type ListingRow = { slug: string; kind: string; price: number; data: Record<string, unknown> };
type StatsRow = { slug: string; upvotes: number; trusted_share: number; new_account_share: number; reports: number; shares: number; comments: number };

/** Marker for locked prompt lines, the same as the demo server shows. */
export const LOCKED = "█".repeat(24);

export const toTemplate = (r: ListingRow): Template => ({ ...(r.data as Template), slug: r.slug, price: r.price / 100 });

export function toPrompt(r: ListingRow, fullText?: string): PromptListing {
  const p = { ...(r.data as PromptListing), slug: r.slug, price: r.price / 100 };
  const lineCount = p.lineCount ?? p.text.split("\n").length;
  if (fullText != null) return { ...p, text: fullText, lineCount };
  return lineCount > p.previewLines && p.price > 0 ? { ...p, lineCount, text: `${p.text}\n${LOCKED}` } : { ...p, lineCount };
}

export function toLaunch(r: ListingRow, s: StatsRow | undefined, voted: boolean): Launch & { voted: boolean } {
  const l = { ...(r.data as Launch), slug: r.slug };
  const votes = Number(s?.upvotes ?? 0);
  return {
    ...l,
    upvotes: (l.upvotes ?? 0) + votes,
    comments: (l.comments ?? 0) + Number(s?.comments ?? 0),
    shares: (l.shares ?? 0) + Number(s?.shares ?? 0),
    reports: (l.reports ?? 0) + Number(s?.reports ?? 0),
    // Seeded signals stand until real votes exist, then the real split takes over.
    trustedShare: votes ? Number(s!.trusted_share) : (l.trustedShare ?? 0),
    newAccountShare: votes ? Number(s!.new_account_share) : (l.newAccountShare ?? 0),
    voted,
  };
}

export function catalogueApi(sb: SupabaseClient) {
  /** Live listings of a kind; with a category, only that category's (indexed: listings_category, §40). */
  const rows = async (kind: string, category: CategoryKey | "all" = "all") => {
    let q = sb.from("listings").select("slug, kind, price, data").eq("kind", kind).eq("status", "live");
    if (category !== "all") {
      const keys = categoryKeys(category).join(",");
      q = q.or(`data->>category.in.(${keys}),data->>secondaryCategory.in.(${keys})`);
    }
    const r = await q.order("updated_at", { ascending: false });
    if (r.error) throw new Error(r.error.message);
    return (r.data ?? []) as ListingRow[];
  };
  const row = async (slug: string, kind: string) => {
    const r = await sb.from("listings").select("slug, kind, price, data").eq("slug", slug).eq("kind", kind).maybeSingle();
    if (r.error) throw new Error(r.error.message);
    return r.data as ListingRow | null;
  };
  const userId = async () => (await sb.auth.getUser()).data.user?.id ?? null;

  const launchList = async (category: CategoryKey | "all" = "all") => {
    const [list, stats, me] = await Promise.all([rows("launch", category), sb.from("launch_stats").select("*"), userId()]);
    const mine = me ? (((await sb.from("launch_votes").select("slug").eq("user_id", me)).data ?? []) as { slug: string }[]).map((v) => v.slug) : [];
    const bySlug = new Map(((stats.data ?? []) as StatsRow[]).map((s) => [s.slug, s]));
    return list.map((r) => toLaunch(r, bySlug.get(r.slug), mine.includes(r.slug)));
  };

  return {
    templates: async () => (await rows("template")).map(toTemplate),
    template: async (slug: string) => {
      const r = await row(slug, "template");
      return r ? toTemplate(r) : null;
    },
    search: async (p: SearchParams) => searchTemplates((await rows("template")).map(toTemplate), p),
    prompts: async () => (await rows("prompt")).map((r) => toPrompt(r)),
    prompt: async (slug: string) => {
      const r = await row(slug, "prompt");
      if (!r) return null;
      // Readable only when this account owns it (or sells it); otherwise RLS returns nothing.
      const t = await sb.from("prompt_texts").select("text").eq("slug", slug).maybeSingle();
      return toPrompt(r, (t.data as { text: string } | null)?.text);
    },
    buyouts: async () => (await rows("buyout")).map((r) => ({ ...(r.data as BuyoutListing), slug: r.slug })),
    buyout: async (slug: string) => {
      const r = await row(slug, "buyout");
      return r ? { ...(r.data as BuyoutListing), slug: r.slug } : null;
    },
    launches: async () => {
      const now = Date.now();
      return (await launchList()).filter((l) => l.reports < REPORT_LIMIT).sort((a, b) => boardScore(b, "week", now) - boardScore(a, "week", now));
    },
    leaderboard: async (period: Period, category: CategoryKey | "all" = "all") => buildLeaderboard(await launchList(category), period, Date.now()),
    launch: async (slug: string) => (await launchList()).find((l) => l.slug === slug) ?? null,
    vote: async (slug: string) => {
      const me = await userId();
      if (!me) throw new Error("authRequired");
      const existing = (await sb.from("launch_votes").select("slug").match({ slug, user_id: me }).maybeSingle()).data;
      const r = existing ? await sb.from("launch_votes").delete().match({ slug, user_id: me }) : await sb.from("launch_votes").insert({ slug, user_id: me });
      if (r.error) throw new Error(r.error.message);
      const l = (await launchList()).find((x) => x.slug === slug);
      return { count: l?.upvotes ?? 0, voted: !existing };
    },
    /** Templates by a creator, for the creator page (their profile comes from remote.ts). */
    templatesBy: async (handle: string) => (await rows("template")).map(toTemplate).filter((t) => t.creator === handle),
  };
}
