import fs from "fs";
import path from "path";
import { dark, font, gap, nested, radius, type } from "../tokens";

// The Apple-style pass follows the landing-page-design scales (docs/DESIGN.md §25).
const SPACING = [0, 2, 4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96];
const TYPE_STEPS: Record<number, number> = { 12: 16, 14: 20, 16: 24, 18: 28, 20: 28, 24: 32, 30: 36, 36: 40 };
const RADII = [2, 4, 6, 8, 12, 16, 24, 999];

describe("design tokens", () => {
  it("puts every type style on a Tailwind size/line-height step", () => {
    for (const [name, s] of Object.entries(type)) {
      expect([name, TYPE_STEPS[s.fontSize]]).toEqual([name, s.lineHeight]);
    }
  });

  it("uses Geist only, capped at weight 700", () => {
    for (const f of Object.values(font)) expect(f).toMatch(/^Geist(Mono)?_(400Regular|500Medium|600SemiBold|700Bold)$/);
  });

  it("keeps spacing and radius tokens on their scales", () => {
    for (const v of Object.values(gap)) expect(SPACING).toContain(v);
    for (const v of Object.values(radius)) expect(RADII).toContain(v);
  });

  it("uses only the allowed dark surfaces", () => {
    const allowed = ["#000000", "#181818", "#1f1f1f", "#272727", "#313131", "#131209"];
    for (const k of ["bg", "bgElevated", "bgMuted", "bgCode", "segmentTrack"] as const) expect(allowed).toContain(dark[k]);
  });

  it("computes concentric inner radii (outer minus gap, only when gap < 32 and the result > 2)", () => {
    expect(nested(24, 8)).toBe(16);
    expect(nested(24, 12)).toBe(12);
    expect(nested(16, 8)).toBe(8);
    expect(nested(4, 4)).toBe(4);
    expect(nested(64, 40)).toBe(64);
  });
});

describe("spacing in source", () => {
  it("never hard-codes a gap, padding or margin off the spacing scale", () => {
    const root = path.resolve(__dirname, "../..");
    const offenders: string[] = [];
    const walk = (dir: string) =>
      fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) return walk(p);
        if (!e.name.endsWith(".tsx")) return;
        for (const m of fs.readFileSync(p, "utf8").matchAll(/\b(gap|padding[A-Za-z]*|margin[A-Za-z]*): (-?\d+)\b(?!\.)/g)) {
          if (!SPACING.includes(Math.abs(Number(m[2])))) offenders.push(`${path.relative(root, p)} ${m[0]}`);
        }
      });
    walk(root);
    expect(offenders).toEqual([]);
  });
});
