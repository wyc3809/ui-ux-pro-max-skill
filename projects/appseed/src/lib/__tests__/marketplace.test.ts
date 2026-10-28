import { buyoutTone, escrowFee, offerStep, revenueMultiple, validateOffer } from "../buyout";
import { toggleVote } from "../launch";
import { fillPrompt, PROMPT_TIERS, promptVariables, splitPreview } from "../prompt";

describe("prompt", () => {
  const text = "Build a {{app_type}} with Expo.\nUse {{ backend }} for auth.\nName it {{app_type}}.";
  it("extracts unique variables in order", () => {
    expect(promptVariables(text)).toEqual(["app_type", "backend"]);
    expect(promptVariables("no vars")).toEqual([]);
  });
  it("fills variables and keeps unfilled ones visible", () => {
    expect(fillPrompt(text, { app_type: "habit tracker", backend: " " })).toBe("Build a habit tracker with Expo.\nUse {{ backend }} for auth.\nName it habit tracker.");
  });
  it("splits the free preview from locked lines", () => {
    expect(splitPreview(text, 1)).toEqual({ visible: "Build a {{app_type}} with Expo.", lockedLines: 2 });
    expect(splitPreview(text, 9).lockedLines).toBe(0);
  });
  it("uses fixed prompt tiers", () => {
    expect(PROMPT_TIERS).toEqual([0, 8, 18, 38, 78]);
  });
});

describe("buyout", () => {
  it("computes revenue multiple, null when pre-revenue", () => {
    expect(revenueMultiple(120000, 4000)).toBe(2.5);
    expect(revenueMultiple(30000, 0)).toBeNull();
  });
  it("validates offers", () => {
    expect(validateOffer(60000, 120000, "open")).toBeNull();
    expect(validateOffer(59999, 120000, "open")).toBe("offerTooLow");
    expect(validateOffer(0, 120000, "open")).toBe("offerInvalid");
    expect(validateOffer(1000.5, 1500, "open")).toBe("offerInvalid");
    expect(validateOffer(200000, 120000, "sold")).toBe("listingSold");
  });
  it("maps listing status to semantic tones", () => {
    expect([buyoutTone("open"), buyoutTone("negotiating"), buyoutTone("sold")]).toEqual(["live", "pending", "ended"]);
  });
  it("scales the offer step and escrow fee", () => {
    expect([offerStep(8000), offerStep(50000), offerStep(300000)]).toEqual([500, 1000, 5000]);
    expect(escrowFee(4000)).toBe(500);
    expect(escrowFee(120000)).toBe(6000);
  });
});

describe("launch", () => {
  it("toggles votes", () => {
    expect(toggleVote(10, false)).toEqual({ count: 11, voted: true });
    expect(toggleVote(11, true)).toEqual({ count: 10, voted: false });
    expect(toggleVote(0, true)).toEqual({ count: 0, voted: false });
  });
});
