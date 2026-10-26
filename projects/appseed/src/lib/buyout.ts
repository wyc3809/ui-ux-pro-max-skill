/**
 * Whole-app buyout rules. Buyouts are business transfers paid through escrow on the web,
 * never through in-app purchase; the app only shows listings, takes offers and explains the steps.
 */
export type BuyoutStatus = "open" | "negotiating" | "sold";

/** Asking price as a multiple of annual revenue, one decimal. No revenue → null ("pre-revenue"). */
export function revenueMultiple(asking: number, monthlyRevenue: number): number | null {
  if (monthlyRevenue <= 0) return null;
  return Math.round((asking / (monthlyRevenue * 12)) * 10) / 10;
}

export const MIN_OFFER_RATIO = 0.5;

export type OfferError = "offerTooLow" | "offerInvalid" | "listingSold";

/** Offers must be positive whole dollars and at least half the asking price; at or above asking = buy now. */
export function validateOffer(amount: number, asking: number, status: BuyoutStatus): OfferError | null {
  if (status === "sold") return "listingSold";
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isInteger(amount)) return "offerInvalid";
  if (amount < Math.ceil(asking * MIN_OFFER_RATIO)) return "offerTooLow";
  return null;
}

/** Offer stepper increment scales with the price so a few taps cover a sensible range. */
export function offerStep(asking: number): number {
  if (asking >= 100_000) return 5_000;
  if (asking >= 20_000) return 1_000;
  return 500;
}

/** Escrow fee preview (server decides the real fee): 5%, minimum HK$500. */
export function escrowFee(amount: number): number {
  return Math.max(500, Math.round(amount * 0.05));
}

export const ESCROW_STEPS = ["agree", "deposit", "transfer", "verify", "release"] as const;

/** Listing status → semantic tone (never the brand colour). */
export function buyoutTone(status: BuyoutStatus): "live" | "pending" | "ended" {
  return status === "open" ? "live" : status === "negotiating" ? "pending" : "ended";
}
