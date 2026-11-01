/** @jest-environment node */
import { CheckoutError, createCheckout, type CheckoutDb } from "../functions/_shared/checkout.ts";
import { handleConnect, stateOf, type ConnectDb } from "../functions/_shared/connect.ts";
import { safeReturn, stripeClient, type StripePost } from "../functions/_shared/stripeApi.ts";

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
    });
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
  const store = () => {
    const saved: Record<string, string> = {};
    const db: ConnectDb = {
      account: async (u) => (saved[u] ? { stripeAccountId: saved[u]!, payoutsEnabled: false, detailsSubmitted: false } : null),
      saveAccount: async (u, id) => void (saved[u] = id),
    };
    return { db, saved };
  };

  it("creates one Express account per seller and returns Stripe's onboarding link", async () => {
    const { db, saved } = store();
    const s = fakeStripe((path) => (path === "accounts" ? { id: "acct_1" } : { url: "https://connect.stripe.com/setup/1" }));
    await expect(handleConnect(db, s.post, "seller", { action: "onboard", returnUrl: `${SITE}/studio` }, SITE)).resolves.toEqual({ url: "https://connect.stripe.com/setup/1" });
    expect(saved.seller).toBe("acct_1");
    expect(s.calls[0]).toMatchObject({ path: "accounts", params: { type: "express", country: "HK" }, key: "connect-account-seller" });
    expect(s.calls[1]!.params).toMatchObject({ account: "acct_1", return_url: `${SITE}/studio`, type: "account_onboarding" });
    await handleConnect(db, s.post, "seller", { action: "onboard" }, SITE);
    expect(s.calls.filter((c) => c.path === "accounts")).toHaveLength(1);
  });

  it("uses the recipient agreement for sellers outside Hong Kong", async () => {
    const s = fakeStripe((path) => (path === "accounts" ? { id: "acct_2" } : { url: "u" }));
    await handleConnect(store().db, s.post, "seller", { action: "onboard", country: "SG" }, SITE);
    expect(s.calls[0]!.params["tos_acceptance[service_agreement]"]).toBe("recipient");
  });

  it("reports the setup state and needs an account for the dashboard", async () => {
    expect(stateOf(null)).toEqual({ state: "none", payoutsEnabled: false });
    expect(stateOf({ payoutsEnabled: false }).state).toBe("pending");
    expect(stateOf({ payoutsEnabled: true }).state).toBe("ready");
    await expect(handleConnect(store().db, fakeStripe(() => ({})).post, "seller", { action: "dashboard" }, SITE)).rejects.toThrow("notConnected");
  });
});
