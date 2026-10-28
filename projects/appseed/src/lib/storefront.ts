/**
 * Where the app may point people to pay outside it (docs/DESIGN.md §30). Since the May 2025 US ruling, apps on
 * the United States storefront may link to an external website for purchases (App Review 3.1.1(a)); other
 * storefronts may not without a special entitlement. Buyouts are business transfers paid by escrow on the web,
 * so outside the US the app explains where to finish instead of linking or emailing a link.
 * Recheck when Apple's or Google's rules change; the server can override per storefront.
 */

/** Storefronts (ISO 3166 alpha-2 or StoreKit alpha-3) where an external purchase link is allowed. */
const LINK_OUT = new Set(["US", "USA"]);

export function canLinkOut(storefront: string | null | undefined, overrides: string[] = []): boolean {
  if (!storefront) return false;
  const code = storefront.toUpperCase();
  return LINK_OUT.has(code) || overrides.map((o) => o.toUpperCase()).includes(code);
}

export const ESCROW_URL = "https://appseed.app/deals";
