/** @jest-environment node */
import { createVerify, generateKeyPairSync } from "node:crypto";
import { appleClientSecret, revokeAppleTokens } from "../functions/_shared/apple.ts";
import { appJwt } from "../functions/_shared/github.ts";
import { manifestFromEntries, scanReport } from "../functions/_shared/source.ts";
import { handleStudio, slugFor, type StudioDeps } from "../functions/_shared/studio.ts";

const README = "# Demo\n\nRun with `npm install` then `npx expo start`.";
const PKG = JSON.stringify({ dependencies: { expo: "~58.0.19", "@supabase/supabase-js": "^2.0.0" } });
const clean = [
  { path: "demo-main/README.md", size: 60, text: README },
  { path: "demo-main/package.json", size: 80, text: PKG },
  { path: "demo-main/package-lock.json", size: 900 },
  { path: "demo-main/LICENSE", size: 1000 },
  { path: "demo-main/app/index.tsx", size: 500, text: "export default () => null;" },
];

describe("source manifest", () => {
  it("strips the wrapping folder, builds the tree and reads README and dependencies", () => {
    const m = manifestFromEntries(clean);
    expect(m.readme).toBe(README);
    expect(m.dependencies.expo).toBe("~58.0.19");
    expect(m.files.map((f) => f.name)).toEqual(["README.md", "package.json", "package-lock.json", "LICENSE", "app"]);
    expect(scanReport(m)).toMatchObject({ fileCount: 5, stack: expect.arrayContaining(["Expo", "Supabase"]) });
    expect(scanReport(m).checks.every((c) => c.status === "pass")).toBe(true);
  });

  it("fails the secrets check for key files and keys in code, not for examples", () => {
    const m = manifestFromEntries([
      ...clean,
      { path: "demo-main/.env", size: 20, text: "X=1" },
      { path: "demo-main/.env.example", size: 20, text: "X=" },
      { path: "demo-main/src/pay.ts", size: 60, text: 'const k = "sk_live_abcdefghijklmnop1234";' },
      { path: "demo-main/node_modules/x/.env", size: 5 },
    ]);
    expect(m.secretsFound).toEqual([".env", "src/pay.ts (Stripe live key)"]);
    expect(scanReport(m).checks.find((c) => c.id === "secrets")!.status).toBe("fail");
  });
});

describe("GitHub App JWT", () => {
  it("is a valid RS256 token GitHub can verify", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    const jwt = await appJwt("12345", pem, 1_000_000);
    const [h, b, s] = jwt.split(".");
    expect(JSON.parse(Buffer.from(b!, "base64url").toString())).toEqual({ iat: 999_940, exp: 1_000_540, iss: "12345" });
    expect(createVerify("RSA-SHA256").update(`${h}.${b}`).verify(publicKey, Buffer.from(s!, "base64url"))).toBe(true);
  });
});

const MEDIA_BASE = "https://demo.supabase.co/storage/v1/object/public/media";
const shot = (n: number) => `${MEDIA_BASE}/u1/shot-${n}.png`;

function fakeDeps(over: { owns?: boolean; installation?: boolean; email?: boolean } = {}) {
  const calls: { fn: string; args: Record<string, unknown> }[] = [];
  const sources: unknown[] = [];
  const written: string[] = [];
  const signed: { path: string; seconds: number }[] = [];
  const mails: string[] = [];
  const deps: StudioDeps = {
    db: {
      rpc: async (fn, args) => (calls.push({ fn, args }), null as never),
      handle: async () => "demo-maker",
      email: async () => "maker@example.com",
      canDownload: async () => over.owns ?? true,
      source: async () => ({ path: "listings/x/source.zip" }),
      saveSource: async (r) => void sources.push(r),
      installation: async () => (over.installation === false ? null : { installationId: 7, login: "demo" }),
      saveInstallation: async () => {},
    },
    storage: {
      signDownload: async (path, seconds) => (signed.push({ path, seconds }), `https://files.example/${path}?token=t`),
      signUpload: async (path) => ({ url: `https://files.example/upload/${path}`, token: "t" }),
      read: async () => new Uint8Array(10),
      write: async (path) => void written.push(path),
      signMediaUpload: async (path) => ({ url: `https://files.example/upload/${path}`, token: "m" }),
    },
    mediaBase: MEDIA_BASE,
    unzip: () => clean,
    github: {
      userInstallations: async () => ({ login: "demo", ids: [7] }),
      token: async () => "ghs_x",
      repos: async () => [],
      tree: async () => clean.map(({ path, size }) => ({ path: path.replace("demo-main/", ""), size })),
      file: async (_t, _r, _ref, path) => (path === "README.md" ? README : path === "package.json" ? PKG : null),
      zipball: async () => new Uint8Array(42),
    },
    email: over.email === false ? null : async (to) => void mails.push(to),
    now: () => new Date("2026-11-01T00:00:00Z"),
    random: () => "x7k2",
  };
  return { deps, calls, sources, written, signed, mails };
}

const template = (over: Record<string, unknown> = {}) => ({
  kind: "template",
  name: "Pocket Ledger 2",
  tagline: "A simple ledger",
  category: "expense",
  tier: 158,
  license: "personal",
  storySteps: [{ title: "Data model", body: "Amounts in cents." }],
  freePreviewSteps: 1,
  source: { kind: "zip", path: "uploads/u1/1-app.zip" },
  media: { icon: `${MEDIA_BASE}/u1/icon.png`, screenshots: [shot(1), shot(2), shot(3)] },
  storeLinks: { appStore: "https://apps.apple.com/hk/app/pocket-ledger/id1234567890", googlePlay: "" },
  attest: true,
  ...over,
});

describe("studio function", () => {
  it("submits a template for review with its scanned source", async () => {
    const f = fakeDeps();
    await expect(handleStudio(f.deps, "u1", { action: "submitListing", listing: template() })).resolves.toEqual({ slug: "pocket-ledger-2-x7k2", status: "review" });
    expect(f.calls[0]).toMatchObject({ fn: "studio_submit_listing", args: { p_slug: "pocket-ledger-2-x7k2", p_kind: "template", p_price: 15800 } });
    expect((f.calls[0]!.args.p_data as { creator: string }).creator).toBe("demo-maker");
    expect(f.sources[0]).toMatchObject({ slug: "pocket-ledger-2-x7k2", kind: "zip", path: "uploads/u1/1-app.zip" });
  });

  it("refuses unattested, off-tier, unscreened or someone else's uploads", async () => {
    const f = fakeDeps();
    const run = (listing: object) => handleStudio(f.deps, "u1", { action: "submitListing", listing });
    await expect(run(template({ attest: false }))).rejects.toThrow("attestRequired");
    await expect(run(template({ tier: 100 }))).rejects.toThrow("invalidPrice");
    await expect(run(template({ tagline: "f*ck this" }))).rejects.toThrow("abuse");
    await expect(run(template({ source: { kind: "zip", path: "uploads/u2/stolen.zip" } }))).rejects.toThrow("notFound");
    await expect(run({ kind: "buyout", attest: true })).rejects.toThrow("featureOff");
    expect(f.calls).toHaveLength(0);
  });

  it("blocks submission when the source fails a check", async () => {
    const f = fakeDeps();
    f.deps.unzip = () => [...clean, { path: "demo-main/.env", size: 5, text: "K=1" }];
    await expect(handleStudio(f.deps, "u1", { action: "submitListing", listing: template() })).rejects.toThrow("sourceBlocked");
    expect(f.calls).toHaveLength(0);
  });

  it("snapshots a GitHub branch into storage", async () => {
    const f = fakeDeps();
    await handleStudio(f.deps, "u1", { action: "submitListing", listing: template({ source: { kind: "github", repo: "demo/app", branch: "main" } }) });
    expect(f.written).toEqual(["listings/pocket-ledger-2-x7k2/source.zip"]);
    expect(f.sources[0]).toMatchObject({ kind: "github", repo: "demo/app", ref: "main", size_bytes: 42 });
    await expect(handleStudio(fakeDeps({ installation: false }).deps, "u1", { action: "githubRepos" })).rejects.toThrow("githubNotLinked");
  });

  it("keeps a paid prompt's full text out of the public listing", async () => {
    const f = fakeDeps();
    await handleStudio(f.deps, "u1", { action: "submitListing", listing: { kind: "prompt", title: "Landing copy", summary: "Writes copy", category: "website", tool: "Claude", text: "line 1\nline 2\nline 3", previewLines: 1, tier: 18, attest: true } });
    expect((f.calls[0]!.args.p_data as { text: string }).text).toBe("line 1");
    expect(f.calls[1]).toEqual({ fn: "studio_save_prompt_text", args: { p_slug: "landing-copy-x7k2", p_text: "line 1\nline 2\nline 3" } });
  });

  it("links only installations GitHub confirms belong to the person", async () => {
    const f = fakeDeps();
    await expect(handleStudio(f.deps, "u1", { action: "linkGithub", code: "c", installationId: 7 })).resolves.toEqual({ login: "demo" });
    await expect(handleStudio(f.deps, "u1", { action: "linkGithub", code: "c", installationId: 8 })).rejects.toThrow("githubNotYours");
  });

  it("hands source to owners only, as short-lived links", async () => {
    const f = fakeDeps();
    await expect(handleStudio(f.deps, "u1", { action: "sourceDownload", slug: "demo-tpl" })).resolves.toEqual({ url: "https://files.example/listings/x/source.zip?token=t" });
    expect(f.signed[0]!.seconds).toBe(600);
    await handleStudio(f.deps, "u1", { action: "sendToComputer", slug: "demo-tpl" });
    expect(f.mails).toEqual(["maker@example.com"]);
    await expect(handleStudio(fakeDeps({ owns: false }).deps, "u1", { action: "sourceDownload", slug: "demo-tpl" })).rejects.toThrow("notOwned");
    await expect(handleStudio(fakeDeps({ email: false }).deps, "u1", { action: "sendToComputer", slug: "demo-tpl" })).rejects.toThrow("emailNotConfigured");
  });

  it("makes upload paths per person and zip only", async () => {
    const f = fakeDeps();
    await expect(handleStudio(f.deps, "u1", { action: "sourceUploadUrl", fileName: "my app.zip" })).resolves.toMatchObject({ path: expect.stringMatching(/^uploads\/u1\/\d+-my_app\.zip$/) });
    await expect(handleStudio(f.deps, "u1", { action: "sourceUploadUrl", fileName: "app.exe" })).rejects.toThrow("zipOnly");
  });

  it("signs media uploads only for files that pass the rules", async () => {
    const f = fakeDeps();
    const ok = (await handleStudio(f.deps, "u1", { action: "mediaUploadUrl", kind: "icon", mime: "image/png", bytes: 200_000, width: 1024, height: 1024 })) as { path: string; publicUrl: string };
    expect(ok.path).toMatch(/^u1\/\d+-x7k2\.png$/);
    expect(ok.publicUrl).toBe(`${MEDIA_BASE}/${ok.path}`);
    await expect(handleStudio(f.deps, "u1", { action: "mediaUploadUrl", kind: "icon", mime: "image/png", bytes: 200_000, width: 1024, height: 800 })).rejects.toThrow("iconNotSquare");
    await expect(handleStudio(f.deps, "u1", { action: "mediaUploadUrl", kind: "video", mime: "video/mp4", bytes: 1000, durationMs: 60_000 })).rejects.toThrow("videoTooLong");
  });

  it("keeps media and canonical store links on the listing, and refuses someone else's images", async () => {
    const f = fakeDeps();
    await handleStudio(f.deps, "u1", { action: "submitListing", listing: template() });
    expect(f.calls[0]!.args.p_data).toMatchObject({ media: { icon: `${MEDIA_BASE}/u1/icon.png`, screenshots: [shot(1), shot(2), shot(3)] }, storeLinks: { appStore: "https://apps.apple.com/app/id1234567890" } });
    const run = (listing: object) => handleStudio(fakeDeps().deps, "u1", { action: "submitListing", listing });
    await expect(run(template({ media: { screenshots: [shot(1), shot(2), `${MEDIA_BASE}/u2/stolen.png`] } }))).rejects.toThrow("mediaNotYours");
    await expect(run(template({ media: { screenshots: ["https://evil.example/a.png", shot(2), shot(3)] } }))).rejects.toThrow("mediaNotYours");
    await expect(run(template({ media: { screenshots: [shot(1)] } }))).rejects.toThrow("screenshotsRequired");
    await expect(run(template({ storeLinks: { appStore: "https://apps.apple.com.evil.example/app/id1234567890" } }))).rejects.toThrow("storeLinkInvalid");
  });

  it("lets a launch use a store link instead of a website", async () => {
    const f = fakeDeps();
    await handleStudio(f.deps, "u1", { action: "submitListing", listing: { kind: "launch", name: "Ferry Now", tagline: "Next ferry at a glance", category: "hkLife", secondaryCategory: "navigation", link: "", storeLinks: { googlePlay: "app.ferrynow.hk" }, attest: true } });
    expect(f.calls[0]!.args.p_data).toMatchObject({ links: [], storeLinks: { googlePlay: "https://play.google.com/store/apps/details?id=app.ferrynow.hk" } });
    await expect(handleStudio(f.deps, "u1", { action: "submitListing", listing: { kind: "launch", name: "X", tagline: "Y", category: "hkLife", link: "", attest: true } })).rejects.toThrow("missingFields");
  });

  it("accepts only the shared categories (§40)", async () => {
    const f = fakeDeps();
    await handleStudio(f.deps, "u1", { action: "submitListing", listing: template({ secondaryCategory: "business" }) });
    expect(f.calls[0]!.args.p_data).toMatchObject({ category: "expense", secondaryCategory: "business" });
    const run = (listing: object) => handleStudio(fakeDeps().deps, "u1", { action: "submitListing", listing });
    await expect(run(template({ category: undefined }))).rejects.toThrow("invalidCategory");
    await expect(run(template({ category: "tools" }))).rejects.toThrow("invalidCategory");
    await expect(run(template({ secondaryCategory: "expense" }))).rejects.toThrow("invalidCategory");
    await expect(run({ kind: "launch", name: "X", tagline: "Y", category: "crypto", link: "https://x.example", attest: true })).rejects.toThrow("invalidCategory");
  });

  it("makes readable slugs", () => {
    expect(slugFor("Pocket Ledger 2!", "ab12")).toBe("pocket-ledger-2-ab12");
    expect(slugFor("記帳", "ab12")).toBe("app-ab12");
  });
});

describe("Sign in with Apple revocation", () => {
  it("signs the client secret with the team's ES256 key and revokes the refresh token", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
    const cfg = { teamId: "TEAM", keyId: "KEY", clientId: "app.appseed", privateKey: privateKey.export({ type: "pkcs8", format: "pem" }).toString() };
    const jwt = await appleClientSecret(cfg, 1_000);
    const [h, b, s] = jwt.split(".");
    expect(JSON.parse(Buffer.from(h!, "base64url").toString())).toEqual({ alg: "ES256", kid: "KEY" });
    expect(JSON.parse(Buffer.from(b!, "base64url").toString())).toMatchObject({ iss: "TEAM", sub: "app.appseed", aud: "https://appleid.apple.com", exp: 1_300 });
    expect(createVerify("SHA256").update(`${h}.${b}`).verify({ key: publicKey, dsaEncoding: "ieee-p1363" }, Buffer.from(s!, "base64url"))).toBe(true);

    const calls: string[] = [];
    const fetcher = (async (url: string, init: RequestInit) => {
      calls.push(`${url} ${new URLSearchParams(String(init.body)).get(url.endsWith("token") ? "code" : "token")}`);
      return new Response(JSON.stringify(url.endsWith("token") ? { refresh_token: "r1" } : {}));
    }) as unknown as typeof fetch;
    await revokeAppleTokens("code-1", cfg, fetcher);
    expect(calls).toEqual(["https://appleid.apple.com/auth/token code-1", "https://appleid.apple.com/auth/revoke r1"]);
  });
});
