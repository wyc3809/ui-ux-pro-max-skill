import type { Platform, SourceChoice } from "@/api/types";
import { promptVariables } from "./prompt";
import { isTransferReady, needsVerification, type StoreFacts, type VerifySource } from "./transfer";
import { sourceReady } from "./upload";

export type PromptDraft = { step: number; title: string; summary: string; tool: string | null; text: string; previewLines: number; tier: number | null; attest: boolean };
export type BuyoutDraft = {
  step: number;
  name: string;
  tagline: string;
  platforms: Platform[];
  monthlyRevenue: string;
  mau: string;
  verifyVia: VerifySource[];
  facts: Omit<StoreFacts, "platforms">;
  source: SourceChoice | null;
  included: string[];
  reason: string;
  asking: string;
  /** Seller confirms they own the work (App Review 5.2); required on the last step. */
  attest: boolean;
};

/** Buyout wizard steps, in order. */
export const BUYOUT_STEPS = ["info", "metrics", "transfer", "source", "included", "asking"] as const;
export type LaunchDraft = { step: number; name: string; tagline: string; aiTools: string[]; buildDays: string; link: string; boost: boolean; attest: boolean };

const num = (s: string) => (/^\d+$/.test(s.trim()) ? Number(s.trim()) : NaN);
const isUrl = (s: string) => /^https:\/\/[^\s/]+\.[^\s]+$/.test(s.trim());

/** Required fields still missing on a prompt listing step. A sellable prompt needs at least one locked line. */
export function missingPromptFields(d: PromptDraft, step: number): string[] {
  const miss: string[] = [];
  if (step === 0) {
    if (!d.title.trim()) miss.push("title");
    if (!d.tool) miss.push("tool");
    if (d.text.trim().split("\n").length < 2) miss.push("text");
  }
  if (step === 1) {
    if (d.tier == null) miss.push("tier");
    if (d.tier !== 0 && d.previewLines >= d.text.trim().split("\n").length) miss.push("previewLines");
    if (!d.attest) miss.push("attest");
  }
  return miss;
}

export function promptDraftVariables(d: PromptDraft): string[] {
  return promptVariables(d.text);
}

export function missingBuyoutFields(d: BuyoutDraft, step: number): string[] {
  const miss: string[] = [];
  const s = BUYOUT_STEPS[step];
  if (s === "info") {
    if (!d.name.trim()) miss.push("name");
    if (!d.tagline.trim()) miss.push("tagline");
    if (d.platforms.length === 0) miss.push("platforms");
  }
  if (s === "metrics") {
    if (Number.isNaN(num(d.monthlyRevenue))) miss.push("monthlyRevenue");
    if (Number.isNaN(num(d.mau))) miss.push("mau");
    // Claimed revenue must come with read access the platform can check, never a screenshot.
    else if (needsVerification(num(d.monthlyRevenue) || 0, d.verifyVia)) miss.push("verifyVia");
  }
  // Store blockers (unreleased, in review, TestFlight on) stop the listing: the stores would refuse the transfer.
  if (s === "transfer" && !isTransferReady({ ...d.facts, platforms: d.platforms })) miss.push("transfer");
  // A buyout transfers the code itself, so it goes through the same scan as a template.
  if (s === "source" && !sourceReady(d.source)) miss.push("source");
  if (s === "included" && d.included.length === 0) miss.push("included");
  if (s === "asking") {
    const a = num(d.asking);
    if (Number.isNaN(a) || a < 1000) miss.push("asking");
    if (!d.attest) miss.push("attest");
  }
  return miss;
}

export function missingLaunchFields(d: LaunchDraft, step: number): string[] {
  const miss: string[] = [];
  if (step === 0) {
    if (!d.name.trim()) miss.push("name");
    if (!d.tagline.trim()) miss.push("tagline");
    if (d.aiTools.length === 0) miss.push("aiTools");
    if (Number.isNaN(num(d.buildDays)) || num(d.buildDays) < 1) miss.push("buildDays");
  }
  if (step === 1) {
    if (!isUrl(d.link)) miss.push("link");
    if (!d.attest) miss.push("attest");
  }
  return miss;
}
