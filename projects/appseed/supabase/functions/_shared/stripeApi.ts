/** Minimal Stripe REST client (form-encoded), so functions need no npm package. Errors carry Stripe's message. */
export type StripePost = (path: string, params: Record<string, string>, idempotencyKey?: string) => Promise<Record<string, unknown>>;

export function stripeClient(secretKey: string, fetcher: typeof fetch = fetch): StripePost {
  return async (path, params, idempotencyKey) => {
    const res = await fetcher(`https://api.stripe.com/v1/${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : null),
      },
      body: new URLSearchParams(params),
    });
    const json = (await res.json()) as Record<string, unknown> & { error?: { message?: string } };
    if (!res.ok) throw new Error(json.error?.message ?? `stripe ${res.status}`);
    return json;
  };
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
