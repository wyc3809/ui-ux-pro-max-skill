// Receives RevenueCat (/payments-webhook/revenuecat) and Stripe (/payments-webhook/stripe) webhooks and writes
// orders and ledger entries. Answers 200 once applied (or already applied), 400 for a bad signature or body,
// and 500 when it should be retried later (e.g. a refund arrived before its sale).
import { handleEvent, SettlementError } from "../_shared/apply.ts";
import { postgresStore } from "../_shared/db.ts";
import { fromRevenueCat, fromStripe, type PaymentEvent } from "../_shared/events.ts";
import { verifyBearer, verifyStripe } from "../_shared/verify.ts";

const env = (k: string) => Deno.env.get(k) ?? "";
const store = postgresStore(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
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
    } else if (route === "revenuecat") {
      if (!verifyBearer(req.headers.get("authorization"), env("REVENUECAT_WEBHOOK_SECRET"))) return json(400, { error: "badSignature" });
      event = fromRevenueCat(JSON.parse(body), Number(env("HKD_PER_USD") || "7.8"));
    } else return json(404, { error: "unknownProvider" });
  } catch (e) {
    return json(400, { error: e instanceof Error ? e.message : "badBody" });
  }

  try {
    return json(200, { result: await handleEvent(store, event) });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("payments-webhook", event.provider, event.eventId, message);
    // A self purchase can never succeed; acknowledge it so the provider stops retrying, and leave it for support.
    if (e instanceof SettlementError && message === "selfPurchase") return json(200, { result: "rejected", reason: message });
    return json(500, { error: message });
  }
});
