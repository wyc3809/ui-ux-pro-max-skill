import { recipientStatus, safeReturn, type StripePost, type StripeV2 } from "./stripeApi.ts";

/**
 * Seller payout setup with Stripe Connect (docs/DESIGN.md §32), on Accounts v2 as a marketplace: each seller is a
 * recipient account (stripe_balance.stripe_transfers) with the Express dashboard; VCseed collects fees and owns
 * losses, because the platform sells and pays sellers by separate transfers after the refund window.
 * Stripe collects identity and bank details on its own pages; VCseed keeps only the account id and whether
 * transfers are active (kept current by account events, and refreshed when the seller comes back).
 */
export type ConnectState = { state: "none" | "pending" | "ready"; payoutsEnabled: boolean };

export interface ConnectDb {
  account(userId: string): Promise<{ stripeAccountId: string; payoutsEnabled: boolean; detailsSubmitted: boolean } | null>;
  saveAccount(userId: string, stripeAccountId: string): Promise<void>;
  /** `payoutsEnabled` stores whether stripe_transfers is active. */
  setStatus(stripeAccountId: string, payoutsEnabled: boolean, detailsSubmitted: boolean): Promise<void>;
}

export type ConnectStripe = { v1: StripePost; v2: StripeV2 };

export class ConnectError extends Error {}

export const stateOf = (a: { payoutsEnabled: boolean } | null): ConnectState => ({ state: !a ? "none" : a.payoutsEnabled ? "ready" : "pending", payoutsEnabled: !!a?.payoutsEnabled });

/** Reads the account from Stripe and stores its readiness (the seller may have just finished onboarding). */
export async function refreshAccount(db: Pick<ConnectDb, "setStatus">, v2: StripeV2, stripeAccountId: string) {
  const s = recipientStatus(await v2.get(`core/accounts/${stripeAccountId}`, ["configuration.recipient", "requirements"]));
  await db.setStatus(stripeAccountId, s.transfersActive, s.detailsSubmitted);
  return s;
}

/** Turns an account change notice into the account's stored readiness, read fresh from Accounts v2. */
export async function accountEvent(ev: { provider: "stripe" | "app_store" | "play_store"; eventId: string; stripeAccountId: string }, v2: StripeV2) {
  const s = recipientStatus(await v2.get(`core/accounts/${ev.stripeAccountId}`, ["configuration.recipient", "requirements"]));
  return { type: "account" as const, provider: ev.provider, eventId: ev.eventId, stripeAccountId: ev.stripeAccountId, payoutsEnabled: s.transfersActive, detailsSubmitted: s.detailsSubmitted };
}

export async function handleConnect(
  db: ConnectDb,
  stripe: ConnectStripe,
  userId: string,
  body: { action?: unknown; country?: unknown; returnUrl?: unknown; email?: unknown; name?: unknown },
  site: string,
): Promise<ConnectState | { url: string }> {
  const account = await db.account(userId);
  switch (body.action) {
    case "status": {
      // Back from onboarding, the webhook may not have arrived yet: ask Stripe directly while still pending.
      if (account && !account.payoutsEnabled) {
        const s = await refreshAccount(db, stripe.v2, account.stripeAccountId);
        return stateOf({ payoutsEnabled: s.transfersActive });
      }
      return stateOf(account);
    }
    case "onboard": {
      let id = account?.stripeAccountId;
      if (!id) {
        const country = typeof body.country === "string" && /^[A-Z]{2}$/.test(body.country) ? body.country : "HK";
        const created = await stripe.v2.post(
          "core/accounts",
          {
            ...(typeof body.email === "string" && body.email.includes("@") ? { contact_email: body.email } : null),
            ...(typeof body.name === "string" && body.name ? { display_name: body.name.slice(0, 100) } : null),
            dashboard: "express",
            defaults: { responsibilities: { fees_collector: "application", losses_collector: "application" } },
            identity: { country: country.toLowerCase() },
            configuration: { recipient: { capabilities: { stripe_balance: { stripe_transfers: { requested: true } } } } },
            metadata: { user_id: userId },
            include: ["configuration.recipient", "requirements"],
          },
          `connect-account-${userId}`,
        );
        id = String(created.id);
        await db.saveAccount(userId, id);
      }
      const back = safeReturn(body.returnUrl, site);
      const link = await stripe.v2.post("core/account_links", {
        account: id,
        // Incremental onboarding: only what is due now; Stripe asks for more as earnings grow.
        use_case: { type: "account_onboarding", account_onboarding: { configurations: ["recipient"], return_url: back, refresh_url: back, collection_options: { fields: "currently_due" } } },
      });
      return { url: String(link.url) };
    }
    case "dashboard": {
      if (!account) throw new ConnectError("notConnected");
      const link = await stripe.v1(`accounts/${account.stripeAccountId}/login_links`, {});
      return { url: String(link.url) };
    }
    default:
      throw new ConnectError("unknownAction");
  }
}
