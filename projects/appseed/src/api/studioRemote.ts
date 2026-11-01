import type { SupabaseClient } from "@supabase/supabase-js";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import { emptyTotals, type AnalyticsReport, type DayStat, type RangeDays } from "@/lib/analytics";
import type { MediaKind } from "@/lib/media";
import type { PickedMedia } from "@/lib/pickMedia";
import type { TemplateStatus } from "@/lib/status";
import { invoke } from "./supabase";
import type { GithubRepo, Listing, ScanReport } from "./types";

/**
 * The studio on Supabase (docs/DESIGN.md §35): submitting listings, source upload and GitHub, sales and
 * analytics. Totals come from the database already aggregated per listing per day; nothing here sees a viewer.
 */
type DailyRow = { slug: string; day: string; views: number; likes: number; shares: number; comments: number; units: number; proceeds: number };

/** Database listing states as the studio's status badges. */
export const STATUS: Record<string, TemplateStatus> = { draft: "draft", review: "pending", live: "live", rejected: "rejected" };

/** Payouts run on the 9th (see the settlement schedule); the next one from `now`. */
export function nextPayoutDate(now: Date): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 9));
  if (now.getUTCDate() >= 9) d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 10);
}

/** Per-listing daily rows → the report the analytics screen renders. Sources and share targets are not tracked yet. */
export function reportFrom(rows: DailyRow[], range: RangeDays, slug: string | null): AnalyticsReport {
  const days = [...new Set(rows.map((r) => r.day))].sort();
  const byDay = new Map<string, DayStat>(days.map((date) => [date, { date, ...emptyTotals() }]));
  const perListing = new Map<string, ReturnType<typeof emptyTotals>>();
  const recent = new Set(days.slice(-range));
  for (const r of rows) {
    const add = { views: Number(r.views), likes: Number(r.likes), shares: Number(r.shares), bookmarks: 0, comments: Number(r.comments), units: Number(r.units), proceeds: Number(r.proceeds) / 100 };
    if (recent.has(r.day)) {
      const t = perListing.get(r.slug) ?? emptyTotals();
      for (const k of Object.keys(add) as (keyof typeof add)[]) t[k] += add[k];
      perListing.set(r.slug, t);
    }
    if (slug && r.slug !== slug) continue;
    const d = byDay.get(r.day)!;
    for (const k of Object.keys(add) as (keyof typeof add)[]) d[k] += add[k];
  }
  const all = days.map((d) => byDay.get(d)!);
  return {
    range,
    current: all.slice(-range),
    previous: all.slice(-2 * range, -range),
    sources: { explore: 0, search: 0, shareLink: 0, creatorPage: 0, external: 0 },
    shareTargets: { link: 0, x: 0, linkedin: 0, threads: 0, whatsapp: 0, more: 0 },
    listings: [...perListing].map(([s, totals]) => ({ slug: s, totals })),
  };
}

/** Lets the creator choose a zip in the browser. Native builds upload from the web studio (§22.6). */
function pickZip(): Promise<File> {
  return new Promise((resolve, reject) => {
    if (Platform.OS !== "web" || typeof document === "undefined") return reject(new Error("zipOnWeb"));
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".zip,application/zip";
    input.onchange = () => (input.files?.[0] ? resolve(input.files[0]) : reject(new Error("cancelled")));
    input.click();
  });
}

const GITHUB_APP = process.env.EXPO_PUBLIC_GITHUB_APP_SLUG;

export function studioApi(sb: SupabaseClient) {
  const must = <T>(r: { data: T | null; error: { message: string } | null }): T => {
    if (r.error) throw new Error(r.error.message);
    return r.data as T;
  };
  const studio = (body: object) => invoke<unknown>("studio", body);

  const linkGithub = async (code: string, installationId: string) => (await studio({ action: "linkGithub", code, installationId: Number(installationId) })) as { login: string };

  return {
    studio: async () => {
      const uid = (await sb.auth.getUser()).data.user?.id;
      if (!uid) throw new Error("authRequired");
      const [listings, daily, balance] = await Promise.all([
        sb.rpc("my_listings").then(must) as Promise<{ slug: string; status: string; month_sales: number; month_revenue: number }[]>,
        sb.rpc("creator_daily", { p_days: 30 }).then(must) as Promise<DailyRow[]>,
        sb.rpc("seller_balance", { p_seller: uid }).then(must) as Promise<{ available: number }[]>,
      ]);
      const report = reportFrom(daily, 30, null);
      return {
        listings: listings.map((l): Listing => ({ slug: l.slug, status: STATUS[l.status] ?? "draft", monthSales: Number(l.month_sales), monthRevenue: Number(l.month_revenue) / 100 })),
        sales: report.current.map((d) => d.units),
        revenue: listings.reduce((s, l) => s + Number(l.month_revenue), 0) / 100,
        payout: Number(balance[0]?.available ?? 0) / 100,
        nextPayout: nextPayoutDate(new Date()),
      };
    },
    analytics: async (range: RangeDays, slug: string | null) => reportFrom(must(await sb.rpc("creator_daily", { p_days: range * 2 })) as DailyRow[], range, slug),

    /** Asks the studio function to sign an upload (it re-checks the rules), uploads, returns the public URL. */
    uploadMedia: async (kind: MediaKind, file: PickedMedia) => {
      const { path, token, publicUrl } = (await studio({ action: "mediaUploadUrl", kind, mime: file.mime, bytes: file.bytes, width: file.width, height: file.height, durationMs: file.durationMs })) as {
        path: string;
        token: string;
        publicUrl: string;
      };
      const blob = await fetch(file.uri).then((r) => r.blob());
      must(await sb.storage.from("media").uploadToSignedUrl(path, token, blob, { contentType: file.mime }));
      return { url: publicUrl };
    },
    submitListing: async (listing: Record<string, unknown>) => (await studio({ action: "submitListing", listing })) as { slug: string; status: string },

    uploadZip: async () => {
      const file = await pickZip();
      const { path, token } = (await studio({ action: "sourceUploadUrl", fileName: file.name })) as { path: string; token: string };
      must(await sb.storage.from("sources").uploadToSignedUrl(path, token, file, { contentType: "application/zip" }));
      const report = (await studio({ action: "scanZip", path })) as ScanReport;
      return { fileName: file.name, report, path };
    },

    githubAccount: async () => {
      const { data } = await sb.from("github_installations").select("login").maybeSingle<{ login: string }>();
      return data ? { login: data.login } : null;
    },
    /** Installs the GitHub App on the repos the creator picks; GitHub sends them back with a code to link it. */
    connectGithub: async () => {
      if (!GITHUB_APP) throw new Error("githubNotConfigured");
      const install = `https://github.com/apps/${GITHUB_APP}/installations/new`;
      if (Platform.OS === "web") {
        window.location.assign(install);
        return new Promise<never>(() => {});
      }
      const r = await WebBrowser.openAuthSessionAsync(install, "appseed://github-callback");
      if (r.type !== "success") throw new Error("cancelled");
      const q = new URL(r.url).searchParams;
      return linkGithub(q.get("code") ?? "", q.get("installation_id") ?? "");
    },
    linkGithub,
    disconnectGithub: async () => {
      must(await sb.from("github_installations").delete().neq("installation_id", 0));
      return null;
    },
    githubRepos: async () => (await studio({ action: "githubRepos" })) as GithubRepo[],
    scanRepo: async (repo: string) => (await studio({ action: "scanRepo", repo })) as ScanReport,

    sendToComputer: async (slug: string) => (await studio({ action: "sendToComputer", slug })) as { ok: true },
    sourceDownload: async (slug: string) => (await studio({ action: "sourceDownload", slug })) as { url: string | null },
  };
}
