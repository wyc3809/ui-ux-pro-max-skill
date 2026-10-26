import { estimateCreatorShare, formatPrice, isPriceTier, PRICE_TIERS } from "../price";

describe("price", () => {
  it("formats HKD / USD and free", () => {
    expect(formatPrice(158, "HKD", "免費")).toBe("HK$158");
    expect(formatPrice(1288, "HKD", "免費")).toBe("HK$1,288");
    expect(formatPrice(9.5, "USD", "Free")).toBe("US$9.50");
    expect(formatPrice(0, "HKD", "免費")).toBe("免費");
  });

  it("only accepts fixed tiers (IAP products can't be created dynamically)", () => {
    expect(PRICE_TIERS).toEqual([0, 38, 78, 158, 388, 788]);
    expect(isPriceTier(78)).toBe(true);
    expect(isPriceTier(80)).toBe(false);
  });

  it("deducts the store fee before the platform cut", () => {
    // 158 × 0.85 = 134.30; × 0.8 = 107.44
    expect(estimateCreatorShare(158, 0.15, 0.2)).toBe(107.44);
    expect(estimateCreatorShare(0, 0.15, 0.2)).toBe(0);
  });
});
