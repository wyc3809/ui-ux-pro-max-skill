// Monthly settlement, called by pg_cron (see the payments migration). Requires the cron secret; safe to run
// again, because payouts are unique per seller and month and transfers are idempotent per payout.
import { runSettlement } from "../_shared/apply.ts";
import { postgresStore } from "../_shared/db.ts";
import { stripeTransfers } from "../_shared/stripe.ts";
import { verifyBearer } from "../_shared/verify.ts";

const env = (k: string) => Deno.env.get(k) ?? "";

Deno.serve(async (req) => {
  if (req.method !== "POST" || !verifyBearer(req.headers.get("authorization"), env("SETTLEMENT_CRON_SECRET"))) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }
  const store = postgresStore(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
  const report = await runSettlement(store, stripeTransfers(env("STRIPE_SECRET_KEY")), new Date().toISOString());
  console.log("settlement", JSON.stringify({ period: report.period, paid: report.paid.length, skipped: report.skipped.length, failed: report.failed.length }));
  return new Response(JSON.stringify(report), { headers: { "Content-Type": "application/json" } });
});
