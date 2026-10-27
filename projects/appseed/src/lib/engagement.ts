import type { Locale } from "@/i18n";
import { formatDate } from "./format";

/** Every engageable thing, addressed the same way (and matching favourites' namespacing). */
export type ItemKind = "template" | "prompt" | "buyout" | "launch";

export function itemKey(kind: ItemKind, slug: string): string {
  return kind === "template" ? slug : `${kind}:${slug}`;
}

/** Public web link for an item (§11.9): works without the app installed. */
export function shareLink(kind: ItemKind, slug: string): string {
  const path = { template: "t", prompt: "p", buyout: "b", launch: "l" }[kind];
  return `https://appseed.app/${path}/${slug}`;
}

export type ShareTarget = "x" | "linkedin" | "threads" | "whatsapp";
export const SHARE_TARGETS: ShareTarget[] = ["x", "linkedin", "threads", "whatsapp"];

/** Each network's public share-intent URL, with text and link URL-encoded. */
export function buildShareUrl(target: ShareTarget, url: string, text: string): string {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(text);
  switch (target) {
    case "x":
      return `https://x.com/intent/post?text=${t}&url=${u}`;
    case "linkedin":
      return `https://www.linkedin.com/sharing/share-offsite/?url=${u}`;
    case "threads":
      return `https://www.threads.net/intent/post?text=${encodeURIComponent(`${text} ${url}`)}`;
    case "whatsapp":
      return `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
  }
}

/** 21500 → "21.5K" (en) / "2.2萬" (zh). Below the threshold, full digits with separators. */
export function formatCompact(n: number, locale: Locale): string {
  const trim = (x: number) => (Math.round(x * 10) / 10).toString();
  if (locale === "en") {
    if (n >= 1_000_000) return `${trim(n / 1_000_000)}M`;
    if (n >= 1_000) return `${trim(n / 1_000)}K`;
  } else {
    if (n >= 100_000_000) return `${trim(n / 100_000_000)}億`;
    if (n >= 10_000) return `${trim(n / 10_000)}萬`;
  }
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export const VIEW_DEDUPE_MS = 30 * 60 * 1000;

/** One view per viewer per item per 30 minutes, so refreshing or bouncing back doesn't inflate counts. */
export function shouldCountView(lastViewedAt: number | undefined, now: number): boolean {
  return lastViewedAt == null || now - lastViewedAt >= VIEW_DEDUPE_MS;
}

export const COMMENT_MAX = 500;
export type CommentError = "commentEmpty" | "commentLong";

export function validateComment(text: string): CommentError | null {
  const s = text.trim();
  if (!s) return "commentEmpty";
  if (s.length > COMMENT_MAX) return "commentLong";
  return null;
}

/** "剛剛" / "3 分鐘前" / "5 小時前" / "2 日前", then the full date after a week. */
export function formatRelative(iso: string, now: number, locale: Locale): string {
  const s = Math.max(0, (now - new Date(iso).getTime()) / 1000);
  const zh = locale !== "en";
  if (s < 60) return zh ? "剛剛" : "just now";
  if (s < 3600) return zh ? `${Math.floor(s / 60)} 分鐘前` : `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return zh ? `${Math.floor(s / 3600)} 小時前` : `${Math.floor(s / 3600)}h ago`;
  if (s < 7 * 86400) return zh ? `${Math.floor(s / 86400)} 日前` : `${Math.floor(s / 86400)}d ago`;
  return formatDate(iso, locale);
}
