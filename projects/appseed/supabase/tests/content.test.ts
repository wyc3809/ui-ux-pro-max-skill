/** @jest-environment node */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { TERMS_VERSION } from "../../src/lib/contact";
import { ContentError, type ContentDb, handleContent } from "../functions/_shared/content.ts";
import { verifyUser } from "../functions/_shared/session.ts";

const fakeDb = () => {
  const calls: { fn: string; args: Record<string, unknown> }[] = [];
  const deleted: string[] = [];
  const db: ContentDb = {
    rpc: async (fn, args) => (calls.push({ fn, args }), "new-id" as never),
    deleteAuthUser: async (id) => void deleted.push(id),
  };
  return { db, calls, deleted };
};
const run = (input: Parameters<typeof handleContent>[2]) => {
  const f = fakeDb();
  return { ...f, result: handleContent(f.db, "user-1", input) };
};

describe("server copies of the shared rules", () => {
  it.each(["moderation", "posts", "auth", "socialLinks", "contact"])("%s matches src/lib", (name) => {
    const root = join(__dirname, "../..");
    const copy = readFileSync(join(root, "supabase/functions/_shared/rules", `${name}.ts`), "utf8");
    const source = readFileSync(join(root, "src/lib", `${name}.ts`), "utf8");
    // If this fails: node scripts/sync-shared.mjs
    expect(copy.split("\n").slice(1).join("\n")).toBe(source);
  });
});

describe("content function", () => {
  it("creates a profile only with a valid handle, a clean name and the current terms", async () => {
    const ok = run({ action: "completeProfile", handle: "demo-maker", name: " Demo Maker ", termsVersion: TERMS_VERSION });
    await ok.result;
    expect(ok.calls).toEqual([{ fn: "content_complete_profile", args: { p_user: "user-1", p_handle: "demo-maker", p_name: "Demo Maker", p_terms: TERMS_VERSION, p_min_terms: TERMS_VERSION } }]);
    await expect(run({ action: "completeProfile", handle: "admin", name: "A", termsVersion: TERMS_VERSION }).result).rejects.toThrow("handleReserved");
    await expect(run({ action: "completeProfile", handle: "Demo", name: "A", termsVersion: TERMS_VERSION }).result).rejects.toThrow("handleChars");
    await expect(run({ action: "completeProfile", handle: "demo-maker", name: "   ", termsVersion: TERMS_VERSION }).result).rejects.toThrow("nameRequired");
    await expect(run({ action: "completeProfile", handle: "demo-maker", name: "add me on whatsapp +852 9123 4567", termsVersion: TERMS_VERSION }).result).rejects.toThrow(ContentError);
  });

  it("stores bare social handles and rejects links that point elsewhere", async () => {
    const ok = run({ action: "saveProfile", name: "Demo", bio: "Builds things", links: { github: "https://github.com/appseed-demo", website: "https://demo.example" } });
    await ok.result;
    expect(ok.calls[0]!.args.p_links).toEqual({ github: "appseed-demo", website: "https://demo.example" });
    await expect(run({ action: "saveProfile", name: "Demo", bio: "", links: { x: "https://evil.example/appseed" } }).result).rejects.toThrow("wrongSite");
    await expect(run({ action: "saveProfile", name: "Demo", bio: "", links: { website: "http://demo.example" } }).result).rejects.toThrow("needsHttps");
    await expect(run({ action: "saveProfile", name: "Demo", bio: "", links: { tiktok: "demo" } as never }).result).rejects.toThrow("invalidHandle");
    await expect(run({ action: "saveProfile", name: "Demo", bio: "x".repeat(161), links: {} }).result).rejects.toThrow("bioTooLong");
  });

  it("checks posts like the composer and leaves the daily limit to the database", async () => {
    const ok = run({ action: "createPost", body: "Shipped v2 today #expo", attachment: { kind: "template", slug: "demo-tpl" } });
    await expect(ok.result).resolves.toEqual({ id: "new-id" });
    expect(ok.calls[0]).toEqual({
      fn: "content_create_post",
      args: { p_user: "user-1", p_body: "Shipped v2 today #expo", p_parent: null, p_kind: "template", p_slug: "demo-tpl", p_min_terms: TERMS_VERSION, p_promo_limit: 3 },
    });
    const reply = run({ action: "createPost", body: "Thanks!", parentId: "p1", attachment: { kind: "template", slug: "demo-tpl" } });
    await reply.result;
    expect(reply.calls[0]!.args).toMatchObject({ p_parent: "p1", p_kind: null, p_slug: null });
    await expect(run({ action: "createPost", body: "  " }).result).rejects.toThrow("empty");
    await expect(run({ action: "createPost", body: "x".repeat(501) }).result).rejects.toThrow("tooLong");
    await expect(run({ action: "createPost", body: "https://a.example https://b.example https://c.example" }).result).rejects.toThrow("tooManyLinks");
    await expect(run({ action: "createPost", body: "f*ck you" }).result).rejects.toThrow("abuse");
  });

  it("screens comments and offers, and stores offer amounts in cents", async () => {
    await expect(run({ action: "postComment", key: "demo-tpl", body: "" }).result).rejects.toThrow("empty");
    const offer = run({ action: "makeOffer", slug: "demo-buyout", amount: 150000, message: "Interested" });
    await offer.result;
    expect(offer.calls[0]!.args).toMatchObject({ p_amount: 15_000_000, p_message: "Interested" });
    await expect(run({ action: "makeOffer", slug: "demo-buyout", amount: 1.5, message: "" }).result).rejects.toThrow("invalidAmount");
  });

  it("deletes the account's content, then the sign-in", async () => {
    const del = run({ action: "deleteAccount" });
    await del.result;
    expect(del.calls.map((c) => c.fn)).toEqual(["content_delete_account"]);
    expect(del.deleted).toEqual(["user-1"]);
  });

  it("refuses unknown actions", async () => {
    await expect(run({ action: "dropTables" } as never).result).rejects.toThrow("unknownAction");
  });
});

describe("session check", () => {
  it("trusts only a token Supabase Auth accepts", async () => {
    const fetcher = (async (_url: string, init: RequestInit) => {
      const auth = (init.headers as Record<string, string>).Authorization;
      return auth === "Bearer good" ? new Response(JSON.stringify({ id: "user-1" })) : new Response("{}", { status: 401 });
    }) as unknown as typeof fetch;
    await expect(verifyUser("https://demo.supabase.co", "anon", "Bearer good", fetcher)).resolves.toBe("user-1");
    await expect(verifyUser("https://demo.supabase.co", "anon", "Bearer forged", fetcher)).resolves.toBeNull();
    await expect(verifyUser("https://demo.supabase.co", "anon", null, fetcher)).resolves.toBeNull();
  });
});
