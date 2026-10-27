import type { UploadDraft } from "@/store/uploadDraft";
import type { ScanReport } from "@/api/types";
import { missingFields, sourceReady } from "../upload";

const clean: ScanReport = { checks: [{ id: "readme", status: "pass" }, { id: "license", status: "warn" }], stack: ["Expo"], files: [], fileCount: 3, sizeBytes: 1000 };
const leaky: ScanReport = { ...clean, checks: [{ id: "secrets", status: "fail" }] };

const base: UploadDraft = {
  step: 0,
  name: "Demo",
  tagline: "A demo",
  category: "tools",
  platforms: ["iOS"],
  source: { kind: "github", repo: "demo/app", branch: "main", report: clean },
  stack: ["Expo"],
  screenshots: 3,
  storySteps: [{ title: "Plan", body: "Sketch screens" }],
  freePreviewSteps: 1,
  tier: 78,
  license: "personal",
  originalityConfirmed: true,
};

describe("missingFields", () => {
  it("passes a complete draft on every step", () => {
    for (let s = 0; s < 5; s++) expect(missingFields(base, s)).toEqual([]);
  });
  it("flags each step's required fields", () => {
    expect(missingFields({ ...base, name: " ", platforms: [] }, 0)).toEqual(["name", "platforms"]);
    expect(missingFields({ ...base, source: null }, 1)).toEqual(["source"]);
    expect(missingFields({ ...base, screenshots: 2 }, 2)).toEqual(["screenshots"]);
    expect(missingFields({ ...base, storySteps: [{ title: "x", body: "" }] }, 3)).toEqual(["storySteps"]);
    expect(missingFields({ ...base, tier: null, originalityConfirmed: false }, 4)).toEqual(["tier", "originality"]);
  });
});

describe("sourceReady", () => {
  it("needs a scanned, non-blocking source", () => {
    expect(sourceReady(null)).toBe(false);
    expect(sourceReady({ kind: "github", repo: "a/b", branch: "main", report: null })).toBe(false);
    expect(sourceReady({ kind: "github", repo: "", branch: "", report: clean })).toBe(false);
    expect(sourceReady({ kind: "github", repo: "a/b", branch: "main", report: leaky })).toBe(false);
    expect(sourceReady({ kind: "github", repo: "a/b", branch: "main", report: clean })).toBe(true);
    expect(sourceReady({ kind: "zip", fileName: "x.zip", report: clean })).toBe(true);
  });
});
