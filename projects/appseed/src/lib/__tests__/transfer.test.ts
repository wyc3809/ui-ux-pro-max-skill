import { canRelease, handoverItems, isTransferReady, needsVerification, pendingItems, transferReadiness, verifyOptions, type StoreFacts } from "../transfer";

const ready: StoreFacts = { platforms: ["iOS", "Android"], released: true, inReview: false, testflightOn: false, signInWithApple: false, playAppSigning: true };

describe("transfer readiness", () => {
  it("passes a released app with nothing in review", () => {
    expect(transferReadiness(ready)).toEqual([]);
    expect(isTransferReady(ready)).toBe(true);
  });

  it("blocks unreleased apps, versions in review and TestFlight left on", () => {
    const issues = transferReadiness({ ...ready, released: false, inReview: true, testflightOn: true });
    expect(issues.map((i) => [i.key, i.level])).toEqual([
      ["notReleased", "block"],
      ["inReview", "block"],
      ["testflightOn", "block"],
    ]);
    expect(isTransferReady({ ...ready, inReview: true })).toBe(false);
  });

  it("warns about Sign in with Apple migration and a self-held Android signing key", () => {
    const issues = transferReadiness({ ...ready, signInWithApple: true, playAppSigning: false });
    expect(issues).toEqual([
      { key: "siwaMigration", level: "warn" },
      { key: "signingKey", level: "warn" },
    ]);
  });

  it("ignores iOS-only rules for Android-only apps and notes web-only apps have no store transfer", () => {
    expect(transferReadiness({ ...ready, platforms: ["Android"], testflightOn: true, signInWithApple: true })).toEqual([]);
    expect(transferReadiness({ ...ready, platforms: ["Web"] })).toEqual([{ key: "webOnly", level: "warn" }]);
  });
});

describe("handover checklist", () => {
  const base = { platforms: ["iOS", "Android"] as const, stack: ["Expo", "RevenueCat", "Supabase"], signInWithApple: true, playAppSigning: true, domain: true, social: false };

  it("lists store transfers first and rotated secrets last", () => {
    expect(handoverItems({ ...base, platforms: [...base.platforms] })).toEqual(["appStore", "siwaMigration", "googlePlay", "source", "backend", "payments", "domain", "secrets"]);
  });

  it("adds the signing key only when Play App Signing is off", () => {
    expect(handoverItems({ ...base, platforms: ["Android"], playAppSigning: false, stack: [], domain: false })).toEqual(["googlePlay", "signingKey", "source", "secrets"]);
  });

  it("releases escrow only after every item is confirmed", () => {
    const items = handoverItems({ ...base, platforms: ["iOS"], signInWithApple: false, stack: [], domain: false });
    expect(canRelease(items, ["appStore", "source"])).toBe(false);
    expect(pendingItems(items, ["appStore", "source"])).toEqual(["secrets"]);
    expect(canRelease(items, [...items])).toBe(true);
    expect(canRelease([], [])).toBe(false);
  });
});

describe("revenue verification", () => {
  it("offers read-only sources that match the platforms and stack", () => {
    expect(verifyOptions(["iOS", "Android"], ["RevenueCat"])).toEqual(["appStoreConnect", "playConsole", "revenueCat"]);
    expect(verifyOptions(["Web"], [])).toEqual(["stripe"]);
  });

  it("requires a source only when the listing claims revenue", () => {
    expect(needsVerification(5600, [])).toBe(true);
    expect(needsVerification(5600, ["revenueCat"])).toBe(false);
    expect(needsVerification(0, [])).toBe(false);
  });
});
