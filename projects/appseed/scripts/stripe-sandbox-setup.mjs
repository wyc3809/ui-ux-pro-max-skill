// One-step Stripe sandbox setup for VCseed (docs/STRIPE_SETUP.md): creates both webhook destinations through the
// API, then stores every secret in Supabase and deploys the payment functions. Sandbox only: live keys are refused.
//
// Needs (environment variables, never pasted anywhere):
//   STRIPE_SANDBOX_SECRET_KEY  sk_test_… (or rk_test_… with Webhook Endpoints + Event Destinations write)
//   SUPABASE_PROJECT_REF       the project ref
//   SUPABASE_ACCESS_TOKEN      read by the Supabase CLI
//   SUPABASE_DB_PASSWORD       read by `supabase db push`
//   SITE_URL                   optional, defaults to https://vcseed.app
//
//   node scripts/stripe-sandbox-setup.mjs            webhooks + secrets + db push + deploy
//   node scripts/stripe-sandbox-setup.mjs --dry-run  print the plan only
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const API_VERSION = "2026-10-28.endive";
/** Platform payment events, delivered as snapshot events to /payments-webhook/stripe. */
export const SNAPSHOT_EVENTS = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "refund.created",
  "charge.dispute.created",
  "charge.dispute.closed",
];
/** Accounts v2 changes for sellers, delivered as thin events to /payments-webhook/stripe-thin. */
export const THIN_EVENTS = ["v2.core.account[requirements].updated", "v2.core.account[configuration.recipient].capability_status_updated"];
export const FUNCTIONS = ["checkout", "connect", "payments-webhook", "settlement"];

export function plan(env) {
  const key = env.STRIPE_SANDBOX_SECRET_KEY ?? "";
  if (!/^(sk|rk)_test_/.test(key)) throw new Error("STRIPE_SANDBOX_SECRET_KEY must be a sandbox key (sk_test_ or rk_test_); live keys are set by hand");
  const ref = env.SUPABASE_PROJECT_REF ?? "";
  if (!/^[a-z0-9]{10,40}$/.test(ref)) throw new Error("SUPABASE_PROJECT_REF is missing or malformed");
  const base = `https://${ref}.supabase.co/functions/v1/payments-webhook`;
  return { key, ref, snapshotUrl: `${base}/stripe`, thinUrl: `${base}/stripe-thin`, site: env.SITE_URL || "https://vcseed.app" };
}

async function stripe(key, method, path, body, form = false) {
  const res = await fetch(`https://api.stripe.com/${path}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, "Stripe-Version": API_VERSION, ...(body ? { "Content-Type": form ? "application/x-www-form-urlencoded" : "application/json" } : null) },
    body: body ? (form ? new URLSearchParams(body) : JSON.stringify(body)) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`${method} ${path}: ${json.error?.message ?? res.status}`);
  return json;
}

/** Recreates our endpoints (a signing secret is only returned on create), leaving any others alone. */
async function webhooks(p) {
  const v1 = await stripe(p.key, "GET", "v1/webhook_endpoints?limit=100");
  for (const e of v1.data.filter((e) => e.url === p.snapshotUrl)) await stripe(p.key, "DELETE", `v1/webhook_endpoints/${e.id}`);
  const form = { url: p.snapshotUrl, api_version: API_VERSION, description: "VCseed payments (snapshot)" };
  SNAPSHOT_EVENTS.forEach((ev, i) => (form[`enabled_events[${i}]`] = ev));
  const snapshot = await stripe(p.key, "POST", "v1/webhook_endpoints", form, true);

  const v2 = await stripe(p.key, "GET", "v2/core/event_destinations?include[0]=webhook_endpoint.url");
  for (const d of (v2.data ?? []).filter((d) => d.webhook_endpoint?.url === p.thinUrl)) await stripe(p.key, "POST", `v2/core/event_destinations/${d.id}/disable`, {}).then(() => stripe(p.key, "DELETE", `v2/core/event_destinations/${d.id}`));
  const thin = await stripe(p.key, "POST", "v2/core/event_destinations", {
    name: "VCseed seller accounts (thin)",
    type: "webhook_endpoint",
    event_payload: "thin",
    enabled_events: THIN_EVENTS,
    webhook_endpoint: { url: p.thinUrl },
    include: ["webhook_endpoint.signing_secret", "webhook_endpoint.url"],
  });
  const thinSecret = thin.webhook_endpoint?.signing_secret;
  if (!snapshot.secret || !thinSecret) throw new Error("Stripe did not return the signing secrets");
  return { snapshotSecret: snapshot.secret, thinSecret };
}

const supabase = (args, extraEnv = {}) => execFileSync("npx", ["--yes", "supabase@2", ...args], { stdio: "inherit", env: { ...process.env, ...extraEnv } });

async function main() {
  const p = plan(process.env);
  console.log(`Stripe sandbox → ${p.snapshotUrl} (${SNAPSHOT_EVENTS.length} events), ${p.thinUrl} (${THIN_EVENTS.length} thin events)`);
  if (process.argv.includes("--dry-run")) return;
  const { snapshotSecret, thinSecret } = await webhooks(p);
  // Secrets go through a private temp file, never argv or logs.
  const dir = mkdtempSync(join(tmpdir(), "vcseed-secrets-"));
  const file = join(dir, "secrets.env");
  writeFileSync(
    file,
    [
      `STRIPE_SECRET_KEY=${p.key}`, // sandbox only: one key for all functions; live uses one restricted key per function
      `STRIPE_WEBHOOK_SECRET=${snapshotSecret}`,
      `STRIPE_THIN_WEBHOOK_SECRET=${thinSecret}`,
      `SITE_URL=${p.site}`,
      `SETTLEMENT_CRON_SECRET=${randomBytes(32).toString("hex")}`,
    ].join("\n") + "\n",
    { mode: 0o600 },
  );
  try {
    supabase(["secrets", "set", "--env-file", file, "--project-ref", p.ref]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  supabase(["link", "--project-ref", p.ref]);
  supabase(["db", "push"]);
  supabase(["functions", "deploy", ...FUNCTIONS, "--no-verify-jwt", "--project-ref", p.ref]);
  console.log("Done. Next: Stripe Dashboard → Connect → Get started (Marketplace), then test with card 4242 4242 4242 4242.");
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => (console.error(e.message), process.exit(1)));
