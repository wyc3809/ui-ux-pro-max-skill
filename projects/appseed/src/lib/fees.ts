/**
 * Fee schedule (docs/DESIGN.md §31). One place for every rate the terms, the studio and the buyout screens
 * show, so the disclosure can never drift from what is charged. AppSeed's own rates are business decisions
 * (placeholders until confirmed); third-party rates are approximate public prices that change, and the terms
 * say so. The server's settlement uses its own copy of this schedule; these numbers are for display.
 */
export const FEES = {
  /** AppSeed's share of each sale, taken after the store or card fee. */
  platformRate: 0.2,
  /** Apple / Google commission: 15% under the small business programmes, 30% above US$1M a year. */
  storeRate: 0.15,
  storeRateLarge: 0.3,
  /** Stripe card payments on the web (approximate Hong Kong pricing). */
  cardRate: 0.034,
  cardFixed: 2.35,
  cardIntlExtra: 0.005,
  chargebackFee: 85,
  /** RevenueCat charges ~1% of revenue above US$2,500 a month; AppSeed absorbs it. */
  revenueCatRate: 0.01,
  /** Stripe Connect payout: ~0.25% + HK$0.25 per transfer, deducted from that payout. */
  payoutRate: 0.0025,
  payoutFixed: 0.25,
  /** Settlement rules. */
  payoutMinimum: 100,
  holdDays: 30,
  /** Escrow provider fee for buyouts (paid by the buyer by default): starts at ~3.25%, lower for larger deals. */
  escrowRateFrom: 0.0325,
  escrowMinimum: 80,
  /** AppSeed's buyout commission, paid by the seller, deducted by the escrow provider at release. */
  buyoutCommission: 0.05,
  buyoutCommissionMinimum: 500,
  /** Notice before AppSeed changes its own rates. */
  noticeDays: 30,
} as const;

export type Channel = "ios" | "android" | "web";

const round2 = (n: number) => Math.round(n * 100) / 100;

/** What happens to one sale: the store or card fee, AppSeed's share, and what the seller receives. */
export function splitSale(gross: number, channel: Channel, opts: { largeDeveloper?: boolean; intlCard?: boolean } = {}) {
  if (gross <= 0) return { gross: 0, channelFee: 0, net: 0, platform: 0, seller: 0 };
  const channelFee =
    channel === "web"
      ? gross * (FEES.cardRate + (opts.intlCard ? FEES.cardIntlExtra : 0)) + FEES.cardFixed
      : gross * (opts.largeDeveloper ? FEES.storeRateLarge : FEES.storeRate);
  const net = gross - channelFee;
  const platform = net * FEES.platformRate;
  return { gross, channelFee: round2(channelFee), net: round2(net), platform: round2(platform), seller: round2(net - platform) };
}

/** A monthly payout: nothing below the minimum (it rolls over); otherwise the Stripe transfer fee comes off. */
export function payoutAmount(balance: number): { paid: number; fee: number; rolledOver: number } {
  if (balance < FEES.payoutMinimum) return { paid: 0, fee: 0, rolledOver: round2(Math.max(0, balance)) };
  const fee = round2(balance * FEES.payoutRate + FEES.payoutFixed);
  return { paid: round2(balance - fee), fee, rolledOver: 0 };
}

/** Buyout costs, shown as two separate lines: the escrow provider's fee and AppSeed's commission. */
export function buyoutCosts(asking: number) {
  const escrowFee = Math.max(FEES.escrowMinimum, Math.round(asking * FEES.escrowRateFrom));
  const commission = Math.max(FEES.buyoutCommissionMinimum, Math.round(asking * FEES.buyoutCommission));
  return { escrowFee, commission, buyerPays: asking + escrowFee, sellerReceives: asking - commission };
}

export const pct = (rate: number) => `${Math.round(rate * 10000) / 100}%`;
