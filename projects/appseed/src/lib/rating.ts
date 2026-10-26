export type Star = "full" | "half" | "empty";

/** Rounds to the nearest 0.5 and returns 5 star states. */
export function starStates(value: number): Star[] {
  const v = Math.round(Math.min(Math.max(value, 0), 5) * 2) / 2;
  return Array.from({ length: 5 }, (_, i) => (v >= i + 1 ? "full" : v >= i + 0.5 ? "half" : "empty"));
}

/** Fewer than 3 reviews shows "new" instead of a score (§7). */
export function isNewListing(reviewCount: number): boolean {
  return reviewCount < 3;
}
