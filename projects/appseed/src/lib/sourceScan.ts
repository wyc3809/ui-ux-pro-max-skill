import type { FileNode } from "@/api/types";

/**
 * Pre-review checks on a template's source (GitHub repo or zip). The real scan runs in a
 * server Edge Function (gitleaks, ClamAV, osv-scanner — §13); these rules mirror what the
 * app shows so creators can fix problems before submitting.
 */
export type SourceManifest = {
  files: FileNode[];
  readme: string | null;
  dependencies: Record<string, string>;
  secretsFound: string[];
  sizeBytes: number;
};

export type CheckId = "readme" | "runSteps" | "secrets" | "size" | "lockfile" | "license" | "framework";
export type CheckStatus = "pass" | "warn" | "fail";
export type Check = { id: CheckId; status: CheckStatus; detail?: string };

export const MAX_SOURCE_BYTES = 200 * 1024 * 1024;

const hasFile = (nodes: FileNode[], name: RegExp): boolean => nodes.some((n) => name.test(n.name) || (n.children ? hasFile(n.children, name) : false));

/** Known dependencies → the stack chip a buyer recognises. */
const STACK: [RegExp, string][] = [
  [/^expo$/, "Expo"],
  [/^expo-router$/, "Expo Router"],
  [/^@supabase\/supabase-js$/, "Supabase"],
  [/^react-native-purchases$/, "RevenueCat"],
  [/^(stripe|@stripe\/stripe-react-native)$/, "Stripe"],
  [/^@anthropic-ai\/sdk$/, "Claude API"],
  [/^react-native-reanimated$/, "Reanimated"],
  [/^@tanstack\/react-query$/, "TanStack Query"],
  [/^zustand$/, "Zustand"],
  [/^firebase$/, "Firebase"],
];

export function detectStack(deps: Record<string, string>): string[] {
  const out: string[] = [];
  for (const name of Object.keys(deps)) for (const [re, label] of STACK) if (re.test(name) && !out.includes(label)) out.push(label);
  return out;
}

/** "~58.0.19" → 58 */
export function expoSdk(deps: Record<string, string>): number | null {
  const v = deps.expo?.match(/(\d+)\./);
  return v ? Number(v[1]) : null;
}

export function scanSource(m: SourceManifest): Check[] {
  const sdk = expoSdk(m.dependencies);
  return [
    { id: "readme", status: m.readme ? "pass" : "fail" },
    // Run steps = README mentions an install or start command.
    { id: "runSteps", status: m.readme && /\b(npm|npx|yarn|pnpm|bun)\b/.test(m.readme) ? "pass" : "fail" },
    { id: "secrets", status: m.secretsFound.length ? "fail" : "pass", detail: m.secretsFound.join(", ") || undefined },
    { id: "size", status: m.sizeBytes > MAX_SOURCE_BYTES ? "fail" : "pass" },
    { id: "lockfile", status: hasFile(m.files, /^(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb?)$/) ? "pass" : "warn" },
    { id: "license", status: hasFile(m.files, /^LICEN[CS]E(\.md|\.txt)?$/i) ? "pass" : "warn" },
    { id: "framework", status: sdk == null ? "warn" : "pass", detail: sdk == null ? undefined : `Expo SDK ${sdk}` },
  ];
}

/** Any failed check blocks submission; warnings are shown but allowed. */
export function isBlocking(checks: Check[]): boolean {
  return checks.some((c) => c.status === "fail");
}
