import { normalizeStoreLinks } from "./storeLinks";
import { MIN_TEMPLATE_SCREENSHOTS } from "./media";
import type { SourceChoice } from "@/api/types";
import type { UploadDraft } from "@/store/uploadDraft";
import { isBlocking } from "./sourceScan";

export const UPLOAD_STEPS = 5;

/** What the studio function receives for a template (the server re-checks all of it). */
export function templateSubmission(d: UploadDraft) {
  const s = d.source;
  return {
    kind: "template",
    name: d.name,
    tagline: d.tagline,
    category: d.category,
    secondaryCategory: d.secondaryCategory,
    platforms: d.platforms,
    stack: d.stack,
    media: d.media,
    storeLinks: d.storeLinks,
    storySteps: d.storySteps,
    freePreviewSteps: d.freePreviewSteps,
    tier: d.tier,
    license: d.license,
    source: s?.kind === "github" ? { kind: "github", repo: s.repo, branch: s.branch } : s?.kind === "zip" ? { kind: "zip", path: s.path ?? null } : null,
    attest: d.originalityConfirmed,
  };
}

/** Which required fields are missing on a given wizard step (0-based). Empty = can advance. */
export function missingFields(d: UploadDraft, step: number): string[] {
  const miss: string[] = [];
  switch (step) {
    case 0:
      if (!d.name.trim()) miss.push("name");
      if (!d.tagline.trim()) miss.push("tagline");
      if (!d.category) miss.push("category");
      if (d.platforms.length === 0) miss.push("platforms");
      break;
    case 1:
      if (!sourceReady(d.source)) miss.push("source");
      break;
    case 2:
      if (d.media.screenshots.length < MIN_TEMPLATE_SCREENSHOTS) miss.push("screenshots");
    if ("error" in normalizeStoreLinks(d.storeLinks)) miss.push("storeLinks");
      break;
    case 3:
      if (!d.storySteps.some((s) => s.title.trim() && s.body.trim())) miss.push("storySteps");
      break;
    case 4:
      if (d.tier == null) miss.push("tier");
      if (!d.license) miss.push("license");
      if (!d.originalityConfirmed) miss.push("originality");
      break;
  }
  return miss;
}

/** Source is ready once it has been scanned and nothing blocks it (GitHub also needs a repo picked). */
export function sourceReady(s: SourceChoice | null): boolean {
  if (!s?.report) return false;
  if (s.kind === "github" && !s.repo) return false;
  return !isBlocking(s.report.checks);
}
