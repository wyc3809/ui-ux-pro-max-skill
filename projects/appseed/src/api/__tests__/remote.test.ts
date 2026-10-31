import type { SupabaseClient } from "@supabase/supabase-js";
import { api as demoApi } from "../mockServer";
import { remoteApi, toCreator, toOffer, toPost, toUser } from "../remote";

/** Just enough of supabase-js for the calls under test; rows live in `tables`. */
function fakeSupabase(opts: { userId?: string; rpc?: Record<string, { data?: unknown; error?: { message: string } }> } = {}) {
  const tables: Record<string, Record<string, unknown>[]> = { post_likes: [], listing_prices: [{ listing_id: "demo-tpl", live: true, product_id: "tier_158" }] };
  const matches = (row: Record<string, unknown>, m: Record<string, unknown>) => Object.entries(m).every(([k, v]) => row[k] === v);
  const sb = {
    auth: { getUser: async () => ({ data: { user: opts.userId ? { id: opts.userId, email: null, app_metadata: {}, user_metadata: {} } : null } }) },
    rpc: async (fn: string) => opts.rpc?.[fn] ?? { data: null, error: null },
    from: (table: string) => ({
      select: () => {
        const filter: Record<string, unknown> = {};
        const chain = {
          eq: (k: string, v: unknown) => ((filter[k] = v), chain),
          match: (m: Record<string, unknown>) => (Object.assign(filter, m), chain),
          maybeSingle: async () => ({ data: (tables[table] ?? []).find((r) => matches(r, filter)) ?? null, error: null }),
        };
        return chain;
      },
      insert: async (row: Record<string, unknown>) => (tables[table]!.push(row), { data: null, error: null }),
      delete: () => ({ match: async (m: Record<string, unknown>) => ((tables[table] = tables[table]!.filter((r) => !matches(r, m))), { data: null, error: null }) }),
    }),
  };
  return { sb: sb as unknown as SupabaseClient, tables };
}

describe("Supabase rows to app types", () => {
  it("maps feed rows, keeping promotion disclosure and replies", () => {
    const base = { id: "p1", user_id: "u1", author: "Demo", handle: "demo-maker", body: "Hi", created_at: "2026-10-31T01:00:00Z", likes: 2, replies: 1, reposts: 0, liked: true, reposted: false };
    expect(toPost({ ...base, parent_id: null, attachment_kind: "template", attachment_slug: "demo-tpl", promo: true })).toMatchObject({
      attachment: { kind: "template", slug: "demo-tpl" },
      promo: true,
      likes: 2,
      liked: true,
    });
    const reply = toPost({ ...base, parent_id: "p0", attachment_kind: null, attachment_slug: null, promo: false });
    expect(reply.parentId).toBe("p0");
    expect(reply).not.toHaveProperty("attachment");
  });

  it("maps profiles to users and creator cards", () => {
    const p = { id: "u1", handle: "demo-maker", name: "Demo", bio: "Builds", links: { github: "appseed-demo" }, terms_version: 2, created_at: "2026-10-31T01:00:00Z" };
    expect(toUser(p, { email: "a@example.com", provider: "apple" })).toEqual({ id: "u1", name: "Demo", handle: "demo-maker", email: "a@example.com", provider: "apple", createdAt: "2026-10-31", termsVersion: 2 });
    expect(toUser(p, { provider: "unknown" }).provider).toBe("email");
    expect(toCreator({ ...p, avatar_hue: 40 })).toMatchObject({ handle: "demo-maker", avatarHue: 40, totalSales: 0, links: { github: "appseed-demo" } });
  });

  it("shows offers in whole dollars", () => {
    expect(toOffer({ slug: "b", amount: 15_000_000, message: "", created_at: "2026-10-31T01:00:00Z", status: "declined" })).toEqual({ slug: "b", amount: 150000, message: "", createdAt: "2026-10-31", status: "sent" });
  });
});

describe("remote API", () => {
  it("toggles likes as the signed-in person and needs a session", async () => {
    const f = fakeSupabase({ userId: "u1" });
    const api = remoteApi(f.sb, demoApi);
    await expect(api.togglePostLike("p1")).resolves.toBe(true);
    expect(f.tables.post_likes).toEqual([{ post_id: "p1", user_id: "u1" }]);
    await expect(api.togglePostLike("p1")).resolves.toBe(false);
    expect(f.tables.post_likes).toEqual([]);
    await expect(remoteApi(fakeSupabase().sb, demoApi).togglePostLike("p1")).rejects.toThrow("authRequired");
  });

  it("reads purchases from the server and claims only free items", async () => {
    const rows = [
      { slug: "demo-tpl", kind: "template" },
      { slug: "demo-prompt", kind: "prompt" },
    ];
    const api = remoteApi(fakeSupabase({ userId: "u1", rpc: { my_purchases: { data: rows } } }).sb, demoApi);
    await expect(api.purchases()).resolves.toEqual(["demo-tpl"]);
    await expect(api.promptPurchases()).resolves.toEqual(["demo-prompt"]);
    await expect(api.restorePurchases()).resolves.toEqual({ templates: 1, prompts: 1 });
    // A paid listing goes to the store; without RevenueCat keys (tests, Expo Go) it says so instead of granting.
    await expect(api.purchase("demo-tpl")).rejects.toThrow("paymentsNotConfigured");
    // A listing with no price tier is free and claimed on the server.
    await expect(api.purchase("demo-free")).resolves.toEqual({ ok: true });
    await expect(remoteApi(fakeSupabase().sb, demoApi).purchases()).resolves.toEqual([]);
  });

  it("names sign-in methods this build cannot offer instead of failing silently", async () => {
    const api = remoteApi(fakeSupabase().sb, demoApi);
    await expect(api.signInWithGoogle()).rejects.toThrow("googleUnavailable");
    await expect(api.signInWithApple({ sub: "s", email: null, name: null, identityToken: null })).rejects.toThrow("appleUnavailable");
    await expect(api.resumeSession()).resolves.toBeNull();
  });
});

describe("backend selection", () => {
  it("runs on the demo server when Supabase is not configured", () => {
    jest.isolateModules(() => {
      const { api } = require("../backend") as typeof import("../backend");
      const { api: demo } = require("../mockServer") as typeof import("../mockServer");
      expect(api).toBe(demo);
    });
  });
});

describe("waiting for the store webhook", () => {
  it("stops as soon as the server lists the purchase, or gives up", async () => {
    const { waitForOwnership } = require("@/lib/iap") as typeof import("@/lib/iap");
    let n = 0;
    await expect(waitForOwnership(async () => ++n >= 3, 10, 0, async () => {})).resolves.toBe(true);
    expect(n).toBe(3);
    await expect(waitForOwnership(async () => false, 2, 0, async () => {})).resolves.toBe(false);
  });
});
