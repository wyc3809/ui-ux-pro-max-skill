/** "新作推廣" launch board rules. */

/**
 * A 24 hour sponsored slot is a digital service used inside the app, so it is sold with in-app purchase
 * (App Review 3.1.1) at a fixed tier, never through Stripe in the app.
 */
export const BOOST_PRODUCT = { id: "launch_boost_24h", price: 38 } as const;

/** Toggle an upvote; returns the new count. One vote per user, enforced by the server too. */
export function toggleVote(count: number, voted: boolean): { count: number; voted: boolean } {
  return voted ? { count: Math.max(0, count - 1), voted: false } : { count: count + 1, voted: true };
}
