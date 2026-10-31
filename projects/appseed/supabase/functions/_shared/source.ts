import { detectStack, scanSource, type SourceManifest } from "./rules/sourceScan.ts";

/**
 * Turns the files of an uploaded zip or a GitHub tree into the manifest lib/sourceScan.ts checks (§22.6).
 * Pure: the caller unzips or lists the repo and passes text for the files worth reading.
 */
export type SourceEntry = { path: string; size: number; text?: string };
type FileNode = { name: string; size?: number; children?: FileNode[] };

/** Files never allowed in a listing's source; their names alone fail the secrets check. */
const SECRET_FILES = /(^|\/)(\.env(\.(?!example|sample|template)[\w.-]+)?|id_rsa|id_ed25519|[\w.-]+\.(pem|p12|p8|keystore|jks|mobileprovision))$/i;
/** Credentials that must never ship in code. */
const SECRET_PATTERNS: [RegExp, string][] = [
  [/AKIA[0-9A-Z]{16}/, "AWS access key"],
  [/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/, "private key"],
  [/\bsk_live_[0-9a-zA-Z]{16,}/, "Stripe live key"],
  [/\bsk-ant-[0-9a-zA-Z_-]{20,}/, "Anthropic API key"],
  [/\bsk-[A-Za-z0-9]{32,}\b/, "API secret key"],
  [/\bghp_[0-9A-Za-z]{36}\b/, "GitHub token"],
  [/"service_role"|SUPABASE_SERVICE_ROLE_KEY\s*=\s*\S{20,}/, "Supabase service role key"],
];

/** Readable text files worth scanning, up to 512 KB each. */
export const shouldRead = (path: string, size: number) => size <= 512 * 1024 && /\.(json|js|jsx|ts|tsx|md|txt|env|ya?ml|toml|plist|xml|gradle|properties|swift|kt|java|rb|py|sh)$|(^|\/)(\.env[\w.-]*|README|LICENSE)$/i.test(path);

/** Zips often wrap everything in one folder (GitHub's zipball always does); strip it. */
function stripRoot(entries: SourceEntry[]): SourceEntry[] {
  const first = entries[0]?.path.split("/")[0];
  if (!first || !entries.every((e) => e.path.startsWith(`${first}/`))) return entries;
  return entries.map((e) => ({ ...e, path: e.path.slice(first.length + 1) })).filter((e) => e.path);
}

function tree(entries: SourceEntry[]): FileNode[] {
  const root: FileNode[] = [];
  for (const e of entries) {
    const parts = e.path.split("/").filter(Boolean);
    let level = root;
    parts.forEach((name, i) => {
      const leaf = i === parts.length - 1;
      let node = level.find((n) => n.name === name);
      if (!node) {
        node = leaf ? { name, size: e.size } : { name, children: [] };
        level.push(node);
      }
      if (!leaf) level = node.children ??= [];
    });
  }
  return root;
}

export function manifestFromEntries(raw: SourceEntry[]): SourceManifest {
  const entries = stripRoot(raw.filter((e) => !e.path.endsWith("/") && !/(^|\/)(node_modules|\.git)\//.test(e.path)));
  const at = (re: RegExp) => entries.find((e) => re.test(e.path));
  let dependencies: Record<string, string> = {};
  try {
    const pkg = JSON.parse(at(/^package\.json$/)?.text ?? "{}") as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
    dependencies = { ...pkg.devDependencies, ...pkg.dependencies };
  } catch {}
  const secretsFound: string[] = [];
  for (const e of entries) {
    if (SECRET_FILES.test(e.path)) secretsFound.push(e.path);
    else if (e.text) for (const [re, label] of SECRET_PATTERNS) if (re.test(e.text)) secretsFound.push(`${e.path} (${label})`);
  }
  return {
    files: tree(entries),
    readme: at(/^readme(\.md|\.txt)?$/i)?.text ?? null,
    dependencies,
    secretsFound,
    sizeBytes: entries.reduce((s, e) => s + e.size, 0),
  };
}

const count = (nodes: FileNode[]): number => nodes.reduce((n, f) => n + (f.children ? count(f.children) : 1), 0);

/** The ScanReport the app renders (src/api/types.ts). */
export function scanReport(m: SourceManifest) {
  return { checks: scanSource(m), stack: detectStack(m.dependencies), files: m.files, fileCount: count(m.files), sizeBytes: m.sizeBytes };
}
