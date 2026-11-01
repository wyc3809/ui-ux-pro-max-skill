/** @jest-environment node */
// The sandbox setup script (scripts/stripe-sandbox-setup.mjs) must match what the payments webhook handles.
import fs from "fs";
import path from "path";

const src = fs.readFileSync(path.join(__dirname, "../../scripts/stripe-sandbox-setup.mjs"), "utf8");
const events = fs.readFileSync(path.join(__dirname, "../functions/_shared/events.ts"), "utf8");
/** The quoted strings of `export const NAME = [ … ];` (event names themselves contain brackets). */
const list = (name: string) => [...src.split(`export const ${name} = [`)[1]!.split("];")[0]!.matchAll(/"([^"]+)"/g)].map((m) => m[1]!);

describe("Stripe sandbox setup", () => {
  it("subscribes exactly the events the webhook reads", () => {
    expect(list("SNAPSHOT_EVENTS")).toHaveLength(6);
    expect(list("THIN_EVENTS")).toHaveLength(2);
    for (const ev of list("SNAPSHOT_EVENTS").filter((e: string) => e !== "checkout.session.async_payment_failed")) expect(events).toContain(`"${ev}"`);
    for (const ev of list("THIN_EVENTS")) expect(ev.startsWith("v2.core.account")).toBe(true);
    expect(src).toContain(`API_VERSION = "2026-10-28.endive"`);
  });

  it("refuses live keys and never puts secrets on the command line", () => {
    expect(src).toMatch(/\(sk\|rk\)_test_/);
    expect(src).toContain('"--env-file"');
    expect(src).not.toMatch(/secrets", "set", `STRIPE/);
  });
});
