import type { ItemKind } from "./engagement";

/**
 * One address for everything (docs/DESIGN.md §38). appseed.app serves the web app; the same links open the
 * iOS and Android apps when installed (universal links / App Links, see app.json and public/.well-known).
 * Short share paths (/t/slug …) redirect to the full routes, so a link works the same on every platform.
 */
export const ORIGIN = "https://appseed.app";

const SHORT: Record<ItemKind, string> = { template: "t", prompt: "p", buyout: "b", launch: "l" };
export const ROUTE: Record<ItemKind, string> = { template: "template", prompt: "prompt", buyout: "buyout", launch: "launch" };

export const shortPath = (kind: ItemKind, slug: string) => `/${SHORT[kind]}/${slug}`;
export const appPath = (kind: ItemKind, slug: string) => `/${ROUTE[kind]}/${slug}`;
export const postLink = (id: string) => `${ORIGIN}/post/${id}`;

/** Pages of the public site, shipped in public/ next to the web app. */
export const SITE = { about: `${ORIGIN}/about.html`, support: `${ORIGIN}/support.html`, privacy: `${ORIGIN}/privacy.html`, terms: `${ORIGIN}/terms.html` };
