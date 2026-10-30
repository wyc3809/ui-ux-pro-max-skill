import type { Store } from "./apply.ts";
import type { Channel, Order } from "./ledger.ts";

/**
 * The production Store: Postgres through PostgREST with the service role key (Edge Functions only, never the
 * app). Plain fetch, so the functions need no npm packages. Uniqueness rules live in the migration; inserts
 * here lean on them with `on_conflict` so replays are no-ops.
 */
export function postgresStore(url: string, serviceKey: string): Store {
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" };

  async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${url}/rest/v1/${path}`, { ...init, headers: { ...headers, ...(init.headers as Record<string, string>) } });
    const text = await res.text();
    if (!res.ok) {
      // Surface the SQL exception text ('balanceChanged', 'orderNotFound', …) as the error message.
      let message = text;
      try {
        message = (JSON.parse(text) as { message?: string }).message ?? text;
      } catch {}
      throw new Error(message);
    }
    return (text ? JSON.parse(text) : null) as T;
  }
  const rpc = <T>(fn: string, args: object) => call<T>(`rpc/${fn}`, { method: "POST", body: JSON.stringify(args) });
  const q = encodeURIComponent;

  type OrderRow = { id: string; seller_id: string; gross: number; channel_fee: number; platform_fee: number; seller_amount: number; purchased_at: string };
  const toOrder = (r: OrderRow): Order => ({
    id: r.id,
    sellerId: r.seller_id,
    gross: Number(r.gross),
    channelFee: Number(r.channel_fee),
    platformFee: Number(r.platform_fee),
    sellerAmount: Number(r.seller_amount),
    purchasedAt: r.purchased_at,
  });

  const findOrder = async (provider: Channel, externalId: string) => {
    const rows = await call<OrderRow[]>(`orders?provider=eq.${q(provider)}&external_id=eq.${q(externalId)}&select=*`);
    return rows[0] ? toOrder(rows[0]) : null;
  };

  return {
    seenEvent: async (provider, eventId) => (await call<unknown[]>(`webhook_events?provider=eq.${q(provider)}&event_id=eq.${q(eventId)}&select=event_id`)).length > 0,
    recordEvent: async (provider, eventId, type) => {
      await call("webhook_events?on_conflict=provider,event_id", {
        method: "POST",
        headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
        body: JSON.stringify({ provider, event_id: eventId, type }),
      });
    },
    listingSeller: async (listingId) => {
      const rows = await call<{ listing_id: string; seller_id: string }[]>(`listing_prices?listing_id=eq.${q(listingId)}&live=eq.true&select=listing_id,seller_id`);
      return rows[0] ? { listingId: rows[0].listing_id, sellerId: rows[0].seller_id } : null;
    },
    matchIntent: async (buyerId, productId, externalId) => {
      const rows = await rpc<{ listing_id: string | null; seller_id: string | null }[]>("match_purchase_intent", { p_buyer: buyerId, p_product: productId, p_external: externalId });
      const r = rows[0];
      return r?.listing_id && r.seller_id ? { listingId: r.listing_id, sellerId: r.seller_id } : null;
    },
    findOrder,
    insertOrder: async (o) => {
      await call("orders?on_conflict=provider,external_id", {
        method: "POST",
        headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
        body: JSON.stringify({
          provider: o.provider,
          external_id: o.externalId,
          buyer_id: o.buyerId,
          seller_id: o.sellerId,
          listing_id: o.listingId,
          gross: o.gross,
          channel_fee: o.channelFee,
          platform_fee: o.platformFee,
          seller_amount: o.sellerAmount,
          purchased_at: o.purchasedAt,
        }),
      });
      // Read back, so a replay gets the order (and split) recorded the first time.
      const order = await findOrder(o.provider, o.externalId);
      if (!order) throw new Error("orderNotSaved");
      return order;
    },
    recordRefund: async (orderId, refundId, amount, at) => {
      const rows = await rpc<{ amount: number; refunded_before: number }[]>("record_refund", { p_order: orderId, p_refund: refundId, p_amount: amount ?? null, p_at: at });
      return { amount: Number(rows[0]?.amount ?? 0), refundedBefore: Number(rows[0]?.refunded_before ?? 0) };
    },
    insertEntries: async (entries) => {
      if (!entries.length) return;
      await call("ledger_entries?on_conflict=source_key", {
        method: "POST",
        headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
        body: JSON.stringify(
          entries.map((e) => ({
            seller_id: e.sellerId,
            kind: e.kind,
            amount: e.amount,
            available_at: e.availableAt,
            source_key: e.sourceKey,
            order_id: e.orderId ?? null,
            payout_id: e.payoutId ?? null,
          })),
        ),
      });
    },
    setAccount: async (stripeAccountId, payoutsEnabled, detailsSubmitted) => {
      await call(`connect_accounts?stripe_account_id=eq.${q(stripeAccountId)}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ payouts_enabled: payoutsEnabled, details_submitted: detailsSubmitted, updated_at: new Date().toISOString() }),
      });
    },
    // RPCs rather than table reads: PostgREST caps rows per response, and a sum must see every entry.
    sellers: async () => rpc<string[]>("ledger_sellers", {}),
    available: async (sellerId, now) => {
      const rows = await rpc<{ available: number }[]>("seller_balance", { p_seller: sellerId, p_now: now });
      return Number(rows[0]?.available ?? 0);
    },
    account: async (sellerId) => {
      const rows = await call<{ stripe_account_id: string; payouts_enabled: boolean }[]>(`connect_accounts?seller_id=eq.${q(sellerId)}&select=stripe_account_id,payouts_enabled`);
      return rows[0] ? { stripeAccountId: rows[0].stripe_account_id, payoutsEnabled: rows[0].payouts_enabled } : null;
    },
    createPayout: async ({ sellerId, period, gross, fee, now }) => {
      const id = await rpc<string | null>("create_payout", { p_seller: sellerId, p_period: period, p_gross: gross, p_fee: fee, p_now: now });
      return id ? { id } : null;
    },
    pendingPayouts: async () => {
      const rows = await call<{ id: string; seller_id: string; gross: number; net: number }[]>("payouts?status=eq.pending&select=id,seller_id,gross,net");
      return rows.map((r) => ({ id: r.id, sellerId: r.seller_id, gross: Number(r.gross), net: Number(r.net) }));
    },
    markPayout: async (id, result) => {
      await call(`payouts?id=eq.${q(id)}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify(
          result.status === "paid"
            ? { status: "paid", stripe_transfer_id: result.transferId, updated_at: new Date().toISOString() }
            : { status: "failed", failure: result.failure, updated_at: new Date().toISOString() },
        ),
      });
    },
  };
}
