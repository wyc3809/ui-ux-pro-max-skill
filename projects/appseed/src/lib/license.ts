export type LicenseKind = "personal" | "commercial" | "extended";

export const LICENSES: LicenseKind[] = ["personal", "commercial", "extended"];

type Rules = { commercial: boolean; maxProducts: number | "unlimited"; resale: false; publishSource: false };

/** §13 — creators can only pick a standard licence; all of them forbid resale and publishing source. */
export function licenseRules(kind: LicenseKind): Rules {
  switch (kind) {
    case "personal":
      return { commercial: false, maxProducts: 1, resale: false, publishSource: false };
    case "commercial":
      return { commercial: true, maxProducts: 1, resale: false, publishSource: false };
    case "extended":
      return { commercial: true, maxProducts: "unlimited", resale: false, publishSource: false };
  }
}
