// Creates a Stripe Checkout session for a web purchase. POST { slug, returnUrl } with the buyer's token.
import { CheckoutError, createCheckout } from "../_shared/checkout.ts";
import { signedInEndpoint } from "../_shared/http.ts";
import { enc, serviceRest } from "../_shared/rest.ts";
import { stripeClient } from "../_shared/stripeApi.ts";

const env = (k: string) => Deno.env.get(k) ?? "";
const rest = serviceRest(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
// Restricted key with Checkout Sessions (write) only.
const stripe = stripeClient(env("STRIPE_CHECKOUT_KEY") || env("STRIPE_SECRET_KEY"));

const endpoint = signedInEndpoint("checkout", [CheckoutError], (userId, body) =>
  createCheckout(
    {
      async price(slug) {
        const [p] = await rest.select<{ seller_id: string; price: number }>(`listing_prices?listing_id=eq.${enc(slug)}&live=eq.true&select=seller_id,price`);
        const [l] = await rest.select<{ data: { name?: string; title?: string } }>(`listings?slug=eq.${enc(slug)}&status=eq.live&select=data`);
        return p && l ? { sellerId: p.seller_id, price: Number(p.price), name: l.data.name ?? l.data.title ?? slug } : null;
      },
      owns: (u, slug) => rest.rpc<boolean>("owns", { p_user: u, p_slug: slug }),
    },
    stripe,
    userId,
    body,
    env("SITE_URL"),
    { invoices: env("STRIPE_INVOICES") === "1" },
  ),
);
Deno.serve((req) => endpoint(req, env));
