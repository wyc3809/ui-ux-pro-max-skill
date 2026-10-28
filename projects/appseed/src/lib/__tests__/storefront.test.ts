import { canLinkOut } from "../storefront";

describe("external purchase links", () => {
  it("allows a link only on the US storefront by default", () => {
    expect(canLinkOut("US")).toBe(true);
    expect(canLinkOut("usa")).toBe(true);
    expect(canLinkOut("HK")).toBe(false);
    expect(canLinkOut(null)).toBe(false);
  });

  it("accepts server overrides when rules change elsewhere", () => {
    expect(canLinkOut("JP", ["JP"])).toBe(true);
  });
});
