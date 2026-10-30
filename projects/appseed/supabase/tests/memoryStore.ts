import type { Store } from "../functions/_shared/apply.ts";
import type { Channel, Entry, Order } from "../functions/_shared/ledger.ts";
import { balance, payoutEntry } from "../functions/_shared/ledger.ts";

/** In-memory Store with the same uniqueness rules as the migration, for settlement tests. */
export function memoryStore() {
  let seq = 0;
  const id = (p: string) => `${p}_${++seq}`;
  const events = new Set<string>();
  const listings = new Map<string, { listingId: string; sellerId: string; productId: string }>();
  const intents: { id: string; buyerId: string; listingId: string; productId: string; externalId?: string }[] = [];
  const orders: (Order & { provider: Channel; externalId: string; buyerId: string; listingId: string })[] = [];
  const refunds: { orderId: string; refundId: string; amount: number }[] = [];
  const entries: Entry[] = [];
  const accounts = new Map<string, { stripeAccountId: string; payoutsEnabled: boolean }>();
  const payouts: { id: string; sellerId: string; period: string; gross: number; fee: number; net: number; status: string; transferId?: string; failure?: string }[] = [];

  const store: Store = {
    seenEvent: async (p, e) => events.has(`${p}:${e}`),
    recordEvent: async (p, e) => void events.add(`${p}:${e}`),
    listingSeller: async (l) => listings.get(l) ?? null,
    matchIntent: async (buyerId, productId, externalId) => {
      const intent = intents.find((i) => i.externalId === externalId) ?? intents.find((i) => !i.externalId && i.buyerId === buyerId && i.productId === productId);
      if (!intent) return null;
      intent.externalId = externalId;
      return listings.get(intent.listingId) ?? null;
    },
    findOrder: async (p, x) => orders.find((o) => o.provider === p && o.externalId === x) ?? null,
    insertOrder: async (o) => {
      const existing = orders.find((e) => e.provider === o.provider && e.externalId === o.externalId);
      if (existing) return existing;
      if (o.channelFee + o.platformFee + o.sellerAmount !== o.gross) throw new Error("orders_split_check");
      const row = { ...o, id: id("order") };
      orders.push(row);
      return row;
    },
    recordRefund: async (orderId, refundId, amount) => {
      const order = orders.find((o) => o.id === orderId)!;
      const i = refunds.findIndex((r) => r.orderId === orderId && r.refundId === refundId);
      const mine = refunds.filter((r) => r.orderId === orderId);
      if (i >= 0) {
        const before = mine.slice(0, mine.indexOf(refunds[i]!)).reduce((s, r) => s + r.amount, 0);
        return { amount: refunds[i]!.amount, refundedBefore: before };
      }
      const before = mine.reduce((s, r) => s + r.amount, 0);
      const amt = Math.min(amount ?? order.gross - before, order.gross - before);
      if (amt > 0) refunds.push({ orderId, refundId, amount: amt });
      return { amount: Math.max(0, amt), refundedBefore: before };
    },
    insertEntries: async (list) => {
      for (const e of list) if (!entries.some((x) => x.sourceKey === e.sourceKey)) entries.push(e);
    },
    setAccount: async (acct, payoutsEnabled) => {
      for (const [seller, a] of accounts) if (a.stripeAccountId === acct) accounts.set(seller, { ...a, payoutsEnabled });
    },
    sellers: async () => [...new Set(entries.map((e) => e.sellerId))],
    available: async (s, now) => balance(entries.filter((e) => e.sellerId === s), now).available,
    account: async (s) => accounts.get(s) ?? null,
    createPayout: async ({ sellerId, period, gross, fee, now }) => {
      if (payouts.some((p) => p.sellerId === sellerId && p.period === period && p.status !== "failed")) return null;
      if (balance(entries.filter((e) => e.sellerId === sellerId), now).available !== gross) throw new Error("balanceChanged");
      const p = { id: id("payout"), sellerId, period, gross, fee, net: gross - fee, status: "pending" };
      payouts.push(p);
      entries.push(payoutEntry(sellerId, p.id, gross, now));
      return { id: p.id };
    },
    pendingPayouts: async () => payouts.filter((p) => p.status === "pending"),
    markPayout: async (pid, r) => {
      const p = payouts.find((x) => x.id === pid)!;
      Object.assign(p, r);
    },
  };

  return {
    store,
    data: { orders, entries, payouts, refunds },
    addListing: (listingId: string, sellerId: string, productId = "tier_158") => listings.set(listingId, { listingId, sellerId, productId }),
    addIntent: (buyerId: string, listingId: string) => intents.push({ id: id("intent"), buyerId, listingId, productId: listings.get(listingId)!.productId }),
    addAccount: (sellerId: string, stripeAccountId: string, payoutsEnabled = true) => accounts.set(sellerId, { stripeAccountId, payoutsEnabled }),
  };
}
