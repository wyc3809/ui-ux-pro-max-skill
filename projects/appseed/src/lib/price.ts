/**
 * Display-only price helpers. Real prices and revenue split are decided on the
 * server (supabase/functions/settlement) — never trust these for money movement.
 */
export const PRICE_TIERS = [0, 38, 78, 158, 388, 788] as const;
export type PriceTier = (typeof PRICE_TIERS)[number];

export type Currency = "HKD" | "USD";

export function isPriceTier(n: number): n is PriceTier {
  return (PRICE_TIERS as readonly number[]).includes(n);
}

export function formatPrice(amount: number, currency: Currency, freeLabel: string): string {
  if (amount === 0) return freeLabel;
  const symbol = currency === "HKD" ? "HK$" : "US$";
  const fixed = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
  return `${symbol}${fixed.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

/** Preview of what a creator receives: platform store fee first, then the marketplace cut. */
export function estimateCreatorShare(gross: number, storeFeeRate: number, platformRate: number): number {
  if (gross <= 0) return 0;
  const afterStore = gross * (1 - storeFeeRate);
  return Math.round(afterStore * (1 - platformRate) * 100) / 100;
}
