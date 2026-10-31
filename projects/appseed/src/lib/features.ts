/**
 * Markets switched on in this release. Version 1 ships without whole-app buyouts (no escrow partner or company
 * account yet, and it is the part most likely to be questioned in App Review), so every buyout entry point
 * follows this flag: the Explore hub, search, the studio wizard, Library offers, saved buyouts, promoted posts
 * attaching a buyout, the fee terms and deep links. Turning it back on restores all of them.
 */
export const FEATURES = { buyouts: false } as const;

type Kind = "template" | "prompt" | "buyout" | "launch";

export const kindEnabled = (kind: Kind, features: { buyouts: boolean } = FEATURES) => kind !== "buyout" || features.buyouts;

/** Drops posts that promote a market this release does not offer. */
export function withEnabledAttachments<T extends { attachment?: { kind: Kind } }>(posts: T[], features: { buyouts: boolean } = FEATURES): T[] {
  return posts.filter((p) => !p.attachment || kindEnabled(p.attachment.kind, features));
}
