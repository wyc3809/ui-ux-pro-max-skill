import type { Locale } from "@/i18n";

const EN_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** zh: 2026年10月26日 · en: 26 Oct 2026 (§15). Input is an ISO date (yyyy-mm-dd). */
export function formatDate(iso: string, locale: Locale): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number) as [number, number, number];
  return locale === "en" ? `${d} ${EN_MONTHS[m - 1]} ${y}` : `${y}年${m}月${d}日`;
}

/** Chart labels without the year. zh: 10月26日 · en: 26 Oct */
export function formatShortDate(iso: string, locale: Locale): string {
  const [, m, d] = iso.slice(0, 10).split("-").map(Number) as [number, number, number];
  return locale === "en" ? `${d} ${EN_MONTHS[m - 1]}` : `${m}月${d}日`;
}

export function formatCount(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
