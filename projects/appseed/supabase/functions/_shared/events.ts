import { SCHEDULE } from "./schedule.ts";
import type { Channel } from "./ledger.ts";

/**
 * Turns RevenueCat and Stripe webhook bodies into one event shape, so the rest of settlement never looks at a
 * provider payload. Amounts become integer minor units of SCHEDULE.currency.
 */
export type PaymentEvent =
  | {
      type: "sale";
      provider: Channel;
      eventId: string;
      externalId: string;
      buyerId: string;
      /** IAP: the fixed price tier bought, matched to the buyer's purchase intent. */
      productId?: string;
      /** Web: the listing the checkout session was created for. */
      listingId?: string;
      gross: number;
      actualChannelFee?: number;
      at: string;
    }
  | { type: "refund"; provider: Channel; eventId: string; externalId: string; refundId: string; amount?: number; at: string }
  | { type: "dispute"; provider: Channel; eventId: string; externalId: string; disputeId: string; status: "open" | "won" | "lost"; at: string }
  | { type: "account"; provider: Channel; eventId: string; stripeAccountId: string; payoutsEnabled: boolean; detailsSubmitted: boolean }
  | { type: "ignored"; provider: Channel; eventId: string };

const iso = (ms: number) => new Date(ms).toISOString();
const cents = (major: number) => Math.round(Math.abs(major) * 100);

export type RcEvent = {
  id: string;
  type: string;
  app_user_id: string;
  product_id: string;
  transaction_id: string;
  store: string;
  price?: number;
  price_in_purchased_currency?: number;
  currency?: string;
  takehome_percentage?: number;
  purchased_at_ms?: number;
  event_timestamp_ms: number;
  cancel_reason?: string;
};

/**
 * RevenueCat webhook. Store purchases are converted to HKD: amounts already in HKD are used as they are,
 * anything else from RevenueCat's USD `price` at `hkdPerUsd` (HKD is pegged, so the error is small).
 */
export function fromRevenueCat(body: { event: RcEvent }, hkdPerUsd: number): PaymentEvent {
  const e = body.event;
  const provider: Channel | null = e.store === "APP_STORE" || e.store === "MAC_APP_STORE" ? "app_store" : e.store === "PLAY_STORE" ? "play_store" : null;
  if (!provider) return { type: "ignored", provider: "app_store", eventId: e.id };
  const amount =
    e.currency === SCHEDULE.currency && e.price_in_purchased_currency != null ? cents(e.price_in_purchased_currency) : e.price != null ? Math.round(cents(e.price) * hkdPerUsd) : undefined;

  if (e.type === "NON_RENEWING_PURCHASE" || e.type === "INITIAL_PURCHASE") {
    if (!amount) throw new Error("invalidAmount");
    return {
      type: "sale",
      provider,
      eventId: e.id,
      externalId: e.transaction_id,
      buyerId: e.app_user_id,
      productId: e.product_id,
      gross: amount,
      actualChannelFee: e.takehome_percentage != null ? amount - Math.round(amount * e.takehome_percentage) : undefined,
      at: iso(e.purchased_at_ms ?? e.event_timestamp_ms),
    };
  }
  // RevenueCat reports a store refund as a cancellation with reason CUSTOMER_SUPPORT.
  if (e.type === "CANCELLATION" && e.cancel_reason === "CUSTOMER_SUPPORT") {
    return { type: "refund", provider, eventId: e.id, externalId: e.transaction_id, refundId: e.id, amount: amount || undefined, at: iso(e.event_timestamp_ms) };
  }
  return { type: "ignored", provider, eventId: e.id };
}

type StripeEvent = { id: string; type: string; created: number; data: { object: Record<string, unknown> } };

export function fromStripe(body: StripeEvent): PaymentEvent {
  const o = body.data.object;
  const base = { provider: "stripe" as const, eventId: body.id };
  const at = iso(((o.created as number | undefined) ?? body.created) * 1000);
  switch (body.type) {
    case "checkout.session.completed": {
      if (o.payment_status !== "paid") return { type: "ignored", ...base };
      if (String(o.currency).toUpperCase() !== SCHEDULE.currency) throw new Error("unsupportedCurrency");
      const meta = (o.metadata ?? {}) as Record<string, string>;
      if (!meta.listing_id || !meta.buyer_id) throw new Error("missingMetadata");
      return { type: "sale", ...base, externalId: String(o.payment_intent), buyerId: meta.buyer_id, listingId: meta.listing_id, gross: Number(o.amount_total), at };
    }
    case "refund.created":
      return { type: "refund", ...base, externalId: String(o.payment_intent), refundId: String(o.id), amount: Number(o.amount), at };
    case "charge.dispute.created":
    case "charge.dispute.closed": {
      const status = body.type === "charge.dispute.created" ? "open" : o.status === "lost" ? "lost" : "won";
      return { type: "dispute", ...base, externalId: String(o.payment_intent), disputeId: String(o.id), status, at };
    }
    case "account.updated":
      return { type: "account", ...base, stripeAccountId: String(o.id), payoutsEnabled: o.payouts_enabled === true, detailsSubmitted: o.details_submitted === true };
    default:
      return { type: "ignored", ...base };
  }
}
