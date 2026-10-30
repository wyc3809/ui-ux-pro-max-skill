/** @jest-environment node */
import { createHmac } from "node:crypto";
import { FEES, splitSale as displaySplit } from "../../src/lib/fees";
import { handleEvent, runSettlement, SettlementError, type Transfers } from "../functions/_shared/apply.ts";
import { fromRevenueCat, fromStripe, type RcEvent } from "../functions/_shared/events.ts";
import { balance, disputeEntry, type Order, planPayout, refundEntry, saleEntry, splitSale } from "../functions/_shared/ledger.ts";
import { postgresStore } from "../functions/_shared/db.ts";
import { SCHEDULE } from "../functions/_shared/schedule.ts";
import { stripeTransfers } from "../functions/_shared/stripe.ts";
import { verifyBearer, verifyStripe } from "../functions/_shared/verify.ts";
import { memoryStore } from "./memoryStore.ts";

const order: Order = { id: "o1", sellerId: "seller", gross: 15800, channelFee: 2370, platformFee: 2686, sellerAmount: 10744, purchasedAt: "2026-10-01T00:00:00.000Z" };

describe("fee schedule", () => {
  it("charges what the terms disclose", () => {
    const bps = (r: number) => Math.round(r * 10_000);
    expect(SCHEDULE.platformBps).toBe(bps(FEES.platformRate));
    expect(SCHEDULE.storeBps).toBe(bps(FEES.storeRate));
    expect(SCHEDULE.storeLargeBps).toBe(bps(FEES.storeRateLarge));
    expect(SCHEDULE.cardBps).toBe(bps(FEES.cardRate));
    expect(SCHEDULE.cardFixed).toBe(FEES.cardFixed * 100);
    expect(SCHEDULE.cardIntlExtraBps).toBe(bps(FEES.cardIntlExtra));
    expect(SCHEDULE.payoutBps).toBe(bps(FEES.payoutRate));
    expect(SCHEDULE.payoutFixed).toBe(FEES.payoutFixed * 100);
    expect(SCHEDULE.payoutMinimum).toBe(FEES.payoutMinimum * 100);
    expect(SCHEDULE.holdDays).toBe(FEES.holdDays);
    expect(SCHEDULE.buyoutCommissionBps).toBe(bps(FEES.buyoutCommission));
    expect(SCHEDULE.buyoutCommissionMinimum).toBe(FEES.buyoutCommissionMinimum * 100);
  });

  it("splits a sale exactly as the terms' worked examples", () => {
    expect(splitSale(15800, "app_store")).toEqual({ gross: 15800, channelFee: 2370, platformFee: 2686, sellerAmount: 10744 });
    expect(splitSale(15800, "app_store").sellerAmount / 100).toBe(displaySplit(158, "ios").seller);
    expect(splitSale(15800, "stripe").sellerAmount / 100).toBe(displaySplit(158, "web").seller);
  });

  it("uses the fee the provider actually charged when known, and never goes negative", () => {
    expect(splitSale(15800, "stripe", { actualChannelFee: 600 })).toEqual({ gross: 15800, channelFee: 600, platformFee: 3040, sellerAmount: 12160 });
    expect(splitSale(100, "stripe").sellerAmount).toBe(0);
    expect(() => splitSale(10.5, "stripe")).toThrow("invalidAmount");
  });
});

describe("ledger", () => {
  it("holds sale credits for 30 days; debits count at once", () => {
    const sale = saleEntry(order);
    expect(sale.availableAt).toBe("2026-10-31T00:00:00.000Z");
    expect(balance([sale], "2026-10-30T00:00:00.000Z")).toEqual({ total: 10744, available: 0, pending: 10744 });
    const refund = refundEntry(order, { id: "r1", amount: 15800, at: "2026-10-05T00:00:00.000Z" })!;
    expect(balance([sale, refund], "2026-10-06T00:00:00.000Z")).toEqual({ total: 0, available: -10744, pending: 10744 });
  });

  it("never reverses more than the sale credited across partial refunds", () => {
    const a = refundEntry(order, { id: "a", amount: 5000, at: order.purchasedAt })!;
    const b = refundEntry(order, { id: "b", amount: 5000, at: order.purchasedAt }, 5000)!;
    const c = refundEntry(order, { id: "c", amount: 9999, at: order.purchasedAt }, 10000)!;
    expect(a.amount + b.amount + c.amount).toBe(-10744);
    expect(refundEntry(order, { id: "d", amount: 100, at: order.purchasedAt }, 15800)).toBeNull();
  });

  it("holds a disputed sale and releases it only if the dispute is won", () => {
    const hold = disputeEntry(order, { id: "d1", status: "open", at: order.purchasedAt })!;
    expect(hold.amount).toBe(-10744);
    expect(disputeEntry(order, { id: "d1", status: "won", at: order.purchasedAt })!.amount).toBe(10744);
    expect(disputeEntry(order, { id: "d1", status: "lost", at: order.purchasedAt })).toBeNull();
  });

  it("rolls small balances over, waits for a ready account, and takes the transfer fee", () => {
    expect(planPayout(9_999, { payoutsEnabled: true })).toEqual({ status: "skip", reason: "belowMinimum", available: 9_999 });
    expect(planPayout(100_000, null)).toEqual({ status: "skip", reason: "accountNotReady", available: 100_000 });
    expect(planPayout(100_000, { payoutsEnabled: true })).toEqual({ status: "pay", gross: 100_000, fee: 275, net: 99_725 });
  });
});

describe("webhook payloads", () => {
  const rc = (event: Partial<RcEvent> & { type: string }) => ({ event: { id: "e1", app_user_id: "buyer", product_id: "tier_158", transaction_id: "tx1", store: "APP_STORE", event_timestamp_ms: 0, ...event } });

  it("reads a RevenueCat purchase with Apple's real take-home", () => {
    expect(fromRevenueCat(rc({ type: "NON_RENEWING_PURCHASE", price_in_purchased_currency: 158, currency: "HKD", takehome_percentage: 0.85, purchased_at_ms: 1_000 }), 7.8)).toEqual({
      type: "sale",
      provider: "app_store",
      eventId: "e1",
      externalId: "tx1",
      buyerId: "buyer",
      productId: "tier_158",
      gross: 15800,
      actualChannelFee: 2370,
      at: "1970-01-01T00:00:01.000Z",
    });
  });

  it("converts other currencies from RevenueCat's USD price, and reads refunds", () => {
    expect(fromRevenueCat(rc({ type: "INITIAL_PURCHASE", store: "PLAY_STORE", price: 19.99, price_in_purchased_currency: 2990, currency: "JPY" }), 7.8)).toMatchObject({ provider: "play_store", gross: 15592 });
    expect(fromRevenueCat(rc({ type: "CANCELLATION", cancel_reason: "CUSTOMER_SUPPORT", price: -19.99 }), 7.8)).toMatchObject({ type: "refund", externalId: "tx1", amount: 15592 });
    expect(fromRevenueCat(rc({ type: "CANCELLATION", cancel_reason: "UNSUBSCRIBE" }), 7.8).type).toBe("ignored");
    expect(fromRevenueCat(rc({ type: "NON_RENEWING_PURCHASE", store: "STRIPE", price: 1 }), 7.8).type).toBe("ignored");
  });

  it("reads Stripe checkout, refunds, disputes and account updates", () => {
    const ev = (type: string, object: Record<string, unknown>) => ({ id: "evt", type, created: 1, data: { object } });
    expect(fromStripe(ev("checkout.session.completed", { payment_status: "paid", currency: "hkd", amount_total: 15800, payment_intent: "pi_1", metadata: { listing_id: "l1", buyer_id: "buyer" } }))).toMatchObject({
      type: "sale",
      externalId: "pi_1",
      listingId: "l1",
      gross: 15800,
    });
    expect(() => fromStripe(ev("checkout.session.completed", { payment_status: "paid", currency: "usd", amount_total: 1 }))).toThrow("unsupportedCurrency");
    expect(fromStripe(ev("checkout.session.completed", { payment_status: "unpaid" })).type).toBe("ignored");
    expect(fromStripe(ev("refund.created", { id: "re_1", amount: 500, payment_intent: "pi_1" }))).toMatchObject({ type: "refund", refundId: "re_1", amount: 500 });
    expect(fromStripe(ev("charge.dispute.closed", { id: "dp_1", status: "lost", payment_intent: "pi_1" }))).toMatchObject({ status: "lost" });
    expect(fromStripe(ev("charge.dispute.closed", { id: "dp_1", status: "warning_closed", payment_intent: "pi_1" }))).toMatchObject({ status: "won" });
    expect(fromStripe(ev("account.updated", { id: "acct_1", payouts_enabled: true, details_submitted: true }))).toMatchObject({ type: "account", payoutsEnabled: true });
  });
});

describe("webhook signatures", () => {
  it("accepts a fresh Stripe signature and rejects tampering or replays", async () => {
    const body = '{"id":"evt"}';
    const sig = createHmac("sha256", "whsec").update(`100.${body}`).digest("hex");
    await expect(verifyStripe(body, `t=100,v1=${sig}`, "whsec", 150)).resolves.toBe(true);
    await expect(verifyStripe(`${body} `, `t=100,v1=${sig}`, "whsec", 150)).resolves.toBe(false);
    await expect(verifyStripe(body, `t=100,v1=${sig}`, "whsec", 1_000)).resolves.toBe(false);
    await expect(verifyStripe(body, null, "whsec", 150)).resolves.toBe(false);
  });

  it("checks bearer secrets (RevenueCat, cron)", () => {
    expect(verifyBearer("Bearer s3cret", "s3cret")).toBe(true);
    expect(verifyBearer("Bearer nope", "s3cret")).toBe(false);
    expect(verifyBearer("Bearer ", "")).toBe(false);
  });
});

describe("settlement", () => {
  const sale = (eventId: string, externalId: string, buyerId = "buyer") =>
    ({ type: "sale", provider: "stripe", eventId, externalId, buyerId, listingId: "l1", gross: 50_000, at: "2026-09-01T00:00:00.000Z" }) as const;
  const okTransfers = (): Transfers & { calls: unknown[] } => {
    const calls: unknown[] = [];
    return { calls, transfer: async (t) => (calls.push(t), { id: `tr_${t.payoutId}` }) };
  };
  const setup = () => {
    const m = memoryStore();
    m.addListing("l1", "seller");
    m.addAccount("seller", "acct_1");
    return m;
  };

  it("applies each webhook once, however often the provider retries", async () => {
    const m = setup();
    await expect(handleEvent(m.store, sale("evt_1", "pi_1"))).resolves.toBe("applied");
    await expect(handleEvent(m.store, sale("evt_1", "pi_1"))).resolves.toBe("duplicate");
    await expect(handleEvent(m.store, sale("evt_2", "pi_1"))).resolves.toBe("applied");
    expect(m.data.orders).toHaveLength(1);
    expect(m.data.entries).toHaveLength(1);
  });

  it("matches an IAP sale to the buyer's purchase intent, and refuses unknown or self purchases", async () => {
    const m = setup();
    const iap = { type: "sale", provider: "app_store", eventId: "e", externalId: "tx", buyerId: "buyer", productId: "tier_158", gross: 15800, at: order.purchasedAt } as const;
    await expect(handleEvent(m.store, iap)).rejects.toThrow("intentNotFound");
    m.addIntent("buyer", "l1");
    await handleEvent(m.store, iap);
    expect(m.data.orders[0]).toMatchObject({ listingId: "l1", sellerId: "seller", sellerAmount: 10744 });
    await expect(handleEvent(m.store, sale("e2", "pi_2", "seller"))).rejects.toThrow(SettlementError);
  });

  it("waits for refunds and disputes to find their order", async () => {
    const m = setup();
    await expect(handleEvent(m.store, { type: "refund", provider: "stripe", eventId: "e", externalId: "pi_x", refundId: "r", at: order.purchasedAt })).rejects.toThrow("orderNotFound");
  });

  it("pays after the hold, once per month, minus the transfer fee", async () => {
    const m = setup();
    await handleEvent(m.store, sale("e1", "pi_1"));
    const t = okTransfers();

    const early = await runSettlement(m.store, t, "2026-09-15T00:00:00.000Z");
    expect(early.paid).toEqual([]);
    expect(t.calls).toHaveLength(0);

    const due = await runSettlement(m.store, t, "2026-10-09T00:00:00.000Z");
    const net = 50_000 - 1_935; // card fee 3.4% + 2.35
    const seller = net - Math.round(net * 0.2);
    expect(due.paid).toEqual([{ sellerId: "seller", payoutId: expect.any(String), net: seller - (Math.round(seller * 0.0025) + 25) }]);

    await runSettlement(m.store, t, "2026-10-20T00:00:00.000Z");
    expect(t.calls).toHaveLength(1);
    expect(balance(m.data.entries, "2026-10-20T00:00:00.000Z").total).toBe(0);
  });

  it("puts a failed transfer back so the next run pays it", async () => {
    const m = setup();
    await handleEvent(m.store, sale("e1", "pi_1"));
    const failing: Transfers = { transfer: async () => Promise.reject(new Error("bank closed")) };
    const r1 = await runSettlement(m.store, failing, "2026-10-09T00:00:00.000Z");
    expect(r1.failed).toEqual([{ sellerId: "seller", payoutId: expect.any(String), failure: "bank closed" }]);
    expect(balance(m.data.entries, "2026-10-09T00:00:00.000Z").available).toBe(38_452);

    const t = okTransfers();
    expect((await runSettlement(m.store, t, "2026-10-10T00:00:00.000Z")).paid).toHaveLength(1);
  });

  it("finishes a payout a crashed run left pending", async () => {
    const m = setup();
    await handleEvent(m.store, sale("e1", "pi_1"));
    await m.store.createPayout({ sellerId: "seller", period: "2026-10", gross: 38_452, fee: 121, now: "2026-10-09T00:00:00.000Z" });
    const t = okTransfers();
    const r = await runSettlement(m.store, t, "2026-10-09T01:00:00.000Z");
    expect(r.paid).toHaveLength(1);
    expect(t.calls).toHaveLength(1);
  });

  it("skips a seller whose balance changed mid-run and still pays the others", async () => {
    const m = setup();
    m.addListing("l2", "seller2");
    m.addAccount("seller2", "acct_2");
    await handleEvent(m.store, sale("e1", "pi_1"));
    await handleEvent(m.store, { ...sale("e2", "pi_2"), listingId: "l2" });
    const create = m.store.createPayout;
    m.store.createPayout = async (p) => (p.sellerId === "seller" ? Promise.reject(new Error("balanceChanged")) : create(p));
    const r = await runSettlement(m.store, okTransfers(), "2026-10-09T00:00:00.000Z");
    expect(r.skipped).toEqual([{ sellerId: "seller", reason: "balanceChanged", available: 38_452 }]);
    expect(r.paid.map((p) => p.sellerId)).toEqual(["seller2"]);
  });

  it("keeps the balance while the seller's account cannot receive payouts", async () => {
    const m = setup();
    m.addAccount("seller", "acct_1", false);
    await handleEvent(m.store, sale("e1", "pi_1"));
    const r = await runSettlement(m.store, okTransfers(), "2026-10-09T00:00:00.000Z");
    expect(r.skipped).toEqual([{ sellerId: "seller", reason: "accountNotReady", available: 38_452 }]);
    await handleEvent(m.store, { type: "account", provider: "stripe", eventId: "a", stripeAccountId: "acct_1", payoutsEnabled: true, detailsSubmitted: true });
    expect((await runSettlement(m.store, okTransfers(), "2026-10-10T00:00:00.000Z")).paid).toHaveLength(1);
  });

  it("recovers a refund after payout from later sales", async () => {
    const m = setup();
    await handleEvent(m.store, sale("e1", "pi_1"));
    await runSettlement(m.store, okTransfers(), "2026-10-09T00:00:00.000Z");
    await handleEvent(m.store, { type: "refund", provider: "stripe", eventId: "r1", externalId: "pi_1", refundId: "re_1", at: "2026-10-12T00:00:00.000Z" });
    await handleEvent(m.store, { type: "refund", provider: "stripe", eventId: "r2", externalId: "pi_1", refundId: "re_2", amount: 100, at: "2026-10-12T00:00:00.000Z" });
    expect(balance(m.data.entries, "2026-10-12T00:00:00.000Z").total).toBe(-38_452);
    const r = await runSettlement(m.store, okTransfers(), "2026-11-09T00:00:00.000Z");
    expect(r.paid).toEqual([]);
  });
});

describe("production adapters", () => {
  const fake = (responses: [number, unknown][]) => {
    const calls: { url: string; init: RequestInit }[] = [];
    const fn = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      const [status, body] = responses.shift() ?? [200, null];
      return new Response(body == null ? "" : JSON.stringify(body), { status });
    }) as unknown as typeof fetch;
    return { calls, fn };
  };

  it("sends one idempotent HKD transfer per payout and surfaces Stripe's error", async () => {
    const f = fake([[200, { id: "tr_1" }], [400, { error: { message: "No such destination" } }]]);
    const t = stripeTransfers("sk_test", f.fn);
    await expect(t.transfer({ amount: 99_725, destination: "acct_1", payoutId: "p1" })).resolves.toEqual({ id: "tr_1" });
    const headers = f.calls[0]!.init.headers as Record<string, string>;
    expect(headers["Idempotency-Key"]).toBe("payout_p1");
    expect(String(f.calls[0]!.init.body)).toBe("amount=99725&currency=hkd&destination=acct_1&transfer_group=p1&metadata%5Bpayout_id%5D=p1");
    await expect(t.transfer({ amount: 1, destination: "acct_x", payoutId: "p2" })).rejects.toThrow("No such destination");
  });

  it("writes through PostgREST with conflict-ignoring inserts and surfaces SQL errors", async () => {
    const realFetch = globalThis.fetch;
    const f = fake([[201, null], [400, { message: "balanceChanged" }], [200, [{ available: 38452 }]]]);
    globalThis.fetch = f.fn;
    try {
      const store = postgresStore("https://demo.supabase.co", "service");
      await store.insertEntries([saleEntry(order)]);
      expect(f.calls[0]!.url).toBe("https://demo.supabase.co/rest/v1/ledger_entries?on_conflict=source_key");
      expect((f.calls[0]!.init.headers as Record<string, string>).Prefer).toBe("resolution=ignore-duplicates,return=minimal");
      await expect(store.createPayout({ sellerId: "s", period: "2026-10", gross: 1, fee: 0, now: order.purchasedAt })).rejects.toThrow("balanceChanged");
      await expect(store.available("s", order.purchasedAt)).resolves.toBe(38452);
      expect(f.calls[2]!.url).toBe("https://demo.supabase.co/rest/v1/rpc/seller_balance");
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});
