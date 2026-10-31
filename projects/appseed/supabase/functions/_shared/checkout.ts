import { SCHEDULE } from "./schedule.ts";
import { safeReturn, type StripePost } from "./stripeApi.ts";

/**
 * Stripe Checkout for web purchases (the app uses IAP). The price comes from `listing_prices`, never from the
 * request; metadata carries the listing and buyer so the payments webhook can write the order (§32).
 */
export interface CheckoutDb {
  price(slug: string): Promise<{ sellerId: string; price: number; name: string } | null>;
  owns(userId: string, slug: string): Promise<boolean>;
}

export class CheckoutError extends Error {}

export async function createCheckout(db: CheckoutDb, stripe: StripePost, userId: string, body: { slug?: unknown; returnUrl?: unknown }, site: string) {
  const slug = typeof body.slug === "string" ? body.slug : "";
  const listing = await db.price(slug);
  if (!listing) throw new CheckoutError("notFound");
  if (listing.sellerId === userId) throw new CheckoutError("selfPurchase");
  if (await db.owns(userId, slug)) throw new CheckoutError("alreadyOwned");
  const back = safeReturn(body.returnUrl, site);
  const join = (u: string, k: string) => `${u}${u.includes("?") ? "&" : "?"}checkout=${k}`;
  const session = await stripe("checkout/sessions", {
    mode: "payment",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": SCHEDULE.currency.toLowerCase(),
    "line_items[0][price_data][unit_amount]": String(listing.price),
    "line_items[0][price_data][product_data][name]": listing.name.slice(0, 120) || slug,
    success_url: join(back, "success"),
    cancel_url: join(back, "cancelled"),
    client_reference_id: userId,
    "metadata[listing_id]": slug,
    "metadata[buyer_id]": userId,
    "payment_intent_data[metadata][listing_id]": slug,
    "payment_intent_data[metadata][buyer_id]": userId,
  });
  return { url: String(session.url) };
}
