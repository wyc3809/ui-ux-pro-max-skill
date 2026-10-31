import { templateSubmission } from "@/lib/upload";
import { hasUpdate, launchSubmission, promptSubmission } from "@/lib/listing";
import { nextPayoutDate, reportFrom, STATUS } from "../studioRemote";

const row = (slug: string, day: string, views: number, units = 0, proceeds = 0) => ({ slug, day, views, likes: 1, shares: 0, comments: 0, units, proceeds });

describe("studio on Supabase", () => {
  it("builds the analytics report from per-listing daily rows", () => {
    const days = ["2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30"];
    const rows = days.flatMap((d, i) => [row("a", d, i + 1, i === 3 ? 2 : 0, i === 3 ? 21488 : 0), row("b", d, 10)]);
    const r = reportFrom(rows, 2 as never, null);
    expect(r.current.map((d) => d.date)).toEqual(["2026-10-29", "2026-10-30"]);
    expect(r.previous.map((d) => d.views)).toEqual([11, 12]);
    expect(r.current[1]).toMatchObject({ views: 14, units: 2, proceeds: 214.88, bookmarks: 0 });
    expect(r.listings.find((l) => l.slug === "a")!.totals).toMatchObject({ views: 7, units: 2 });
    expect(reportFrom(rows, 2 as never, "b").current.map((d) => d.views)).toEqual([10, 10]);
  });

  it("pays out on the 9th", () => {
    expect(nextPayoutDate(new Date("2026-10-31T00:00:00Z"))).toBe("2026-11-09");
    expect(nextPayoutDate(new Date("2026-11-03T00:00:00Z"))).toBe("2026-11-09");
    expect(nextPayoutDate(new Date("2026-12-09T00:00:00Z"))).toBe("2027-01-09");
    expect(STATUS.review).toBe("pending");
  });

  it("sends wizard drafts as the studio function expects", () => {
    const t = templateSubmission({ step: 4, name: "A", tagline: "B", category: "tools", platforms: ["iOS"], source: { kind: "zip", fileName: "a.zip", report: null, path: "uploads/u/a.zip" }, stack: [], screenshots: 3, storySteps: [], freePreviewSteps: 0, tier: 158, license: "personal", originalityConfirmed: true });
    expect(t).toMatchObject({ kind: "template", tier: 158, source: { kind: "zip", path: "uploads/u/a.zip" }, attest: true });
    expect(promptSubmission({ step: 1, title: "P", summary: "S", tool: "Claude", text: "x", previewLines: 1, tier: 8, attest: true })).toMatchObject({ kind: "prompt", tier: 8 });
    expect(launchSubmission({ step: 1, name: "L", tagline: "T", aiTools: [], buildDays: "4", link: "https://a.example", boost: false, attest: true })).toMatchObject({ kind: "launch", buildDays: 4 });
  });

  it("flags an update only when a version came out after the purchase", () => {
    expect(hasUpdate("2026-10-18", "2026-10-31T09:00:00Z")).toBe(false);
    expect(hasUpdate("2026-11-02", "2026-10-31T09:00:00Z")).toBe(true);
    expect(hasUpdate("2026-11-02", undefined)).toBe(false);
  });
});
