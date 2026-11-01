import type { ListingMedia } from "./media";
import type { CategoryKey } from "./categories";
import { normalizeStoreLinks } from "./storeLinks";
import type { Platform, SourceChoice } from "@/api/types";
import { promptVariables } from "./prompt";
import { isTransferReady, needsVerification, type StoreFacts, type VerifySource } from "./transfer";
import { sourceReady } from "./upload";

export type PromptDraft = { step: number; title: string; summary: string; category: CategoryKey | null; secondaryCategory: CategoryKey | null; tool: string | null; text: string; previewLines: number; tier: number | null; attest: boolean };
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
export type LaunchDraft = {
  step: number;
  name: string;
  tagline: string;
  category: CategoryKey | null;
  secondaryCategory: CategoryKey | null;
  aiTools: string[];
  buildDays: string;
  /** The app's website; optional when it has a store link. */
  link: string;
  media: ListingMedia;
  storeLinks: { appStore: string; googlePlay: string };
  boost: boolean;
  attest: boolean;
};

const num = (s: string) => (/^\d+$/.test(s.trim()) ? Number(s.trim()) : NaN);
const isUrl = (s: string) => /^https:\/\/[^\s/]+\.[^\s]+$/.test(s.trim());

/** Required fields still missing on a prompt listing step. A sellable prompt needs at least one locked line. */
export function missingPromptFields(d: PromptDraft, step: number): string[] {
  const miss: string[] = [];
  if (step === 0) {
    if (!d.title.trim()) miss.push("title");
    if (!d.category) miss.push("category");
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
    if (!d.category) miss.push("category");
    if (d.aiTools.length === 0) miss.push("aiTools");
    if (Number.isNaN(num(d.buildDays)) || num(d.buildDays) < 1) miss.push("buildDays");
  }
  if (step === 1) {
    // Media is optional; a store link that is there must be a real store link.
    if ("error" in normalizeStoreLinks(d.storeLinks)) miss.push("storeLinks");
  }
  if (step === 2) {
    const stores = normalizeStoreLinks(d.storeLinks);
    const hasStore = "links" in stores && Object.keys(stores.links).length > 0;
    // Somewhere to try it: a website, a store page, or both.
    if (d.link.trim() ? !isUrl(d.link) : !hasStore) miss.push("link");
    if (!d.attest) miss.push("attest");
  }
  return miss;
}

/** What the studio function receives for a prompt or a launch (the server re-checks all of it). */
export const promptSubmission = (d: PromptDraft) => ({ kind: "prompt", title: d.title, summary: d.summary, category: d.category, secondaryCategory: d.secondaryCategory, tool: d.tool, text: d.text, previewLines: d.previewLines, tier: d.tier, attest: d.attest });
export const launchSubmission = (d: LaunchDraft) => ({ kind: "launch", name: d.name, tagline: d.tagline, category: d.category, secondaryCategory: d.secondaryCategory, aiTools: d.aiTools, buildDays: Number(d.buildDays) || 0, link: d.link, media: d.media, storeLinks: d.storeLinks, attest: d.attest });

/** A newer version came out after this account bought it (unknown purchase date: no badge). */
export const hasUpdate = (latest: string | undefined, boughtAt: string | undefined) => !!latest && !!boughtAt && latest > boughtAt.slice(0, 10);
