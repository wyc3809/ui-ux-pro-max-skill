import type { PaymentEvent } from "./events.ts";
import {
  disputeEntry,
  type Entry,
  type Order,
  payoutReversalEntry,
  periodOf,
  planPayout,
  refundEntry,
  saleEntry,
  splitSale,
} from "./ledger.ts";
import type { Channel } from "./ledger.ts";

/**
 * Applies payment events and runs the monthly settlement against a `Store` (Postgres in production, an
 * in-memory copy in tests). Every write is idempotent: orders are unique per provider transaction, ledger
 * entries per source key, payouts per seller and period; so a provider retrying a webhook, or a settlement
 * run that died half way and is started again, never moves money twice.
 */
export interface Store {
  seenEvent(provider: Channel, eventId: string): Promise<boolean>;
  recordEvent(provider: Channel, eventId: string, type: string): Promise<void>;
  /** The seller of a live listing (web checkout). */
  listingSeller(listingId: string): Promise<{ listingId: string; sellerId: string } | null>;
  /** Claims the buyer's open purchase intent for this IAP tier; the same transaction always gets the same intent. */
  matchIntent(buyerId: string, productId: string, externalId: string): Promise<{ listingId: string; sellerId: string } | null>;
  findOrder(provider: Channel, externalId: string): Promise<Order | null>;
  /** Inserts the order, or returns the existing one for this provider transaction. */
  insertOrder(o: Omit<Order, "id"> & { provider: Channel; externalId: string; buyerId: string; listingId: string }): Promise<Order>;
  /** Records a refund once and says how much of the order earlier refunds took back. `amount` absent = the rest. */
  recordRefund(orderId: string, refundId: string, amount: number | undefined, at: string): Promise<{ amount: number; refundedBefore: number }>;
  insertEntries(entries: Entry[]): Promise<void>;
  setAccount(stripeAccountId: string, payoutsEnabled: boolean, detailsSubmitted: boolean): Promise<void>;
  /** Sellers with any ledger entry. */
  sellers(): Promise<string[]>;
  /** What is payable now: the same sum as `balance(entries, now).available`, computed by the database. */
  available(sellerId: string, now: string): Promise<number>;
  account(sellerId: string): Promise<{ stripeAccountId: string; payoutsEnabled: boolean } | null>;
  /**
   * Atomically re-checks the payable balance, inserts the payout and its ledger debit. Returns null when this
   * seller already has a live payout for the period.
   */
  createPayout(p: { sellerId: string; period: string; gross: number; fee: number; now: string }): Promise<{ id: string } | null>;
  pendingPayouts(): Promise<{ id: string; sellerId: string; gross: number; net: number }[]>;
  markPayout(id: string, result: { status: "paid"; transferId: string } | { status: "failed"; failure: string }): Promise<void>;
}

export interface Transfers {
  /** Moves `amount` to the seller's Stripe account; Stripe pays it out to their bank. */
  transfer(t: { amount: number; destination: string; payoutId: string }): Promise<{ id: string }>;
}

export class SettlementError extends Error {}

export async function handleEvent(store: Store, ev: PaymentEvent): Promise<"applied" | "duplicate" | "ignored"> {
  if (await store.seenEvent(ev.provider, ev.eventId)) return "duplicate";
  if (ev.type !== "ignored") await apply(store, ev);
  await store.recordEvent(ev.provider, ev.eventId, ev.type);
  return ev.type === "ignored" ? "ignored" : "applied";
}

async function apply(store: Store, ev: Exclude<PaymentEvent, { type: "ignored" }>) {
  if (ev.type === "account") return store.setAccount(ev.stripeAccountId, ev.payoutsEnabled, ev.detailsSubmitted);

  if (ev.type === "sale") {
    const listing = ev.listingId ? await store.listingSeller(ev.listingId) : ev.productId ? await store.matchIntent(ev.buyerId, ev.productId, ev.externalId) : null;
    // Thrown, not swallowed: the provider retries, and the intent may simply not have been written yet.
    if (!listing) throw new SettlementError(ev.listingId ? "listingNotFound" : "intentNotFound");
    if (listing.sellerId === ev.buyerId) throw new SettlementError("selfPurchase");
    const split = splitSale(ev.gross, ev.provider, { actualChannelFee: ev.actualChannelFee });
    const order = await store.insertOrder({ ...split, provider: ev.provider, externalId: ev.externalId, buyerId: ev.buyerId, listingId: listing.listingId, sellerId: listing.sellerId, purchasedAt: ev.at });
    return store.insertEntries([saleEntry(order)]);
  }

  const order = await store.findOrder(ev.provider, ev.externalId);
  if (!order) throw new SettlementError("orderNotFound");
  if (ev.type === "refund") {
    const r = await store.recordRefund(order.id, ev.refundId, ev.amount, ev.at);
    const entry = refundEntry(order, { id: ev.refundId, amount: r.amount, at: ev.at }, r.refundedBefore);
    return entry ? store.insertEntries([entry]) : undefined;
  }
  const entry = disputeEntry(order, { id: ev.disputeId, status: ev.status, at: ev.at });
  if (entry) await store.insertEntries([entry]);
}

export type SettlementReport = {
  period: string;
  paid: { sellerId: string; payoutId: string; net: number }[];
  skipped: { sellerId: string; reason: string; available: number }[];
  failed: { sellerId: string; payoutId: string; failure: string }[];
};

/**
 * The monthly run. First finishes payouts an earlier run left pending (the transfer is idempotent per payout,
 * so a transfer that did go through is not sent twice), then pays every seller whose balance is due.
 */
export async function runSettlement(store: Store, transfers: Transfers, now: string): Promise<SettlementReport> {
  const report: SettlementReport = { period: periodOf(now), paid: [], skipped: [], failed: [] };

  const send = async (p: { id: string; sellerId: string; gross: number; net: number }) => {
    const account = await store.account(p.sellerId);
    try {
      if (!account?.payoutsEnabled) throw new SettlementError("accountNotReady");
      const t = await transfers.transfer({ amount: p.net, destination: account.stripeAccountId, payoutId: p.id });
      await store.markPayout(p.id, { status: "paid", transferId: t.id });
      report.paid.push({ sellerId: p.sellerId, payoutId: p.id, net: p.net });
    } catch (e) {
      const failure = e instanceof Error ? e.message : String(e);
      await store.markPayout(p.id, { status: "failed", failure });
      await store.insertEntries([payoutReversalEntry(p.sellerId, p.id, p.gross, now)]);
      report.failed.push({ sellerId: p.sellerId, payoutId: p.id, failure });
    }
  };

  for (const p of await store.pendingPayouts()) await send(p);

  for (const sellerId of await store.sellers()) {
    const available = await store.available(sellerId, now);
    const plan = planPayout(available, await store.account(sellerId));
    if (plan.status === "skip") {
      if (available !== 0) report.skipped.push({ sellerId, reason: plan.reason, available });
      continue;
    }
    let payout: { id: string } | null;
    try {
      payout = await store.createPayout({ sellerId, period: report.period, gross: plan.gross, fee: plan.fee, now });
    } catch (e) {
      // A refund landed between reading the balance and writing the payout; next run pays the new balance.
      report.skipped.push({ sellerId, reason: e instanceof Error ? e.message : String(e), available });
      continue;
    }
    if (!payout) continue;
    await send({ id: payout.id, sellerId, gross: plan.gross, net: plan.net });
  }
  return report;
}
