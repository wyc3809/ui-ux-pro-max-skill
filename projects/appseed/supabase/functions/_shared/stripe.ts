import type { Transfers } from "./apply.ts";
import { SCHEDULE } from "./schedule.ts";

/**
 * Stripe Connect transfers over the REST API. The idempotency key is the payout id, so retrying a payout an
 * earlier run left pending never sends the money twice. Stripe then pays the seller's bank on its own schedule.
 */
export function stripeTransfers(secretKey: string, fetcher: typeof fetch = fetch): Transfers {
  return {
    async transfer({ amount, destination, payoutId }) {
      const res = await fetcher("https://api.stripe.com/v1/transfers", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "Idempotency-Key": `payout_${payoutId}`,
        },
        body: new URLSearchParams({
          amount: String(amount),
          currency: SCHEDULE.currency.toLowerCase(),
          destination,
          transfer_group: payoutId,
          "metadata[payout_id]": payoutId,
        }),
      });
      const json = (await res.json()) as { id?: string; error?: { message?: string } };
      if (!res.ok || !json.id) throw new Error(json.error?.message ?? `stripe ${res.status}`);
      return { id: json.id };
    },
  };
}
