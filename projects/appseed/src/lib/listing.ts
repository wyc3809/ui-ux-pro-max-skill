import { promptVariables } from "./prompt";

export type PromptDraft = { step: number; title: string; summary: string; tool: string | null; text: string; previewLines: number; tier: number | null };
export type BuyoutDraft = { step: number; name: string; tagline: string; monthlyRevenue: string; mau: string; included: string[]; reason: string; asking: string };
export type LaunchDraft = { step: number; name: string; tagline: string; aiTools: string[]; buildDays: string; link: string; boost: boolean };

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
  }
  return miss;
}

export function promptDraftVariables(d: PromptDraft): string[] {
  return promptVariables(d.text);
}

export function missingBuyoutFields(d: BuyoutDraft, step: number): string[] {
  const miss: string[] = [];
  if (step === 0) {
    if (!d.name.trim()) miss.push("name");
    if (!d.tagline.trim()) miss.push("tagline");
  }
  if (step === 1) {
    if (Number.isNaN(num(d.monthlyRevenue))) miss.push("monthlyRevenue");
    if (Number.isNaN(num(d.mau))) miss.push("mau");
  }
  if (step === 2 && d.included.length === 0) miss.push("included");
  if (step === 3) {
    const a = num(d.asking);
    if (Number.isNaN(a) || a < 1000) miss.push("asking");
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
  if (step === 1 && !isUrl(d.link)) miss.push("link");
  return miss;
}
