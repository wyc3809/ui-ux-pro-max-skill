import { safeReturn, type StripePost } from "./stripeApi.ts";

/**
 * Seller payout setup with Stripe Connect Express (docs/DESIGN.md §32): Stripe collects identity and bank
 * details on its own pages, AppSeed keeps only the account id and whether payouts are enabled (kept current
 * by the account.updated webhook). A seller needs only a bank account, not their own Stripe account.
 */
export type ConnectState = { state: "none" | "pending" | "ready"; payoutsEnabled: boolean };

export interface ConnectDb {
  account(userId: string): Promise<{ stripeAccountId: string; payoutsEnabled: boolean; detailsSubmitted: boolean } | null>;
  saveAccount(userId: string, stripeAccountId: string): Promise<void>;
}

export class ConnectError extends Error {}

export const stateOf = (a: { payoutsEnabled: boolean } | null): ConnectState => ({ state: !a ? "none" : a.payoutsEnabled ? "ready" : "pending", payoutsEnabled: !!a?.payoutsEnabled });

export async function handleConnect(
  db: ConnectDb,
  stripe: StripePost,
  userId: string,
  body: { action?: unknown; country?: unknown; returnUrl?: unknown },
  site: string,
): Promise<ConnectState | { url: string }> {
  const account = await db.account(userId);
  switch (body.action) {
    case "status":
      return stateOf(account);
    case "onboard": {
      let id = account?.stripeAccountId;
      if (!id) {
        const country = typeof body.country === "string" && /^[A-Z]{2}$/.test(body.country) ? body.country : "HK";
        const created = await stripe(
          "accounts",
          {
            type: "express",
            country,
            "capabilities[transfers][requested]": "true",
            "metadata[user_id]": userId,
            // Sellers outside Hong Kong receive transfers under Stripe's recipient agreement.
            ...(country === "HK" ? null : { "tos_acceptance[service_agreement]": "recipient" }),
          },
          `connect-account-${userId}`,
        );
        id = String(created.id);
        await db.saveAccount(userId, id);
      }
      const back = safeReturn(body.returnUrl, site);
      const link = await stripe("account_links", { account: id, refresh_url: back, return_url: back, type: "account_onboarding" });
      return { url: String(link.url) };
    }
    case "dashboard": {
      if (!account) throw new ConnectError("notConnected");
      const link = await stripe(`accounts/${account.stripeAccountId}/login_links`, {});
      return { url: String(link.url) };
    }
    default:
      throw new ConnectError("unknownAction");
  }
}
