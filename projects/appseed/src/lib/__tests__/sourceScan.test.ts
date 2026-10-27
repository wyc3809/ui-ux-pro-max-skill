import { detectStack, expoSdk, isBlocking, MAX_SOURCE_BYTES, scanSource, type SourceManifest } from "../sourceScan";

const ok: SourceManifest = {
  files: [{ name: "README.md", size: 10 }, { name: "package-lock.json", size: 10 }, { name: "LICENSE", size: 10 }, { name: "src", children: [{ name: "App.tsx", size: 10 }] }],
  readme: "# App\n\n1. npm install\n2. npx expo start",
  dependencies: { expo: "~58.0.19", "@supabase/supabase-js": "^2.0.0", "react-native-purchases": "^8.0.0", react: "19.3.0" },
  secretsFound: [],
  sizeBytes: 4_000_000,
};
const status = (m: SourceManifest) => Object.fromEntries(scanSource(m).map((c) => [c.id, c.status]));

describe("sourceScan", () => {
  it("passes a clean Expo repo", () => {
    expect(isBlocking(scanSource(ok))).toBe(false);
    expect(scanSource(ok).find((c) => c.id === "framework")?.detail).toBe("Expo SDK 58");
  });
  it("blocks leaked secrets, missing README/run steps and oversize sources", () => {
    expect(status({ ...ok, secretsFound: [".env: SUPABASE_SERVICE_ROLE_KEY"] }).secrets).toBe("fail");
    expect(status({ ...ok, readme: null })).toMatchObject({ readme: "fail", runSteps: "fail" });
    expect(status({ ...ok, readme: "# App\nJust open it." }).runSteps).toBe("fail");
    expect(status({ ...ok, sizeBytes: MAX_SOURCE_BYTES + 1 }).size).toBe("fail");
    expect(isBlocking(scanSource({ ...ok, secretsFound: ["x"] }))).toBe(true);
  });
  it("only warns for missing lockfile, licence or framework", () => {
    const m = { ...ok, files: [{ name: "README.md", size: 1 }], dependencies: {} };
    expect(status(m)).toMatchObject({ lockfile: "warn", license: "warn", framework: "warn" });
    expect(isBlocking(scanSource(m))).toBe(false);
  });
  it("detects stack chips and the Expo SDK", () => {
    expect(detectStack(ok.dependencies)).toEqual(["Expo", "Supabase", "RevenueCat"]);
    expect(expoSdk({ expo: "^57.0.1" })).toBe(57);
    expect(expoSdk({})).toBeNull();
  });
});
