/** Sign-up / sign-in rules shared by the auth sheet (display-side; the server re-validates). */

export type AuthProvider = "apple" | "google" | "email";

export function normalizeEmail(s: string): string {
  return s.trim().toLowerCase();
}

export function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizeEmail(s));
}

export const OTP_LENGTH = 6;

/** Keeps digits only, capped at the code length — so pasting "123 456" or an SMS snippet just works. */
export function sanitizeOtp(input: string): string {
  return input.replace(/\D/g, "").slice(0, OTP_LENGTH);
}

export const RESEND_SECONDS = 30;

/** Seconds left before "resend code" unlocks. */
export function resendIn(sentAt: number, now: number, wait = RESEND_SECONDS): number {
  return Math.max(0, Math.ceil(wait - (now - sentAt) / 1000));
}

const RESERVED = new Set(["admin", "appseed", "support", "help", "root", "staff", "official", "me", "settings"]);

export type HandleError = "handleShort" | "handleLong" | "handleChars" | "handleReserved";

/** 3–20 chars, lowercase letters, digits, "-" and "_", must start with a letter, not reserved. */
export function validateHandle(h: string): HandleError | null {
  if (h.length < 3) return "handleShort";
  if (h.length > 20) return "handleLong";
  if (!/^[a-z][a-z0-9_-]*$/.test(h)) return "handleChars";
  if (RESERVED.has(h)) return "handleReserved";
  return null;
}

/** Short stable suffix so fallback handles differ between people. */
function shortHash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h.toString(36).slice(0, 4).padStart(4, "0");
}

/**
 * A starting handle from the display name, or the email's local part, made valid.
 * Apple relay addresses are random strings, so they never seed a handle.
 */
export function suggestHandle(name: string, email: string | null): string {
  const local = email && !isPrivateRelay(email) ? (email.split("@")[0] ?? "") : "";
  const base = (/[a-z]/i.test(name) ? name : local)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/^[^a-z]+/, "")
    .slice(0, 20);
  return base.length >= 3 ? base : `maker-${shortHash(`${name}|${email ?? ""}`)}`;
}

/** Apple "Hide My Email" relays are real, working addresses — show them, but label them. */
export function isPrivateRelay(email: string | null): boolean {
  return !!email && /@privaterelay\.appleid\.com$/i.test(email);
}
