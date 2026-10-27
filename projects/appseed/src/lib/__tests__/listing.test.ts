import { missingBuyoutFields, missingLaunchFields, missingPromptFields, type BuyoutDraft, type LaunchDraft, type PromptDraft } from "../listing";

const prompt: PromptDraft = { step: 0, title: "T", summary: "", tool: "Claude Code", text: "line 1 {{x}}\nline 2\nline 3", previewLines: 1, tier: 18 };
const buyout: BuyoutDraft = {
  step: 0,
  name: "App",
  tagline: "Does a thing",
  monthlyRevenue: "0",
  mau: "120",
  source: { kind: "zip", fileName: "app.zip", report: { checks: [{ id: "readme", status: "pass" }], stack: [], files: [], fileCount: 1, sizeBytes: 10 } },
  included: ["source"],
  reason: "",
  asking: "20000",
};
const launch: LaunchDraft = { step: 0, name: "App", tagline: "Does a thing", aiTools: ["Cursor"], buildDays: "3", link: "https://example.com/app", boost: false };

describe("listing validation", () => {
  it("accepts complete drafts", () => {
    for (const s of [0, 1]) expect(missingPromptFields(prompt, s)).toEqual([]);
    for (const s of [0, 1, 2, 3, 4]) expect(missingBuyoutFields(buyout, s)).toEqual([]);
    for (const s of [0, 1]) expect(missingLaunchFields(launch, s)).toEqual([]);
  });
  it("requires a locked part for paid prompts, not free ones", () => {
    expect(missingPromptFields({ ...prompt, previewLines: 3 }, 1)).toEqual(["previewLines"]);
    expect(missingPromptFields({ ...prompt, previewLines: 3, tier: 0 }, 1)).toEqual([]);
    expect(missingPromptFields({ ...prompt, text: "one line", tool: null }, 0)).toEqual(["tool", "text"]);
  });
  it("validates buyout numbers", () => {
    expect(missingBuyoutFields({ ...buyout, monthlyRevenue: "abc", mau: "" }, 1)).toEqual(["monthlyRevenue", "mau"]);
    expect(missingBuyoutFields({ ...buyout, source: null }, 2)).toEqual(["source"]);
    expect(missingBuyoutFields({ ...buyout, included: [] }, 3)).toEqual(["included"]);
    expect(missingBuyoutFields({ ...buyout, asking: "500" }, 4)).toEqual(["asking"]);
  });
  it("validates launch tools, days and https link", () => {
    expect(missingLaunchFields({ ...launch, aiTools: [], buildDays: "0" }, 0)).toEqual(["aiTools", "buildDays"]);
    expect(missingLaunchFields({ ...launch, link: "http://example.com" }, 1)).toEqual(["link"]);
  });
});
