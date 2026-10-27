/**
 * Creator social links (docs/DESIGN.md §29). Creators enter a handle or paste a profile URL; we store the
 * bare handle and build the URL ourselves, so a link can only ever point at the network it claims to be.
 * The one free-form link is a website, which must be https.
 */

export const BIO_MAX = 160;

export const SOCIALS = ["x", "instagram", "github", "threads", "linkedin", "youtube", "website"] as const;
export type Social = (typeof SOCIALS)[number];
export type SocialLinks = Partial<Record<Social, string>>;

const HOSTS: Record<Exclude<Social, "website">, string[]> = {
  x: ["x.com", "twitter.com"],
  instagram: ["instagram.com"],
  github: ["github.com"],
  threads: ["threads.net", "threads.com"],
  linkedin: ["linkedin.com"],
  youtube: ["youtube.com"],
};

const PATTERN: Record<Exclude<Social, "website">, RegExp> = {
  x: /^[A-Za-z0-9_]{1,15}$/,
  instagram: /^[A-Za-z0-9._]{1,30}$/,
  github: /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/,
  threads: /^[A-Za-z0-9._]{1,30}$/,
  linkedin: /^[A-Za-z0-9-]{3,100}$/,
  youtube: /^[A-Za-z0-9._-]{3,30}$/,
};

export type LinkError = "invalidHandle" | "wrongSite" | "needsHttps";

/** Turns what the creator typed (handle, @handle or profile URL) into the stored value, or an error. */
export function normalizeSocial(kind: Social, input: string): { value: string } | { error: LinkError } | { value: "" } {
  const raw = input.trim();
  if (!raw) return { value: "" };
  if (kind === "website") {
    try {
      const u = new URL(raw);
      if (u.protocol !== "https:" || !u.hostname.includes(".")) return { error: "needsHttps" };
      return { value: u.toString().replace(/\/$/, "") };
    } catch {
      return { error: "needsHttps" };
    }
  }
  let handle = raw;
  if (/^https?:\/\//i.test(raw) || HOSTS[kind].some((h) => raw.toLowerCase().startsWith(h) || raw.toLowerCase().startsWith(`www.${h}`))) {
    let u: URL;
    try {
      u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    } catch {
      return { error: "invalidHandle" };
    }
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    if (!HOSTS[kind].includes(host)) return { error: "wrongSite" };
    const parts = u.pathname.split("/").filter(Boolean);
    // LinkedIn profiles live under /in/, YouTube channels under /@.
    handle = kind === "linkedin" ? (parts[0] === "in" ? parts[1] ?? "" : "") : parts[0] ?? "";
  }
  handle = handle.replace(/^@/, "");
  return PATTERN[kind].test(handle) ? { value: handle } : { error: "invalidHandle" };
}

/** The public URL for a stored link. */
export function socialUrl(kind: Social, value: string): string {
  switch (kind) {
    case "x":
      return `https://x.com/${value}`;
    case "instagram":
      return `https://www.instagram.com/${value}`;
    case "github":
      return `https://github.com/${value}`;
    case "threads":
      return `https://www.threads.net/@${value}`;
    case "linkedin":
      return `https://www.linkedin.com/in/${value}`;
    case "youtube":
      return `https://www.youtube.com/@${value}`;
    case "website":
      return value;
  }
}

/** What the button shows: @handle for networks, the bare domain for a website. */
export function socialLabel(kind: Social, value: string): string {
  if (kind === "website") return new URL(value).hostname.replace(/^www\./, "");
  return kind === "github" || kind === "linkedin" ? value : `@${value}`;
}

/** Filled links in display order. */
export const linkList = (links: SocialLinks | undefined) => SOCIALS.filter((k) => !!links?.[k]).map((k) => ({ kind: k, value: links![k]! }));
