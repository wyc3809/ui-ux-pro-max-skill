// Renders every brand image from brand/src/mark.js (docs/BRAND.md). Run: npm run brand:export
//   node brand/scripts/export.cjs            icons, store art, in-app layers
//   node brand/scripts/export.cjs --video    also the brand intro (store/video/brand-intro.mp4 + .gif)
const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.join(__dirname, "../..");
const out = (p) => path.join(root, p);
const COPY = {
  "zh-Hant": { line: "用 AI 做 App，由這裏發芽", sub: "可運行的原始碼 · Prompt · 新作排行榜" },
  en: { line: "Where vibe coded apps grow", sub: "Runnable source · Prompts · Launch leaderboards" },
};
// [file, job, args, flatten (App Store / Play reject alpha on these)]
const FILES = [
  ["assets/icon.png", "icon", [1024], true],
  ["assets/icon-dark.png", "iconDark", [1024]],
  ["assets/icon-tinted.png", "iconTinted", [1024]],
  ["assets/android-icon-foreground.png", "androidFg", [1024]],
  ["assets/android-icon-background.png", "androidBg", [1024], true],
  ["assets/android-icon-monochrome.png", "androidMono", [1024]],
  ["assets/splash-icon.png", "splash", [1024]],
  ["assets/splash.png", "splashBlank", [256]],
  ["assets/favicon.png", "rounded", [48]],
  ["assets/brand/leaf-left.png", "layerLeft", [512]],
  ["assets/brand/leaf-right.png", "layerRight", [512]],
  ["assets/brand/overlap.png", "layerOverlap", [512]],
  ["public/favicon.png", "rounded", [48]],
  ["public/apple-touch-icon.png", "icon", [180], true],
  ["public/icon-192.png", "rounded", [192]],
  ["public/icon-512.png", "rounded", [512]],
  ["public/og.png", "wide", [1200, 630, COPY["zh-Hant"].line, COPY["zh-Hant"].sub], true],
  ["store/ios/app-icon-1024.png", "icon", [1024], true],
  ["store/android/icon-512.png", "icon", [512]],
  ["store/android/zh-Hant/feature-graphic.png", "wide", [1024, 500, COPY["zh-Hant"].line, COPY["zh-Hant"].sub], true],
  ["store/android/en/feature-graphic.png", "wide", [1024, 500, COPY.en.line, COPY.en.sub], true],
];

async function main() {
  const browser = await chromium.launch({ args: ["--allow-file-access-from-files"] });
  const page = await browser.newPage();
  await page.goto("file://" + path.join(root, "brand/src/render.html"));
  await page.waitForFunction(() => document.body.dataset.ready === "1");
  const render = async (job, args) => Buffer.from((await page.evaluate(([j, a]) => window.renderJob(j, ...a), [job, args])).split(",")[1], "base64");
  const flat = [];
  for (const [file, job, args, flatten] of FILES) {
    fs.mkdirSync(path.dirname(out(file)), { recursive: true });
    fs.writeFileSync(out(file), await render(job, args));
    if (flatten) flat.push(out(file));
  }
  execFileSync("python3", [path.join(__dirname, "flatten.py"), ...flat], { stdio: "inherit" });
  console.log(`brand: ${FILES.length} images`);

  if (process.argv.includes("--video")) {
    const dir = fs.mkdtempSync(path.join(require("node:os").tmpdir(), "vcseed-intro-"));
    const fps = 60, seconds = 2.4; // 1.6 s intro, then hold
    for (let i = 0; i < fps * seconds; i++) fs.writeFileSync(path.join(dir, `f${String(i).padStart(4, "0")}.png`), await render("frame", [Math.min(1, i / (fps * 1.6)), 1080]));
    fs.mkdirSync(out("store/video"), { recursive: true });
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(fps), "-i", path.join(dir, "f%04d.png"), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "16", "-movflags", "+faststart", out("store/video/brand-intro.mp4")]);
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", out("store/video/brand-intro.mp4"), "-vf", "fps=30,scale=480:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse", out("store/video/brand-intro.gif")]);
    fs.rmSync(dir, { recursive: true });
    // The same intro on the App Preview canvas (886 × 1920), so it flows into the framed screens.
    const tall = fs.mkdtempSync(path.join(require("node:os").tmpdir(), "vcseed-intro-tall-"));
    for (let i = 0; i < 30 * seconds; i++) fs.writeFileSync(path.join(tall, `f${String(i).padStart(4, "0")}.png`), await render("frameTall", [Math.min(1, i / (30 * 1.6)), 886, 1920]));
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", "30", "-i", path.join(tall, "f%04d.png"), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "16", out("brand/out/intro-886x1920.mp4")]);
    fs.rmSync(tall, { recursive: true });
    console.log("brand: intro video");
  }
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
