import { TERMS_VERSION } from "./rules/contact.ts";
import { FEATURES } from "./rules/features.ts";
import { LICENSES } from "./rules/license.ts";
import { screenText } from "./rules/moderation.ts";
import { PRICE_TIERS } from "./rules/price.ts";
import { PROMPT_TIERS } from "./rules/prompt.ts";
import { isBlocking } from "./rules/sourceScan.ts";
import { extensionFor, MEDIA, type MediaKind, MIN_TEMPLATE_SCREENSHOTS, validateMedia } from "./rules/media.ts";
import { normalizeStoreLinks } from "./rules/storeLinks.ts";
import { manifestFromEntries, scanReport, shouldRead, type SourceEntry } from "./source.ts";

/**
 * The creator studio's server side (docs/DESIGN.md §35): submitting listings for review, scanning their
 * source (zip upload or GitHub App) and handing source out as short-lived signed URLs. Every listing is
 * screened, priced only on a fixed tier, attested by its creator, and blocked if its source fails a check.
 */
export interface StudioDeps {
  db: {
    rpc<T>(fn: string, args: Record<string, unknown>): Promise<T>;
    handle(userId: string): Promise<string | null>;
    email(userId: string): Promise<string | null>;
    canDownload(userId: string, slug: string): Promise<boolean>;
    source(slug: string): Promise<{ path: string } | null>;
    saveSource(row: { slug: string; kind: "github" | "zip"; repo: string | null; ref: string | null; path: string; size_bytes: number; report: unknown }): Promise<void>;
    installation(userId: string): Promise<{ installationId: number; login: string } | null>;
    saveInstallation(userId: string, installationId: number, login: string): Promise<void>;
  };
  storage: {
    signDownload(path: string, seconds: number): Promise<string>;
    signUpload(path: string): Promise<{ url: string; token: string }>;
    read(path: string): Promise<Uint8Array>;
    write(path: string, bytes: Uint8Array): Promise<void>;
    /** Signed upload into the public `media` bucket. */
    signMediaUpload(path: string): Promise<{ url: string; token: string }>;
  };
  /** Public URL prefix of the `media` bucket, e.g. https://<project>.supabase.co/storage/v1/object/public/media */
  mediaBase: string;
  unzip(bytes: Uint8Array): SourceEntry[];
  github: {
    /** Exchanges the OAuth code from the install redirect; returns the person's login and their installation ids. */
    userInstallations(code: string): Promise<{ login: string; ids: number[] }>;
    token(installationId: number): Promise<string>;
    repos(token: string): Promise<{ fullName: string; private: boolean; language: string; updatedAt: string; defaultBranch: string; branches: string[] }[]>;
    tree(token: string, repo: string, ref: string): Promise<{ path: string; size: number }[]>;
    file(token: string, repo: string, ref: string, path: string): Promise<string | null>;
    zipball(token: string, repo: string, ref: string): Promise<Uint8Array>;
  };
  /** Sends mail, or null when no mail provider is configured. */
  email: ((to: string, subject: string, text: string) => Promise<void>) | null;
  now?: () => Date;
  random?: () => string;
}

export class StudioError extends Error {}
const fail = (code: string): never => {
  throw new StudioError(code);
};
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const screen = (...texts: string[]) => {
  const r = screenText(texts.filter(Boolean).join("\n"));
  if (!r.ok) fail(r.reason);
};

/** "Pocket Ledger 2!" → "pocket-ledger-2-x7k2"; the suffix keeps two listings with one name apart. */
export function slugFor(name: string, suffix: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${base.length >= 3 ? base : "app"}-${suffix}`;
}

const COVERS = [
  { from: "#7c3aed", to: "#4f46e5", icon: "sparkles" },
  { from: "#0891b2", to: "#2563eb", icon: "code" },
  { from: "#059669", to: "#0d9488", icon: "sprout" },
  { from: "#ea580c", to: "#db2777", icon: "rocket" },
] as const;

type SourceInput = { kind: "zip"; path: string } | { kind: "github"; repo: string; branch: string };

export async function handleStudio(deps: StudioDeps, userId: string, body: Record<string, unknown>): Promise<unknown> {
  const { db, storage } = deps;
  const now = (deps.now ?? (() => new Date()))();
  const today = now.toISOString().slice(0, 10);
  const suffix = (deps.random ?? (() => Math.random().toString(36).slice(2, 6)))();

  const ownUpload = (path: unknown) => {
    const p = typeof path === "string" ? path : "";
    if (!p.startsWith(`uploads/${userId}/`) || p.includes("..")) fail("notFound");
    return p;
  };
  const githubToken = async () => {
    const inst = await db.installation(userId);
    if (!inst) fail("githubNotLinked");
    return deps.github.token(inst!.installationId);
  };
  const scanZip = async (path: string) => {
    const bytes = await storage.read(path);
    return { report: scanReport(manifestFromEntries(deps.unzip(bytes))), size: bytes.byteLength };
  };
  const scanRepo = async (token: string, repo: string, ref: string) => {
    const files = await deps.github.tree(token, repo, ref);
    const entries: SourceEntry[] = await Promise.all(
      files.map(async (f) => ({ ...f, text: /^(package\.json|readme(\.md)?|\.env[\w.-]*)$/i.test(f.path) && shouldRead(f.path, f.size) ? ((await deps.github.file(token, repo, ref, f.path)) ?? undefined) : undefined })),
    );
    return scanReport(manifestFromEntries(entries));
  };
  const downloadable = async (slug: unknown) => {
    const s = str(slug, 80);
    if (!(await db.canDownload(userId, s))) fail("notOwned");
    const src = await db.source(s);
    if (!src) fail("noSource");
    return src!.path;
  };

  switch (body.action) {
    case "sourceUploadUrl": {
      const name = str(body.fileName, 80).replace(/[^\w.-]+/g, "_") || "source.zip";
      if (!/\.zip$/i.test(name)) fail("zipOnly");
      const path = `uploads/${userId}/${now.getTime()}-${name}`;
      return { path, ...(await storage.signUpload(path)) };
    }
    case "mediaUploadUrl": {
      const kind = body.kind as MediaKind;
      if (!["icon", "screenshot", "video"].includes(kind)) fail("mediaType");
      const file = { mime: str(body.mime, 40), bytes: Number(body.bytes), width: Number(body.width) || 0, height: Number(body.height) || 0, durationMs: Number(body.durationMs) || 0 };
      const error = validateMedia(kind, file);
      if (error) fail(error);
      const path = `${userId}/${now.getTime()}-${suffix}.${extensionFor(file.mime)}`;
      return { path, ...(await storage.signMediaUpload(path)), publicUrl: `${deps.mediaBase}/${path}` };
    }
    case "scanZip":
      return (await scanZip(ownUpload(body.path))).report;
    case "linkGithub": {
      const id = Number(body.installationId);
      const { login, ids } = await deps.github.userInstallations(str(body.code, 200));
      // Only an installation GitHub says belongs to this person can be linked.
      if (!ids.includes(id)) fail("githubNotYours");
      await db.saveInstallation(userId, id, login);
      return { login };
    }
    case "githubRepos":
      return deps.github.repos(await githubToken());
    case "scanRepo":
      return scanRepo(await githubToken(), str(body.repo, 140), str(body.branch, 100) || "HEAD");
    case "sourceDownload":
      return { url: await storage.signDownload(await downloadable(body.slug), 10 * 60) };
    case "sendToComputer": {
      const path = await downloadable(body.slug);
      const to = await db.email(userId);
      if (!to) fail("noEmail");
      if (!deps.email) fail("emailNotConfigured");
      const url = await storage.signDownload(path, 24 * 60 * 60);
      await deps.email!(to!, "AppSeed source code", `Your download link (valid for 24 hours):\n${url}\n\nThe app never opens downloaded code; open it on your computer.`);
      return { ok: true };
    }
    case "submitListing":
      return submit(deps, userId, body.listing as Record<string, unknown>, { today, suffix, githubToken, scanZip, scanRepo, ownUpload });
    default:
      return fail("unknownAction");
  }
}

/**
 * Media on a listing must be files this person uploaded to the media bucket (no hotlinking or someone else's
 * images), within the counts lib/media.ts allows. Returns the cleaned media, or throws.
 */
export function cleanMedia(input: unknown, userId: string, mediaBase: string, minScreenshots = 0) {
  const m = (input && typeof input === "object" ? input : {}) as { icon?: unknown; screenshots?: unknown; video?: unknown };
  const mine = (u: unknown) => typeof u === "string" && u.startsWith(`${mediaBase}/${userId}/`) && !u.includes("..");
  const own = (u: unknown) => (u == null || u === "" ? undefined : mine(u) ? (u as string) : fail("mediaNotYours"));
  const shots = Array.isArray(m.screenshots) ? m.screenshots : [];
  if (shots.length > MEDIA.screenshot.max) fail("mediaTooMany");
  if (shots.length < minScreenshots) fail("screenshotsRequired");
  return { icon: own(m.icon), screenshots: shots.map((s) => own(s)!), video: own(m.video) };
}

export function cleanStoreLinks(input: unknown) {
  const r = normalizeStoreLinks((input && typeof input === "object" ? input : {}) as Record<string, unknown>);
  return "error" in r ? fail(r.error) : r.links;
}

async function submit(
  deps: StudioDeps,
  userId: string,
  l: Record<string, unknown> | undefined,
  h: {
    today: string;
    suffix: string;
    githubToken: () => Promise<string>;
    scanZip: (path: string) => Promise<{ report: ReturnType<typeof scanReport>; size: number }>;
    scanRepo: (token: string, repo: string, ref: string) => Promise<ReturnType<typeof scanReport>>;
    ownUpload: (p: unknown) => string;
  },
) {
  if (!l || typeof l !== "object") return fail("invalidListing");
  if (l.attest !== true) fail("attestRequired");
  const handle = await deps.db.handle(userId);
  if (!handle) fail("profileRequired");
  const cover = COVERS[h.suffix.charCodeAt(0) % COVERS.length]!;
  let kind: "template" | "prompt" | "launch";
  let price = 0;
  let data: Record<string, unknown>;
  let source: SourceInput | null = null;

  if (l.kind === "template") {
    kind = "template";
    const name = str(l.name, 60);
    const tagline = str(l.tagline, 140);
    const tier = Number(l.tier);
    const steps = (Array.isArray(l.storySteps) ? l.storySteps : []).slice(0, 30).map((s: { title?: unknown; body?: unknown }) => ({ title: str(s.title, 80), body: str(s.body, 4000) }));
    if (!name || !tagline) fail("missingFields");
    if (!(PRICE_TIERS as readonly number[]).includes(tier)) fail("invalidPrice");
    if (!LICENSES.includes(l.license as never)) fail("invalidLicense");
    screen(name, tagline, ...steps.flatMap((s) => [s.title, s.body]));
    source = (l.source as SourceInput) ?? fail("sourceRequired");
    price = tier * 100;
    data = {
      media: cleanMedia(l.media, userId, deps.mediaBase, MIN_TEMPLATE_SCREENSHOTS),
      storeLinks: cleanStoreLinks(l.storeLinks),
      name,
      tagline,
      category: str(l.category, 20) || "tools",
      creator: handle,
      currency: "HKD",
      rating: 0,
      reviewCount: 0,
      sales: 0,
      createdAt: h.today,
      updatedAt: h.today,
      stack: (Array.isArray(l.stack) ? l.stack : []).slice(0, 12).map((s) => str(s, 30)),
      platforms: (Array.isArray(l.platforms) ? l.platforms : []).filter((p) => ["iOS", "Android", "Web"].includes(p as string)),
      license: l.license,
      cover,
      screens: Math.min(Number(l.screenshots) || 0, 10),
      features: [],
      forWho: "",
      requirements: [],
      story: steps,
      freePreviewSteps: Math.max(0, Math.min(Number(l.freePreviewSteps) || 0, steps.length)),
      files: [],
      readme: "",
      reviews: [],
      versions: [{ version: "1.0.0", date: h.today, notes: "First release" }],
    };
  } else if (l.kind === "prompt") {
    kind = "prompt";
    const title = str(l.title, 80);
    const text = str(l.text, 20000);
    const tier = Number(l.tier);
    if (!title || !text) fail("missingFields");
    if (!(PROMPT_TIERS as readonly number[]).includes(tier)) fail("invalidPrice");
    screen(title, str(l.summary, 200), text);
    price = tier * 100;
    const lines = text.split("\n");
    const previewLines = Math.max(1, Math.min(Number(l.previewLines) || 1, lines.length));
    // Paid prompts keep only the preview public; the full text goes to prompt_texts after review.
    data = {
      title,
      summary: str(l.summary, 200),
      tool: str(l.tool, 40),
      category: "ai",
      creator: handle,
      rating: 0,
      reviewCount: 0,
      sales: 0,
      updatedAt: h.today,
      previewLines,
      lineCount: lines.length,
      text: price ? lines.slice(0, previewLines).join("\n") : text,
      sampleOutput: [],
      tags: [],
      cover,
      fullText: text,
    };
  } else if (l.kind === "launch") {
    kind = "launch";
    const name = str(l.name, 60);
    const tagline = str(l.tagline, 140);
    const link = str(l.link, 300);
    const storeLinks = cleanStoreLinks(l.storeLinks);
    // Somewhere to try it: an https website, a store page, or both.
    if (!name || !tagline || (link ? !/^https:\/\//.test(link) : !Object.keys(storeLinks).length)) fail("missingFields");
    screen(name, tagline);
    data = {
      media: cleanMedia(l.media, userId, deps.mediaBase),
      storeLinks,
      name,
      tagline,
      maker: handle,
      aiTools: (Array.isArray(l.aiTools) ? l.aiTools : []).slice(0, 8).map((s) => str(s, 30)),
      buildDays: Math.max(0, Math.min(Number(l.buildDays) || 0, 365)),
      platforms: [],
      upvotes: 0,
      comments: 0,
      launchedAt: new Date().toISOString(),
      boosted: false,
      shares: 0,
      trustedShare: 0,
      newAccountShare: 0,
      reports: 0,
      story: "",
      links: link ? [{ label: new URL(link).hostname, url: link }] : [],
      cover,
    };
  } else if (l.kind === "buyout" && !FEATURES.buyouts) {
    return fail("featureOff");
  } else {
    return fail("invalidListing");
  }

  const slug = slugFor(String(data.name ?? data.title), h.suffix);
  let sourceRow: Parameters<StudioDeps["db"]["saveSource"]>[0] | null = null;
  if (source?.kind === "zip") {
    const path = h.ownUpload(source.path);
    const { report, size } = await h.scanZip(path);
    if (isBlocking(report.checks)) fail("sourceBlocked");
    data.files = report.files;
    sourceRow = { slug, kind: "zip", repo: null, ref: null, path, size_bytes: size, report };
  } else if (source?.kind === "github") {
    const token = await h.githubToken();
    const repo = str(source.repo, 140);
    const ref = str(source.branch, 100) || "HEAD";
    const report = await h.scanRepo(token, repo, ref);
    if (isBlocking(report.checks)) fail("sourceBlocked");
    // A snapshot of the branch is stored, so buyers get exactly what was reviewed.
    const zip = await deps.github.zipball(token, repo, ref);
    const path = `listings/${slug}/source.zip`;
    await deps.storage.write(path, zip);
    data.files = report.files;
    sourceRow = { slug, kind: "github", repo, ref, path, size_bytes: zip.byteLength, report };
  }

  const fullText = data.fullText as string | undefined;
  delete data.fullText;
  await deps.db.rpc("studio_submit_listing", { p_user: userId, p_slug: slug, p_kind: kind, p_price: price, p_data: data, p_min_terms: TERMS_VERSION });
  if (fullText) await deps.db.rpc("studio_save_prompt_text", { p_slug: slug, p_text: fullText });
  if (sourceRow) await deps.db.saveSource(sourceRow);
  return { slug, status: "review" };
}
