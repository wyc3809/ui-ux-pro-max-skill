import { shouldAnimateItems, staggerDelay, tabEnterOffset } from "../motion";

describe("tabEnterOffset", () => {
  it("enters from the right when moving right, from the left when moving left", () => {
    expect(tabEnterOffset(0, 2, 18)).toBe(18);
    expect(tabEnterOffset(3, 1, 18)).toBe(-18);
    expect(tabEnterOffset(1, 1, 18)).toBe(0);
  });
});

describe("shouldAnimateItems", () => {
  it("animates 1–3 new items only", () => {
    expect(shouldAnimateItems(1, false)).toBe(true);
    expect(shouldAnimateItems(3, false)).toBe(true);
    expect(shouldAnimateItems(4, false)).toBe(false);
    expect(shouldAnimateItems(0, false)).toBe(false);
  });
  it("is always off under reduced motion", () => {
    expect(shouldAnimateItems(1, true)).toBe(false);
  });
});

describe("staggerDelay", () => {
  it("delays the 2nd and 3rd section by 80ms steps and caps after that", () => {
    expect([0, 1, 2, 3, 9].map((i) => staggerDelay(i, 80))).toEqual([0, 80, 160, 160, 160]);
  });
});
