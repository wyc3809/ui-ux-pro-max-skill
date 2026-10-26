/** Prompt marketplace rules (display-only; ownership and payouts are decided on the server). */

/** Prompts sell at lower fixed tiers than templates (IAP products can't be created dynamically). */
export const PROMPT_TIERS = [0, 8, 18, 38, 78] as const;
export type PromptTier = (typeof PROMPT_TIERS)[number];

const VAR = /\{\{\s*([a-zA-Z_][\w-]*)\s*\}\}/g;

/** Unique `{{variable}}` names in order of first appearance. */
export function promptVariables(text: string): string[] {
  const seen: string[] = [];
  for (const m of text.matchAll(VAR)) if (m[1] && !seen.includes(m[1])) seen.push(m[1]);
  return seen;
}

/** Substitutes filled variables; unfilled ones stay as `{{name}}` so the buyer can see what is missing. */
export function fillPrompt(text: string, values: Record<string, string>): string {
  return text.replace(VAR, (whole, name: string) => (values[name]?.trim() ? values[name]!.trim() : whole));
}

/** Free preview: the first `visibleLines` lines; the rest stays locked until purchase. */
export function splitPreview(text: string, visibleLines: number): { visible: string; lockedLines: number } {
  const lines = text.split("\n");
  const n = Math.max(0, Math.min(visibleLines, lines.length));
  return { visible: lines.slice(0, n).join("\n"), lockedLines: lines.length - n };
}
