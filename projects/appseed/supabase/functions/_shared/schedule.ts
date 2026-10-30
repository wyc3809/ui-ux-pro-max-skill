/**
 * The server's fee schedule (docs/DESIGN.md §31). Settlement charges from this file, never from the app.
 * Amounts are in minor units (HK cents) and rates in basis points, so every calculation is integer maths.
 * A test checks it against src/lib/fees.ts, the copy the terms disclose; change both together.
 */
export const SCHEDULE = {
  /** All seller balances and payouts are in this currency. */
  currency: "HKD",
  platformBps: 2000,
  storeBps: 1500,
  storeLargeBps: 3000,
  cardBps: 340,
  cardFixed: 235,
  cardIntlExtraBps: 50,
  payoutBps: 25,
  payoutFixed: 25,
  payoutMinimum: 10_000,
  holdDays: 30,
  buyoutCommissionBps: 500,
  buyoutCommissionMinimum: 50_000,
} as const;

/** Rounds half away from zero, so a refund of a sale reverses exactly what the sale credited. */
export const bps = (amount: number, rate: number) => Math.sign(amount) * Math.round((Math.abs(amount) * rate) / 10_000);
