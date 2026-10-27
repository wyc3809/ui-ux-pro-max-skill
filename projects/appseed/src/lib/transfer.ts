import type { Platform } from "@/api/types";

/**
 * Store transfer rules for whole-app buyouts (docs/DESIGN.md §22.2). A buyout sells the app, never the
 * developer account: Apple accounts can't change hands, and monetised individual Play accounts can only
 * move apps one by one. Both stores have an official per-app transfer that keeps users, ratings and
 * reviews; these helpers decide whether a listing can use it and what else has to be handed over.
 * Rules follow Apple's "App transfer criteria" and Google's "Transfer apps"; recheck them when they change.
 */

/** What the seller declares about the live app when listing it. */
export type StoreFacts = {
  platforms: Platform[];
  /** At least one version has been released on each store (Apple requires it; Play needs a published app). */
  released: boolean;
  /** A version is waiting for review, in review, pending release, or on pre-order. */
  inReview: boolean;
  /** TestFlight beta testing is still switched on (Apple: turn it off before transferring). */
  testflightOn: boolean;
  signInWithApple: boolean;
  /** Android only: Google holds the signing key, so only the upload key changes hands. */
  playAppSigning: boolean;
};

export type ReadinessKey = "notReleased" | "inReview" | "testflightOn" | "siwaMigration" | "signingKey" | "webOnly";
export type ReadinessIssue = { key: ReadinessKey; level: "block" | "warn" };

const hasIos = (p: Platform[]) => p.includes("iOS");
const hasAndroid = (p: Platform[]) => p.includes("Android");

/** Blocking issues stop the listing from being published; warnings are shown to buyers on the listing. */
export function transferReadiness(f: StoreFacts): ReadinessIssue[] {
  const out: ReadinessIssue[] = [];
  const store = hasIos(f.platforms) || hasAndroid(f.platforms);
  if (!store) return [{ key: "webOnly", level: "warn" }];
  if (!f.released) out.push({ key: "notReleased", level: "block" });
  if (f.inReview) out.push({ key: "inReview", level: "block" });
  if (hasIos(f.platforms) && f.testflightOn) out.push({ key: "testflightOn", level: "block" });
  // Apple changes Sign in with Apple user identifiers on transfer; users must be migrated with transfer identifiers.
  if (hasIos(f.platforms) && f.signInWithApple) out.push({ key: "siwaMigration", level: "warn" });
  if (hasAndroid(f.platforms) && !f.playAppSigning) out.push({ key: "signingKey", level: "warn" });
  return out;
}

export const isTransferReady = (f: StoreFacts) => transferReadiness(f).every((i) => i.level !== "block");

export type HandoverKey = "appStore" | "googlePlay" | "siwaMigration" | "signingKey" | "source" | "backend" | "payments" | "domain" | "social" | "secrets";

export type HandoverInput = {
  platforms: Platform[];
  stack: string[];
  signInWithApple: boolean;
  playAppSigning: boolean;
  domain: boolean;
  social: boolean;
};

const BACKEND = /supabase|firebase|edge functions|convex|appwrite/i;
const PAYMENTS = /stripe|revenuecat|paddle|lemon/i;

/**
 * Everything the buyer must receive, in hand-over order. Store transfers come first because they are
 * the slowest (Apple: the buyer has 60 days to accept; Play support replies within about 2 business days).
 * Secrets always come last: every API key is rotated after the buyer controls the services.
 */
export function handoverItems(l: HandoverInput): HandoverKey[] {
  const out: HandoverKey[] = [];
  if (hasIos(l.platforms)) out.push("appStore");
  if (hasIos(l.platforms) && l.signInWithApple) out.push("siwaMigration");
  if (hasAndroid(l.platforms)) out.push("googlePlay");
  if (hasAndroid(l.platforms) && !l.playAppSigning) out.push("signingKey");
  out.push("source");
  if (l.stack.some((s) => BACKEND.test(s))) out.push("backend");
  if (l.stack.some((s) => PAYMENTS.test(s))) out.push("payments");
  if (l.domain) out.push("domain");
  if (l.social) out.push("social");
  out.push("secrets");
  return out;
}

/** Escrow releases the money only once the buyer has confirmed every hand-over item. */
export function canRelease(items: HandoverKey[], confirmed: HandoverKey[]): boolean {
  return items.length > 0 && items.every((i) => confirmed.includes(i));
}

export const pendingItems = (items: HandoverKey[], confirmed: HandoverKey[]) => items.filter((i) => !confirmed.includes(i));

/** Revenue is verified from read-only access the seller grants, never from screenshots. */
export const VERIFY_SOURCES = ["appStoreConnect", "playConsole", "revenueCat", "stripe"] as const;
export type VerifySource = (typeof VERIFY_SOURCES)[number];

/** Which read-only sources make sense for the app's platforms and stack. */
export function verifyOptions(platforms: Platform[], stack: string[]): VerifySource[] {
  const out: VerifySource[] = [];
  if (hasIos(platforms)) out.push("appStoreConnect");
  if (hasAndroid(platforms)) out.push("playConsole");
  if (stack.some((s) => /revenuecat/i.test(s))) out.push("revenueCat");
  if (stack.some((s) => /stripe/i.test(s)) || platforms.includes("Web")) out.push("stripe");
  return out;
}

/** A listing with revenue needs at least one read-only source before it can be published. */
export function needsVerification(monthlyRevenue: number, sources: VerifySource[]): boolean {
  return monthlyRevenue > 0 && sources.length === 0;
}
