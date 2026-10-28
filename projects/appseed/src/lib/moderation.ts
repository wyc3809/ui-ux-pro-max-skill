/**
 * User content safety (docs/DESIGN.md §30, App Review Guideline 1.2): filter before posting, report with a
 * reason, block abusive users. `screenText` runs in the composer for instant feedback and again on the
 * server, which also runs a fuller classifier; the list here only catches the obvious cases.
 */

export type ScreenReason = "abuse" | "contact" | "spam";

/** Slurs, harassment and sexual terms in English and Cantonese. Matched on normalised text, whole words for Latin. */
const ABUSE_LATIN = ["fuck", "fucking", "cunt", "nigger", "faggot", "retard", "whore", "slut", "kys", "kill yourself", "porn", "nude", "nudes"];
const ABUSE_CJK = ["仆街", "屌你", "屌", "撚", "𨳒", "閪", "on9", "冚家鏟", "去死", "死全家", "賤人", "裸照", "色情"];

/** Off-platform payment or contact handles invite scams around escrow and in-app purchase. */
const CONTACT = [/\bwhatsapp\s*[:：]?\s*\+?\d[\d\s-]{6,}/i, /\btelegram\s*[:：@]/i, /\bt\.me\//i, /(?:^|\D)(?:\+?852[\s-]?)?[5-9]\d{3}[\s-]?\d{4}(?!\d)/, /\b(?:fps|payme|轉數快)\s*[:：]?\s*\d{6,}/i];

/** Lower-case, fold full-width letters and digits, and undo common substitutions (f*ck, sh1t). */
export function normalize(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[@4]/g, "a")
    .replace(/[1!|]/g, "i")
    .replace(/0/g, "o")
    .replace(/3/g, "e")
    .replace(/\$/g, "s")
    // A masked vowel is almost always "u" in these words (f*ck).
    .replace(/\*/g, "u")
    .replace(/[_.\-]/g, "");
}

function hasAbuse(text: string): boolean {
  const n = normalize(text);
  if (ABUSE_CJK.some((w) => n.includes(normalize(w)))) return true;
  return ABUSE_LATIN.some((w) => new RegExp(`(?:^|[^a-z])${w.replace(/\s/g, "\\s*")}(?:$|[^a-z])`).test(n));
}

/** Five or more of the same character, or the same word four times in a row. */
function isSpam(text: string): boolean {
  return /(.)\1{5,}/u.test(text) || /(\b\S+\b)(?:\s+\1){3,}/iu.test(text);
}

export function screenText(text: string): { ok: true } | { ok: false; reason: ScreenReason } {
  if (hasAbuse(text)) return { ok: false, reason: "abuse" };
  // Contact and phone patterns run on the raw text so digits are not rewritten.
  if (CONTACT.some((re) => re.test(text))) return { ok: false, reason: "contact" };
  if (isSpam(text)) return { ok: false, reason: "spam" };
  return { ok: true };
}

/** i18n key for a server or screening error code, whichever feature raised it. */
export const isScreenReason = (code: string): code is ScreenReason => code === "abuse" || code === "contact" || code === "spam";

export const REPORT_REASONS = ["spam", "harassment", "sexual", "violence", "scam", "ip", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
export type ReportTarget = { kind: "post" | "comment" | "listing" | "profile"; id: string; handle: string };

/** IP claims need contact details and a description so the takedown can be processed; other reasons need neither. */
export function validateReport(reason: ReportReason | null, detail: string, contact: string): "reason" | "detail" | "contact" | null {
  if (!reason) return "reason";
  if (reason === "ip") {
    if (detail.trim().length < 20) return "detail";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.trim())) return "contact";
  }
  if (reason === "other" && detail.trim().length < 5) return "detail";
  return null;
}

/** Content from blocked people disappears everywhere for the blocker, including replies and comments. */
export function withoutBlocked<T extends { handle: string }>(items: T[], blocked: string[]): T[] {
  return blocked.length ? items.filter((i) => !blocked.includes(i.handle)) : items;
}
