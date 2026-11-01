// Seller payout setup (Stripe Connect, Accounts v2 recipient with the Express dashboard). POST { action: "status" | "onboard" | "dashboard", returnUrl? }.
import { ConnectError, handleConnect } from "../_shared/connect.ts";
import { signedInEndpoint } from "../_shared/http.ts";
import { enc, serviceRest } from "../_shared/rest.ts";
import { stripeClient, stripeV2 } from "../_shared/stripeApi.ts";

const env = (k: string) => Deno.env.get(k) ?? "";
const rest = serviceRest(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
// Restricted key: Connect accounts + account links + login links (write).
const key = env("STRIPE_CONNECT_KEY") || env("STRIPE_SECRET_KEY");
const stripe = { v1: stripeClient(key), v2: stripeV2(key) };

const endpoint = signedInEndpoint("connect", [ConnectError], (userId, body) =>
  handleConnect(
    {
      async account(u) {
        const [a] = await rest.select<{ stripe_account_id: string; payouts_enabled: boolean; details_submitted: boolean }>(
          `connect_accounts?seller_id=eq.${enc(u)}&select=stripe_account_id,payouts_enabled,details_submitted`,
        );
        return a ? { stripeAccountId: a.stripe_account_id, payoutsEnabled: a.payouts_enabled, detailsSubmitted: a.details_submitted } : null;
      },
      saveAccount: (u, id) => rest.insert("connect_accounts", { seller_id: u, stripe_account_id: id }, "seller_id"),
      async setStatus(id, payoutsEnabled, detailsSubmitted) {
        await rest.patch(`connect_accounts?stripe_account_id=eq.${enc(id)}`, { payouts_enabled: payoutsEnabled, details_submitted: detailsSubmitted, updated_at: new Date().toISOString() });
      },
    },
    stripe,
    userId,
    body,
    env("SITE_URL"),
  ),
);
Deno.serve((req) => endpoint(req, env));
