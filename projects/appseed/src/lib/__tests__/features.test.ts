import { FEATURES, kindEnabled, withEnabledAttachments } from "../features";

describe("release features", () => {
  it("ships version 1 without buyouts", () => {
    expect(FEATURES.buyouts).toBe(false);
    expect(kindEnabled("buyout")).toBe(false);
    expect(kindEnabled("template")).toBe(true);
    expect(kindEnabled("buyout", { buyouts: true })).toBe(true);
  });

  it("drops posts promoting a market that is off, keeps the rest", () => {
    const posts = [{ id: "a" }, { id: "b", attachment: { kind: "buyout" as const } }, { id: "c", attachment: { kind: "launch" as const } }];
    expect(withEnabledAttachments(posts).map((p) => p.id)).toEqual(["a", "c"]);
    expect(withEnabledAttachments(posts, { buyouts: true })).toHaveLength(3);
  });
});
