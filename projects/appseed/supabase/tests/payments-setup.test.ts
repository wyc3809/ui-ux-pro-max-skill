/** @jest-environment node */
import { CheckoutError, createCheckout, INTEGRATION_ID, type CheckoutDb } from "../functions/_shared/checkout.ts";
import { accountEvent, handleConnect, stateOf, type ConnectDb } from "../functions/_shared/connect.ts";
import { recipientStatus, safeReturn, STRIPE_API_VERSION, stripeClient, stripeV2, type StripePost, type StripeV2 } from "../functions/_shared/stripeApi.ts";

const SITE = "https://vcseed.example";
const fakeStripe = (reply: (path: string) => Record<string, unknown>) => {
  const calls: { path: string; params: Record<string, string>; key?: string }[] = [];
  const post: StripePost = async (path, params, key) => (calls.push({ path, params, key }), reply(path));
  return { post, calls };
};

describe("return URLs", () => {
  it("only sends people back to our own site", () => {
    expect(safeReturn("https://vcseed.example/template/x", SITE)).toBe("https://vcseed.example/template/x");
    expect(safeReturn("https://evil.example/phish", SITE)).toBe(SITE);
    expect(safeReturn("javascript:alert(1)", SITE)).toBe(SITE);
    expect(safeReturn(42, SITE)).toBe(SITE);
  });

  it("surfaces Stripe's error message", async () => {
    const fetcher = (async () => new Response(JSON.stringify({ error: { message: "Invalid currency" } }), { status: 400 })) as unknown as typeof fetch;
    await expect(stripeClient("sk_test", fetcher)("checkout/sessions", {})).rejects.toThrow("Invalid currency");
  });
});

describe("web checkout", () => {
  const db = (over: Partial<CheckoutDb> = {}): CheckoutDb => ({ price: async () => ({ sellerId: "seller", price: 15800, name: "Demo template" }), owns: async () => false, ...over });

  it("charges the listed price in HKD and tags the order for the webhook", async () => {
    const s = fakeStripe(() => ({ url: "https://checkout.stripe.com/c/1" }));
    await expect(createCheckout(db(), s.post, "buyer", { slug: "demo-tpl", returnUrl: `${SITE}/template/demo-tpl` }, SITE)).resolves.toEqual({ url: "https://checkout.stripe.com/c/1" });
    expect(s.calls[0]!.params).toMatchObject({
      mode: "payment",
      "line_items[0][price_data][currency]": "hkd",
      "line_items[0][price_data][unit_amount]": "15800",
      "metadata[listing_id]": "demo-tpl",
      "metadata[buyer_id]": "buyer",
      success_url: `${SITE}/template/demo-tpl?checkout=success`,
      integration_identifier: INTEGRATION_ID,
    });
    // Dynamic payment methods from the Dashboard: never a hard-coded list. No invoice unless switched on.
    expect(Object.keys(s.calls[0]!.params).some((k) => k.startsWith("payment_method_types"))).toBe(false);
    expect(s.calls[0]!.params["invoice_creation[enabled]"]).toBeUndefined();
    await createCheckout(db(), s.post, "buyer", { slug: "demo-tpl" }, SITE, { invoices: true });
    expect(s.calls[1]!.params["invoice_creation[enabled]"]).toBe("true");
    expect(INTEGRATION_ID).toMatch(/_[a-z]{8}$/);
  });

  it("refuses unknown, own and already-owned listings", async () => {
    const s = fakeStripe(() => ({}));
    await expect(createCheckout(db({ price: async () => null }), s.post, "buyer", { slug: "x" }, SITE)).rejects.toThrow("notFound");
    await expect(createCheckout(db(), s.post, "seller", { slug: "demo-tpl" }, SITE)).rejects.toThrow("selfPurchase");
    await expect(createCheckout(db({ owns: async () => true }), s.post, "buyer", { slug: "demo-tpl" }, SITE)).rejects.toThrow(CheckoutError);
    expect(s.calls).toHaveLength(0);
  });
});

describe("payout setup", () => {
  const store = (ready = false) => {
    const saved: Record<string, string> = {};
    const status: Record<string, [boolean, boolean]> = {};
    const db: ConnectDb = {
      account: async (u) => (saved[u] ? { stripeAccountId: saved[u]!, payoutsEnabled: ready, detailsSubmitted: false } : null),
      saveAccount: async (u, id) => void (saved[u] = id),
      setStatus: async (id, p, d) => void (status[id] = [p, d]),
    };
    return { db, saved, status };
  };
  const fakeConnect = (account: Record<string, unknown> = {}) => {
    const v1 = fakeStripe(() => ({ url: "https://connect.stripe.com/express/login" }));
    const calls: { method: string; path: string; body?: Record<string, unknown>; key?: string; include?: string[] }[] = [];
    const v2: StripeV2 = {
      post: async (path, body, key) => (calls.push({ method: "POST", path, body, key }), path === "core/accounts" ? { id: "acct_1" } : { url: "https://connect.stripe.com/setup/1" }),
      get: async (path, include) => (calls.push({ method: "GET", path, include }), account),
    };
    return { stripe: { v1: v1.post, v2 }, calls, v1 };
  };
  const active = { configuration: { recipient: { capabilities: { stripe_balance: { stripe_transfers: { status: "active" } } } } }, requirements: { entries: [] } };

  it("creates one Accounts v2 recipient per seller (Express dashboard, platform owns fees and losses) and returns Stripe's onboarding link", async () => {
    const { db, saved } = store();
    const s = fakeConnect();
    await expect(handleConnect(db, s.stripe, "seller", { action: "onboard", returnUrl: `${SITE}/studio`, email: "maker@example.com" }, SITE)).resolves.toEqual({ url: "https://connect.stripe.com/setup/1" });
    expect(saved.seller).toBe("acct_1");
    expect(s.calls[0]).toMatchObject({
      path: "core/accounts",
      key: "connect-account-seller",
      body: {
        dashboard: "express",
        contact_email: "maker@example.com",
        identity: { country: "hk" },
        defaults: { responsibilities: { fees_collector: "application", losses_collector: "application" } },
        configuration: { recipient: { capabilities: { stripe_balance: { stripe_transfers: { requested: true } } } } },
      },
    });
    // Never the deprecated v1 account types.
    expect(JSON.stringify(s.calls[0]!.body)).not.toMatch(/"type":"(express|custom|standard)"/);
    expect(s.calls[1]).toMatchObject({ path: "core/account_links", body: { account: "acct_1", use_case: { type: "account_onboarding", account_onboarding: { configurations: ["recipient"], return_url: `${SITE}/studio` } } } });
    await handleConnect(db, s.stripe, "seller", { action: "onboard" }, SITE);
    expect(s.calls.filter((c) => c.path === "core/accounts")).toHaveLength(1);
  });

  it("onboards sellers outside Hong Kong in their own country", async () => {
    const s = fakeConnect();
    await handleConnect(store().db, s.stripe, "seller", { action: "onboard", country: "SG" }, SITE);
    expect(s.calls[0]!.body).toMatchObject({ identity: { country: "sg" } });
  });

  it("is ready only when the recipient transfers capability is active, checked with Stripe on return", async () => {
    expect(recipientStatus(active)).toEqual({ transfersActive: true, detailsSubmitted: true });
    expect(recipientStatus({ configuration: { recipient: { capabilities: { stripe_balance: { stripe_transfers: { status: "restricted" } } } } }, requirements: { entries: [{ minimum_deadline: { status: "currently_due" } }] } })).toEqual({ transfersActive: false, detailsSubmitted: false });
    // v1's payouts_enabled is ignored.
    expect(recipientStatus({ payouts_enabled: true }).transfersActive).toBe(false);
    const st = store();
    await st.db.saveAccount("seller", "acct_1");
    const s = fakeConnect(active);
    await expect(handleConnect(st.db, s.stripe, "seller", { action: "status" }, SITE)).resolves.toEqual({ state: "ready", payoutsEnabled: true });
    expect(s.calls[0]).toMatchObject({ method: "GET", path: "core/accounts/acct_1", include: ["configuration.recipient", "requirements"] });
    expect(st.status.acct_1).toEqual([true, true]);
  });

  it("turns an account change notice into the account's current readiness", async () => {
    const s = fakeConnect(active);
    await expect(accountEvent({ provider: "stripe", eventId: "evt_1", stripeAccountId: "acct_1" }, s.stripe.v2)).resolves.toEqual({ type: "account", provider: "stripe", eventId: "evt_1", stripeAccountId: "acct_1", payoutsEnabled: true, detailsSubmitted: true });
  });

  it("reports the setup state and needs an account for the dashboard", async () => {
    expect(stateOf(null)).toEqual({ state: "none", payoutsEnabled: false });
    expect(stateOf({ payoutsEnabled: false }).state).toBe("pending");
    expect(stateOf({ payoutsEnabled: true }).state).toBe("ready");
    await expect(handleConnect(store().db, fakeConnect().stripe, "seller", { action: "dashboard" }, SITE)).rejects.toThrow("notConnected");
    const st = store(true);
    await st.db.saveAccount("seller", "acct_1");
    const s = fakeConnect();
    await expect(handleConnect(st.db, s.stripe, "seller", { action: "dashboard" }, SITE)).resolves.toEqual({ url: "https://connect.stripe.com/express/login" });
    expect(s.v1.calls[0]!.path).toBe("accounts/acct_1/login_links");
  });
});

describe("Stripe client", () => {
  it("pins the API version on v1 and v2 calls and sends v2 bodies as JSON", async () => {
    const seen: { url: string; init: RequestInit }[] = [];
    const fetcher = (async (url: string, init: RequestInit) => (seen.push({ url, init }), new Response(JSON.stringify({ id: "x" })))) as unknown as typeof fetch;
    await stripeClient("rk_test", fetcher)("checkout/sessions", { mode: "payment" });
    await stripeV2("rk_test", fetcher).post("core/accounts", { dashboard: "express" }, "k1");
    await stripeV2("rk_test", fetcher).get("core/accounts/acct_1", ["configuration.recipient", "requirements"]);
    for (const c of seen) expect((c.init.headers as Record<string, string>)["Stripe-Version"]).toBe(STRIPE_API_VERSION);
    expect(seen[1]!.url).toBe("https://api.stripe.com/v2/core/accounts");
    expect(seen[1]!.init.body).toBe('{"dashboard":"express"}');
    expect((seen[1]!.init.headers as Record<string, string>)["Idempotency-Key"]).toBe("k1");
    expect(seen[2]!.url).toBe("https://api.stripe.com/v2/core/accounts/acct_1?include[0]=configuration.recipient&include[1]=requirements");
  });
});
