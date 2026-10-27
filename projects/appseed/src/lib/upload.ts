import type { SourceChoice } from "@/api/types";
import type { UploadDraft } from "@/store/uploadDraft";
import { isBlocking } from "./sourceScan";

export const UPLOAD_STEPS = 5;

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
      if (d.screenshots < 3) miss.push("screenshots");
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
