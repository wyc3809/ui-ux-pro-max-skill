import { formatBytes, formatCount, formatDate, formatShortDate } from "../format";
import { isNewListing, starStates } from "../rating";

describe("format", () => {
  it("formats dates per locale (§15)", () => {
    expect(formatDate("2026-10-26", "zh-Hant")).toBe("2026年10月26日");
    expect(formatDate("2026-10-26", "en")).toBe("26 Oct 2026");
    expect(formatShortDate("2026-10-26", "zh-Hant")).toBe("10月26日");
    expect(formatShortDate("2026-01-05", "en")).toBe("5 Jan");
  });
  it("formats counts and bytes", () => {
    expect(formatCount(12345)).toBe("12,345");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
  });
});

describe("rating", () => {
  it("rounds to half stars", () => {
    expect(starStates(4.3)).toEqual(["full", "full", "full", "full", "half"]);
    expect(starStates(4.8)).toEqual(["full", "full", "full", "full", "full"]);
    expect(starStates(0)).toEqual(["empty", "empty", "empty", "empty", "empty"]);
  });
  it("shows 'new' below 3 reviews", () => {
    expect(isNewListing(2)).toBe(true);
    expect(isNewListing(3)).toBe(false);
  });
});
