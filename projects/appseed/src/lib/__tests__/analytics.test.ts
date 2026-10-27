import { average, bucketize, change, conversion, funnel, percentages, rankListings, tileValue, totals, type DayStat } from "../analytics";

const day = (date: string, v: Partial<DayStat> = {}): DayStat => ({ date, views: 0, likes: 0, shares: 0, bookmarks: 0, comments: 0, units: 0, proceeds: 0, ...v });

describe("analytics", () => {
  it("sums each metric over the period", () => {
    const t = totals([day("2026-10-01", { views: 10, units: 1, proceeds: 158 }), day("2026-10-02", { views: 5, likes: 2 })]);
    expect(t).toMatchObject({ views: 15, likes: 2, units: 1, proceeds: 158 });
  });

  it("derives conversion from units and views, never dividing by zero", () => {
    expect(conversion(3, 200)).toBe(1.5);
    expect(conversion(1, 3)).toBe(33.3);
    expect(conversion(5, 0)).toBe(0);
    expect(tileValue({ views: 400, likes: 0, shares: 0, bookmarks: 0, comments: 0, units: 10, proceeds: 0 }, "conversion")).toBe(2.5);
  });

  it("reports change against the previous period, or nothing without a baseline", () => {
    expect(change(120, 100)).toBe(20);
    expect(change(75, 100)).toBe(-25);
    expect(change(10, 0)).toBeNull();
  });

  it("keeps daily bars up to a month and weekly bars for 90 days, partial week oldest", () => {
    const days = (n: number) => Array.from({ length: n }, (_, i) => day(`d${i}`, { views: 1 }));
    expect(bucketize(days(30), "views")).toHaveLength(30);
    const weeks = bucketize(days(90), "views");
    expect(weeks).toHaveLength(13);
    expect(weeks[0]).toEqual({ date: "d0", value: 6 });
    expect(weeks[12]).toEqual({ date: "d83", value: 7 });
  });

  it("splits sources into whole percentages that add up to 100", () => {
    const p = percentages({ explore: 1, search: 1, shareLink: 1 });
    expect(Object.values(p).reduce((a, b) => a + b, 0)).toBe(100);
    expect(percentages({ a: 0, b: 0 })).toEqual({ a: 0, b: 0 });
    expect(percentages({ a: 3, b: 1 })).toEqual({ a: 75, b: 25 });
  });

  it("builds a funnel from views to engaged to units", () => {
    const f = funnel({ views: 1000, likes: 80, shares: 0, bookmarks: 40, comments: 0, units: 25, proceeds: 0 });
    expect(f.map((s) => [s.key, s.value, s.rate])).toEqual([
      ["views", 1000, 100],
      ["engaged", 120, 12],
      ["units", 25, 2.5],
    ]);
  });

  it("ranks listings by the chosen metric with their share of the total", () => {
    const zero = { views: 0, likes: 0, shares: 0, bookmarks: 0, comments: 0, units: 0, proceeds: 0 };
    const r = rankListings(
      [
        { slug: "a", totals: { ...zero, views: 100 } },
        { slug: "b", totals: { ...zero, views: 300 } },
      ],
      "views",
    );
    expect(r).toEqual([
      { slug: "b", value: 300, share: 0.75 },
      { slug: "a", value: 100, share: 0.25 },
    ]);
    expect(average([2, 4])).toBe(3);
  });
});
