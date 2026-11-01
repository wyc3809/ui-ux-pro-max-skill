// Receives RevenueCat (/payments-webhook/revenuecat), Stripe snapshot events (/payments-webhook/stripe) and Stripe
// thin events for Accounts v2 (/payments-webhook/stripe-thin, its own event destination and secret) and writes
// orders and ledger entries. Answers 200 once applied (or already applied), 400 for a bad signature or body,
// and 500 when it should be retried later (e.g. a refund arrived before its sale).
import { handleEvent, SettlementError } from "../_shared/apply.ts";
import { postgresStore } from "../_shared/db.ts";
import { accountEvent } from "../_shared/connect.ts";
import { fromRevenueCat, fromStripe, fromStripeThin, type PaymentEvent } from "../_shared/events.ts";
import { stripeV2 } from "../_shared/stripeApi.ts";
import { verifyBearer, verifyStripe } from "../_shared/verify.ts";

const env = (k: string) => Deno.env.get(k) ?? "";
const store = postgresStore(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
// Restricted key: Connect accounts (read), to read an account's current state after a change notice.
const v2 = stripeV2(env("STRIPE_CONNECT_READ_KEY") || env("STRIPE_SECRET_KEY"));
const json = (status: number, body: object) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { error: "methodNotAllowed" });
  const route = new URL(req.url).pathname.split("/").pop();
  const body = await req.text();

  let event: PaymentEvent;
  try {
    if (route === "stripe") {
      if (!(await verifyStripe(body, req.headers.get("stripe-signature"), env("STRIPE_WEBHOOK_SECRET"), Date.now() / 1000))) return json(400, { error: "badSignature" });
      event = fromStripe(JSON.parse(body));
    } else if (route === "stripe-thin") {
      if (!(await verifyStripe(body, req.headers.get("stripe-signature"), env("STRIPE_THIN_WEBHOOK_SECRET"), Date.now() / 1000))) return json(400, { error: "badSignature" });
      event = fromStripeThin(JSON.parse(body));
    } else if (route === "revenuecat") {
      if (!verifyBearer(req.headers.get("authorization"), env("REVENUECAT_WEBHOOK_SECRET"))) return json(400, { error: "badSignature" });
      event = fromRevenueCat(JSON.parse(body), Number(env("HKD_PER_USD") || "7.8"));
    } else return json(404, { error: "unknownProvider" });
  } catch (e) {
    return json(400, { error: e instanceof Error ? e.message : "badBody" });
  }

  try {
    if (event.type === "accountChanged") event = await accountEvent(event, v2);
    return json(200, { result: await handleEvent(store, event) });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("payments-webhook", event.provider, event.eventId, message);
    // A self purchase can never succeed; acknowledge it so the provider stops retrying, and leave it for support.
    if (e instanceof SettlementError && message === "selfPurchase") return json(200, { result: "rejected", reason: message });
    return json(500, { error: message });
  }
});
