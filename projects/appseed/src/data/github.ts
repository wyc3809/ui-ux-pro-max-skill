import type { GithubRepo } from "@/api/types";
import type { SourceManifest } from "@/lib/sourceScan";

/** Fictional GitHub account and repos for the connect-and-scan flow (§17). */
export const githubLogin = "kaylee-builds";

export const githubRepos: GithubRepo[] = [
  { fullName: "kaylee-builds/pocket-ledger-v2", private: true, language: "TypeScript", updatedAt: "2026-10-25", defaultBranch: "main", branches: ["main", "release/1.4", "feat/web"] },
  { fullName: "kaylee-builds/menu-snap", private: true, language: "TypeScript", updatedAt: "2026-10-20", defaultBranch: "main", branches: ["main"] },
  { fullName: "kaylee-builds/habit-seed", private: false, language: "TypeScript", updatedAt: "2026-10-18", defaultBranch: "main", branches: ["main", "dev"] },
  { fullName: "kaylee-builds/pixel-quiz-game", private: true, language: "JavaScript", updatedAt: "2026-09-30", defaultBranch: "master", branches: ["master"] },
];

const appTree = (extra: { name: string; size?: number }[] = []) => [
  { name: "app", children: [{ name: "_layout.tsx", size: 1680 }, { name: "(tabs)", children: [{ name: "index.tsx", size: 5320 }, { name: "settings.tsx", size: 3010 }] }] },
  { name: "src", children: [{ name: "lib", children: [{ name: "format.ts", size: 940 }, { name: "format.test.ts", size: 1210 }] }] },
  { name: "package.json", size: 2110 },
  ...extra,
];

/** What the server's scanner would read from each repo (one passes, one leaks a key, one has no README, one is plain). */
export const repoManifests: Record<string, SourceManifest> = {
  "kaylee-builds/pocket-ledger-v2": {
    files: appTree([{ name: "README.md", size: 6240 }, { name: "LICENSE", size: 1070 }, { name: "package-lock.json", size: 412000 }]),
    readme: "# Pocket Ledger v2\n\n1. npm install\n2. npx supabase db push\n3. npx expo run:ios",
    dependencies: { expo: "~58.0.19", "expo-router": "~58.0.26", "@supabase/supabase-js": "^2.45.0", "react-native-purchases": "^8.2.0", "@tanstack/react-query": "^5.105.0" },
    secretsFound: [],
    sizeBytes: 18_400_000,
  },
  "kaylee-builds/menu-snap": {
    files: appTree([{ name: "README.md", size: 2100 }, { name: ".env", size: 220 }, { name: "package-lock.json", size: 380000 }]),
    readme: "# Menu Snap\n\nnpm install && npx expo start",
    dependencies: { expo: "~58.0.19", "@anthropic-ai/sdk": "^0.40.0" },
    secretsFound: [".env：ANTHROPIC_API_KEY", "src/lib/supabase.ts：service_role key"],
    sizeBytes: 9_800_000,
  },
  "kaylee-builds/habit-seed": {
    files: appTree([{ name: "yarn.lock", size: 290000 }]),
    readme: null,
    dependencies: { expo: "~57.0.31", zustand: "^5.0.0", "react-native-reanimated": "4.6.0" },
    secretsFound: [],
    sizeBytes: 3_200_000,
  },
  "kaylee-builds/pixel-quiz-game": {
    files: appTree([{ name: "README.md", size: 900 }]),
    readme: "# Pixel Quiz\n\nRun `yarn` then `yarn start`.",
    dependencies: { "react-native": "0.79.0", "react-native-reanimated": "3.17.0" },
    secretsFound: [],
    sizeBytes: 26_000_000,
  },
};

/** A zip "uploaded" from the web build: clean, so the zip path can be completed end to end. */
export const zipManifest: SourceManifest = {
  files: appTree([{ name: "README.md", size: 3100 }, { name: "package-lock.json", size: 350000 }]),
  readme: "# My App\n\nnpm install\nnpx expo start",
  dependencies: { expo: "~58.0.19", "expo-router": "~58.0.26", "@supabase/supabase-js": "^2.45.0" },
  secretsFound: [],
  sizeBytes: 12_400_000,
};
