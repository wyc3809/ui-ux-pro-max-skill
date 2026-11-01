import { missingBuyoutFields, missingLaunchFields, missingPromptFields, type BuyoutDraft, type LaunchDraft, type PromptDraft } from "../listing";

const prompt: PromptDraft = { step: 0, title: "T", summary: "", category: "aiChat", secondaryCategory: null, tool: "Claude Code", text: "line 1 {{x}}\nline 2\nline 3", previewLines: 1, tier: 18, attest: true };
const buyout: BuyoutDraft = {
  step: 0,
  name: "App",
  tagline: "Does a thing",
  platforms: ["iOS"],
  monthlyRevenue: "0",
  mau: "120",
  verifyVia: [],
  facts: { released: true, inReview: false, testflightOn: false, signInWithApple: false, playAppSigning: true },
  source: { kind: "zip", fileName: "app.zip", report: { checks: [{ id: "readme", status: "pass" }], stack: [], files: [], fileCount: 1, sizeBytes: 10 } },
  included: ["source"],
  reason: "",
  asking: "20000",
  attest: true,
};
const launch: LaunchDraft = { step: 0, name: "App", tagline: "Does a thing", category: "expense", secondaryCategory: null, aiTools: ["Cursor"], buildDays: "3", link: "https://example.com/app", media: { screenshots: [] }, storeLinks: { appStore: "", googlePlay: "" }, boost: false, attest: true };

describe("listing validation", () => {
  it("accepts complete drafts", () => {
    for (const s of [0, 1]) expect(missingPromptFields(prompt, s)).toEqual([]);
    for (const s of [0, 1, 2, 3, 4, 5]) expect(missingBuyoutFields(buyout, s)).toEqual([]);
    for (const s of [0, 1, 2]) expect(missingLaunchFields(launch, s)).toEqual([]);
  });
  it("requires a locked part for paid prompts, not free ones", () => {
    expect(missingPromptFields({ ...prompt, previewLines: 3 }, 1)).toEqual(["previewLines"]);
    expect(missingPromptFields({ ...prompt, previewLines: 3, tier: 0 }, 1)).toEqual([]);
    expect(missingPromptFields({ ...prompt, text: "one line", tool: null }, 0)).toEqual(["tool", "text"]);
  });
  it("validates buyout numbers", () => {
    expect(missingBuyoutFields({ ...buyout, monthlyRevenue: "abc", mau: "" }, 1)).toEqual(["monthlyRevenue", "mau"]);
    expect(missingBuyoutFields({ ...buyout, source: null }, 3)).toEqual(["source"]);
    expect(missingBuyoutFields({ ...buyout, included: [] }, 4)).toEqual(["included"]);
    expect(missingBuyoutFields({ ...buyout, asking: "500" }, 5)).toEqual(["asking"]);
  });
  it("needs platforms, read-only revenue proof and a transferable app", () => {
    expect(missingBuyoutFields({ ...buyout, platforms: [] }, 0)).toEqual(["platforms"]);
    expect(missingBuyoutFields({ ...buyout, monthlyRevenue: "5600" }, 1)).toEqual(["verifyVia"]);
    expect(missingBuyoutFields({ ...buyout, monthlyRevenue: "5600", verifyVia: ["appStoreConnect"] }, 1)).toEqual([]);
    expect(missingBuyoutFields({ ...buyout, facts: { ...buyout.facts, inReview: true } }, 2)).toEqual(["transfer"]);
    // Warnings (Sign in with Apple) do not block.
    expect(missingBuyoutFields({ ...buyout, facts: { ...buyout.facts, signInWithApple: true } }, 2)).toEqual([]);
  });
  it("requires the ownership confirmation on the last step of every listing", () => {
    expect(missingPromptFields({ ...prompt, attest: false }, 1)).toEqual(["attest"]);
    expect(missingBuyoutFields({ ...buyout, attest: false }, 5)).toEqual(["attest"]);
    expect(missingLaunchFields({ ...launch, attest: false }, 2)).toEqual(["attest"]);
  });
  it("validates launch tools, days and https link", () => {
    expect(missingLaunchFields({ ...launch, aiTools: [], buildDays: "0" }, 0)).toEqual(["aiTools", "buildDays"]);
    // Every launch and prompt needs a primary category: it decides which leaderboard it ranks on (§40).
    expect(missingLaunchFields({ ...launch, category: null }, 0)).toEqual(["category"]);
    expect(missingPromptFields({ ...prompt, category: null }, 0)).toEqual(["category"]);
    expect(missingLaunchFields({ ...launch, link: "http://example.com" }, 2)).toEqual(["link"]);
    // A store link is enough on its own; a bad one is caught on the media step.
    expect(missingLaunchFields({ ...launch, link: "", storeLinks: { appStore: "", googlePlay: "app.ferrynow.hk" } }, 2)).toEqual([]);
    expect(missingLaunchFields({ ...launch, link: "" }, 2)).toEqual(["link"]);
    expect(missingLaunchFields({ ...launch, storeLinks: { appStore: "https://evil.example/id1234567", googlePlay: "" } }, 1)).toEqual(["storeLinks"]);
  });
});
