/**
 * Minimal Stripe REST clients, so functions need no npm package. Errors carry Stripe's message.
 * Every call pins the API version (docs/DESIGN.md §32); keys are restricted keys (rk_) with only the
 * permissions each function needs, kept in Supabase secrets, never in code.
 */
export const STRIPE_API_VERSION = "2026-10-28.endive";

export type StripePost = (path: string, params: Record<string, string>, idempotencyKey?: string) => Promise<Record<string, unknown>>;

const fail = async (res: Response) => {
  const json = (await res.json()) as Record<string, unknown> & { error?: { message?: string } };
  if (!res.ok) throw new Error(json.error?.message ?? `stripe ${res.status}`);
  return json;
};

/** v1 (form-encoded): Checkout Sessions, login links. */
export function stripeClient(secretKey: string, fetcher: typeof fetch = fetch): StripePost {
  return async (path, params, idempotencyKey) =>
    fail(
      await fetcher(`https://api.stripe.com/v1/${path}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "Stripe-Version": STRIPE_API_VERSION,
          ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : null),
        },
        body: new URLSearchParams(params),
      }),
    );
}

/** v2 (JSON): Accounts v2 and its account links. */
export type StripeV2 = {
  post(path: string, body: Record<string, unknown>, idempotencyKey?: string): Promise<Record<string, unknown>>;
  get(path: string, include?: string[]): Promise<Record<string, unknown>>;
};

export function stripeV2(secretKey: string, fetcher: typeof fetch = fetch): StripeV2 {
  const headers = { Authorization: `Bearer ${secretKey}`, "Stripe-Version": STRIPE_API_VERSION };
  return {
    post: async (path, body, idempotencyKey) =>
      fail(
        await fetcher(`https://api.stripe.com/v2/${path}`, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json", ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : null) },
          body: JSON.stringify(body),
        }),
      ),
    get: async (path, include = []) => {
      const q = include.map((v, i) => `include[${i}]=${encodeURIComponent(v)}`).join("&");
      return fail(await fetcher(`https://api.stripe.com/v2/${path}${q ? `?${q}` : ""}`, { headers }));
    },
  };
}

/**
 * A seller's payout readiness from an Accounts v2 account (retrieved with include configuration.recipient and
 * requirements): transfers can be sent once stripe_balance.stripe_transfers is active; details are submitted
 * when nothing is currently due or past due.
 */
export function recipientStatus(account: Record<string, unknown>): { transfersActive: boolean; detailsSubmitted: boolean } {
  const a = account as {
    configuration?: { recipient?: { capabilities?: { stripe_balance?: { stripe_transfers?: { status?: string } } } } };
    requirements?: { entries?: { minimum_deadline?: { status?: string } }[] };
  };
  const status = a.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status;
  const due = (a.requirements?.entries ?? []).some((e) => e.minimum_deadline?.status === "currently_due" || e.minimum_deadline?.status === "past_due");
  return { transfersActive: status === "active", detailsSubmitted: !due };
}

/** Only return to our own site after Checkout or onboarding; anything else falls back to the site root. */
export function safeReturn(url: unknown, site: string): string {
  if (typeof url !== "string" || !site) return site;
  try {
    const u = new URL(url);
    const s = new URL(site);
    return u.origin === s.origin ? u.toString() : site;
  } catch {
    return site;
  }
}
