import fs from "fs";
import path from "path";
import { light } from "@/theme/tokens";

/** Brand rules (docs/BRAND.md): every brand image comes from brand/src/mark.js in the store's exact format. */
const root = path.join(__dirname, "../..");
const file = (p: string) => path.join(root, p);
/** Width, height and whether the PNG has an alpha channel, read from its IHDR chunk. */
function png(p: string) {
  const b = fs.readFileSync(file(p));
  expect(b.subarray(1, 4).toString()).toBe("PNG");
  const colorType = b[25];
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), alpha: colorType === 4 || colorType === 6 };
}
const listing = JSON.parse(fs.readFileSync(file("store/listing.json"), "utf8"));
const LANGS = ["zh-Hant", "en"];

describe("brand assets", () => {
  it("ships an opaque 1024 App Store icon with dark and tinted variants", () => {
    expect(png("assets/icon.png")).toEqual({ w: 1024, h: 1024, alpha: false });
    expect(png("store/ios/app-icon-1024.png")).toEqual({ w: 1024, h: 1024, alpha: false });
    for (const v of ["assets/icon-dark.png", "assets/icon-tinted.png", "assets/splash-icon.png", "assets/android-icon-foreground.png", "assets/android-icon-monochrome.png"]) expect(png(v)).toMatchObject({ w: 1024, h: 1024 });
    const app = JSON.parse(fs.readFileSync(file("app.json"), "utf8")).expo;
    expect(app.name).toBe("VCseed");
    // The native splash is only the app's background colour; the loading page (LaunchMark) draws the mark on it.
    const splash = app.plugins.find((p: unknown) => Array.isArray(p) && p[0] === "expo-splash-screen")[1];
    expect([splash.backgroundColor, splash.dark.backgroundColor]).toEqual([light.bg, "#000000"]);
    expect(png("assets/splash.png")).toMatchObject({ alpha: true });
    expect(app.ios.icon).toEqual({ light: "./assets/icon.png", dark: "./assets/icon-dark.png", tinted: "./assets/icon-tinted.png" });
    for (const p of [app.icon, app.android.adaptiveIcon.foregroundImage, app.android.adaptiveIcon.backgroundImage, app.android.adaptiveIcon.monochromeImage]) expect(fs.existsSync(file(p))).toBe(true);
  });

  it("has every store screenshot at the store's size, opaque, six per language", () => {
    const sets: [string, number, number][] = [["store/ios/{l}/iphone-6.9", 1320, 2868], ["store/ios/{l}/ipad-13", 2064, 2752], ["store/android/{l}/phone", 1080, 1920]];
    for (const l of LANGS) {
      for (const [dir, w, h] of sets) {
        const d = dir.replace("{l}", l);
        const shots = fs.readdirSync(file(d)).filter((f) => f.endsWith(".png"));
        expect(shots).toHaveLength(6);
        for (const s of shots) expect(png(`${d}/${s}`)).toEqual({ w, h, alpha: false });
      }
      expect(png(`store/android/${l}/feature-graphic.png`)).toEqual({ w: 1024, h: 500, alpha: false });
      expect(fs.statSync(file(`store/ios/${l}/app-preview-6.9.mp4`)).size).toBeGreaterThan(1_000_000);
    }
    expect(png("store/android/icon-512.png")).toMatchObject({ w: 512, h: 512 });
  });

  it("keeps the store copy within each store's limits", () => {
    for (const l of LANGS) {
      const a = listing[l].appStore, g = listing[l].googlePlay;
      expect(a.name.length).toBeLessThanOrEqual(30);
      expect(a.subtitle.length).toBeLessThanOrEqual(30);
      expect(a.promotionalText.length).toBeLessThanOrEqual(170);
      expect(a.keywords.length).toBeLessThanOrEqual(100);
      expect(a.description.length).toBeLessThanOrEqual(4000);
      expect(g.title.length).toBeLessThanOrEqual(30);
      expect(g.shortDescription.length).toBeLessThanOrEqual(80);
    }
  });

  it("draws the violet leaf in the app's own accent, from the one mark file", () => {
    const mark = fs.readFileSync(file("brand/src/mark.js"), "utf8");
    expect(mark.toLowerCase()).toContain(`violet: ["#b29bff", "${light.accent.toLowerCase()}"]`);
  });

  it("uses the VCseed name everywhere people can see", () => {
    const scan = (dir: string): string[] => fs.readdirSync(file(dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? scan(`${dir}/${e.name}`) : /\.(tsx?|html|json|md)$/.test(e.name) ? [`${dir}/${e.name}`] : []));
    const offenders = [...scan("src"), ...scan("public"), "app.json", "store/listing.json", "store/README.md"].filter((f) => /AppSeed/.test(fs.readFileSync(file(f), "utf8")));
    expect(offenders).toEqual([]);
  });
});
