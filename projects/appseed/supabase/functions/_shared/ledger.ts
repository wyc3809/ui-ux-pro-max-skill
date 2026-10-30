import { bps, SCHEDULE } from "./schedule.ts";

/**
 * Seller ledger (docs/DESIGN.md §31). Pure functions: every money movement becomes an append-only entry with
 * a unique `sourceKey`, so a replayed webhook or a re-run settlement writes nothing twice. A seller's balance
 * is the sum of their entries; credits from sales unlock after the hold, debits count at once, so a refund or
 * dispute is recovered from the next payout and a shortfall carries forward as a negative balance.
 */
export type Channel = "app_store" | "play_store" | "stripe";

export type EntryKind = "sale" | "refund" | "dispute_hold" | "dispute_release" | "payout" | "payout_reversal";

export interface Entry {
  sellerId: string;
  kind: EntryKind;
  /** Minor units of SCHEDULE.currency; positive credits the seller. */
  amount: number;
  /** When the entry counts toward the payable balance (ISO time). */
  availableAt: string;
  sourceKey: string;
  orderId?: string;
  payoutId?: string;
}

export interface Order {
  id: string;
  sellerId: string;
  gross: number;
  channelFee: number;
  platformFee: number;
  sellerAmount: number;
  purchasedAt: string;
}

const DAY = 86_400_000;
const addDays = (iso: string, days: number) => new Date(Date.parse(iso) + days * DAY).toISOString();

/**
 * Splits a sale: the store or card fee first, then AppSeed's share of what is left. Pass the fee the provider
 * actually charged when it is known (RevenueCat's take-home, Stripe's balance transaction); otherwise the
 * schedule's estimate is used.
 */
export function splitSale(gross: number, channel: Channel, opts: { actualChannelFee?: number; largeDeveloper?: boolean; intlCard?: boolean } = {}) {
  if (!Number.isInteger(gross) || gross <= 0) throw new Error("invalidAmount");
  const estimate =
    channel === "stripe"
      ? bps(gross, SCHEDULE.cardBps + (opts.intlCard ? SCHEDULE.cardIntlExtraBps : 0)) + SCHEDULE.cardFixed
      : bps(gross, opts.largeDeveloper ? SCHEDULE.storeLargeBps : SCHEDULE.storeBps);
  const channelFee = Math.min(gross, Math.max(0, Math.round(opts.actualChannelFee ?? estimate)));
  const net = gross - channelFee;
  const platformFee = bps(net, SCHEDULE.platformBps);
  return { gross, channelFee, platformFee, sellerAmount: net - platformFee };
}

export function saleEntry(order: Order): Entry {
  return {
    sellerId: order.sellerId,
    kind: "sale",
    amount: order.sellerAmount,
    availableAt: addDays(order.purchasedAt, SCHEDULE.holdDays),
    sourceKey: `sale:${order.id}`,
    orderId: order.id,
  };
}

/**
 * Reverses the seller's share of a (partial) refund. `refundedBefore` is what earlier refunds of this order
 * already took back, so several partial refunds never reverse more than the sale credited.
 */
export function refundEntry(order: Order, refund: { id: string; amount: number; at: string }, refundedBefore = 0): Entry | null {
  const already = Math.round((order.sellerAmount * Math.min(refundedBefore, order.gross)) / order.gross);
  const upTo = Math.round((order.sellerAmount * Math.min(refundedBefore + refund.amount, order.gross)) / order.gross);
  const amount = upTo - already;
  if (amount <= 0) return null;
  return { sellerId: order.sellerId, kind: "refund", amount: -amount, availableAt: refund.at, sourceKey: `refund:${order.id}:${refund.id}`, orderId: order.id };
}

/**
 * A dispute holds the seller's share while it is open; winning releases it and losing keeps it back. The card
 * network's dispute fee is AppSeed's (terms fee 8) and never reaches the seller's ledger.
 */
export function disputeEntry(order: Order, dispute: { id: string; status: "open" | "won" | "lost"; at: string }): Entry | null {
  if (dispute.status === "lost") return null;
  const open = dispute.status === "open";
  return {
    sellerId: order.sellerId,
    kind: open ? "dispute_hold" : "dispute_release",
    amount: open ? -order.sellerAmount : order.sellerAmount,
    availableAt: dispute.at,
    sourceKey: `${open ? "dispute" : "dispute-release"}:${order.id}:${dispute.id}`,
    orderId: order.id,
  };
}

/** Total, payable now, and still held. Credits wait for `availableAt`; debits always count. */
export function balance(entries: readonly Pick<Entry, "amount" | "availableAt">[], now: string) {
  let total = 0;
  let available = 0;
  const t = Date.parse(now);
  for (const e of entries) {
    total += e.amount;
    if (e.amount < 0 || Date.parse(e.availableAt) <= t) available += e.amount;
  }
  return { total, available, pending: total - available };
}

/** Settlement period for a run: the calendar month (UTC) it pays out, e.g. "2026-11". */
export const periodOf = (now: string) => now.slice(0, 7);

export const payoutFee = (amount: number) => bps(amount, SCHEDULE.payoutBps) + SCHEDULE.payoutFixed;

export type PayoutPlan =
  | { status: "pay"; gross: number; fee: number; net: number }
  | { status: "skip"; reason: "belowMinimum" | "accountNotReady"; available: number };

/**
 * One seller's monthly payout. Below the minimum (or a negative balance) rolls over; a seller whose Stripe
 * account cannot receive payouts keeps their balance until it can. The transfer fee comes off the payout.
 */
export function planPayout(available: number, account: { payoutsEnabled: boolean } | null): PayoutPlan {
  if (available < SCHEDULE.payoutMinimum) return { status: "skip", reason: "belowMinimum", available };
  if (!account?.payoutsEnabled) return { status: "skip", reason: "accountNotReady", available };
  const fee = payoutFee(available);
  return { status: "pay", gross: available, fee, net: available - fee };
}

export function payoutEntry(sellerId: string, payoutId: string, gross: number, now: string): Entry {
  return { sellerId, kind: "payout", amount: -gross, availableAt: now, sourceKey: `payout:${payoutId}`, payoutId };
}

/** A transfer that failed puts the money back, so the next run pays it again. */
export function payoutReversalEntry(sellerId: string, payoutId: string, gross: number, now: string): Entry {
  return { sellerId, kind: "payout_reversal", amount: gross, availableAt: now, sourceKey: `payout-reversal:${payoutId}`, payoutId };
}
