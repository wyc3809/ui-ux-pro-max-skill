import type { UploadDraft } from "@/store/uploadDraft";
import { missingFields } from "../upload";

const base: UploadDraft = {
  step: 0,
  name: "Demo",
  tagline: "A demo",
  category: "tools",
  platforms: ["iOS"],
  repoUrl: "https://github.com/demo/app",
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
    expect(missingFields({ ...base, repoUrl: "github.com/x" }, 1)).toEqual(["repoUrl"]);
    expect(missingFields({ ...base, screenshots: 2 }, 2)).toEqual(["screenshots"]);
    expect(missingFields({ ...base, storySteps: [{ title: "x", body: "" }] }, 3)).toEqual(["storySteps"]);
    expect(missingFields({ ...base, tier: null, originalityConfirmed: false }, 4)).toEqual(["tier", "originality"]);
  });
});
