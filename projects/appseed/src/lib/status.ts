import type { Palette } from "@/theme/tokens";

export type TemplateStatus = "live" | "purchased" | "pending" | "draft" | "unlisted" | "changes" | "rejected";
export type StatusTone = "live" | "pending" | "ended" | "warn" | "danger";

/** §7 StatusBadge mapping. Status never uses the brand colour. */
export function statusTone(status: TemplateStatus): StatusTone {
  switch (status) {
    case "live":
    case "purchased":
      return "live";
    case "pending":
      return "pending";
    case "draft":
    case "unlisted":
      return "ended";
    case "changes":
      return "warn";
    case "rejected":
      return "danger";
  }
}

export function toneColors(tone: StatusTone, c: Palette): { fg: string; bg: string } {
  const map: Record<StatusTone, { fg: string; bg: string }> = {
    live: { fg: c.live, bg: c.liveSoft },
    pending: { fg: c.pending, bg: c.pendingSoft },
    ended: { fg: c.ended, bg: c.endedSoft },
    warn: { fg: c.warn, bg: c.warnSoft },
    danger: { fg: c.danger, bg: c.dangerSoft },
  };
  return map[tone];
}
