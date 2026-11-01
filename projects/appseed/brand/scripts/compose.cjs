// Puts the captured screens (brand/scripts/capture.cjs) into the brand frame for every store size: npm run brand:shots
const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.join(__dirname, "../..");
const RAW = path.join(__dirname, "../out/raw");
const COPY = {
  "zh-Hant": [
    ["每日新作<em>排行榜</em>", "看看大家用 AI 做了甚麼"],
    ["每個類別都有<em>自己的榜</em>", "App Store 類別＋Vibe coding 類別"],
    ["買下<em>可運行的原始碼</em>", "連開發故事、Prompt 和踩過的坑"],
    ["<em>Prompt</em> 先看再買", "預覽前幾行，滿意才解鎖"],
    ["和同路人<em>一起交流</em>", "分享作品、發問、互相幫忙"],
    ["由<em>一句 prompt</em> 到上架", "找到同類 App，看看別人怎樣做"],
  ],
  en: [
    ["Today's <em>top launches</em>", "See what people built with AI"],
    ["A <em>leaderboard</em> for every category", "App Store categories plus vibe coding ones"],
    ["Buy <em>runnable source</em>", "With the build story, prompts and pitfalls"],
    ["<em>Prompts</em> that work", "Preview the first lines before you buy"],
    ["Build <em>together</em>", "Share launches, ask, help each other"],
    ["From <em>one prompt</em> to the App Store", "Find apps like yours and see how they were made"],
  ],
};
// Store sizes: App Store 6.9" iPhone and 13" iPad (required), Google Play phone.
const SIZES = [
  { dir: "store/ios/{lang}/iphone-6.9", raw: "iphone", w: 1320, h: 2868, vars: { top: "170px", pad: "90px", h1: "112px", sub: "48px", shotTop: "720px", shotW: "1060px", r: "84px" } },
  { dir: "store/ios/{lang}/ipad-13", raw: "ipad", w: 2064, h: 2752, vars: { top: "150px", pad: "160px", h1: "124px", sub: "54px", shotTop: "640px", shotW: "1560px", r: "64px" } },
  { dir: "store/android/{lang}/phone", raw: "iphone", w: 1080, h: 1920, vars: { top: "96px", pad: "70px", h1: "76px", sub: "34px", shotTop: "420px", shotW: "800px", r: "60px" } },
];

(async () => {
  const browser = await chromium.launch({ args: ["--allow-file-access-from-files"] });
  const mark = "file://" + path.join(root, "assets/splash-icon.png");
  const made = [];
  for (const size of SIZES) {
    const page = await browser.newPage({ viewport: { width: size.w, height: size.h } });
    for (const [lang, lines] of Object.entries(COPY)) {
      const shots = fs.readdirSync(path.join(RAW, size.raw, lang)).filter((f) => f.endsWith(".png")).sort();
      for (let i = 0; i < shots.length; i++) {
        await page.goto("file://" + path.join(__dirname, "../src/frame.html"));
        const [title, sub] = lines[i];
        await page.evaluate((a) => window.setup(a), { vars: { w: `${size.w}px`, h: `${size.h}px`, ...size.vars }, title, sub, shot: "file://" + path.join(RAW, size.raw, lang, shots[i]), mark: i === 0 ? mark : null });
        const file = path.join(root, size.dir.replace("{lang}", lang), `${String(i + 1).padStart(2, "0")}.png`);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        await page.screenshot({ path: file });
        made.push(file);
      }
    }
    await page.close();
  }
  await browser.close();
  execFileSync("python3", [path.join(__dirname, "flatten.py"), ...made], { stdio: "inherit" });
  console.log("store screenshots:", made.length);
})();

// App Preview (App Store, 6.9" iPhone: 886 × 1920, 15–30 s, H.264 + stereo AAC): the brand intro, then each
// framed screen with a slow push-in, cross-fading. Run after the screenshots: node brand/scripts/compose.cjs --video
if (process.argv.includes("--video")) {
  process.on("exit", () => {});
  const W = 886, H = 1920, per = 3.4, fade = 0.5;
  for (const lang of Object.keys(COPY)) {
    const dir = path.join(root, `store/ios/${lang}/iphone-6.9`);
    const shots = fs.readdirSync(dir).filter((f) => /^\d\d\.png$/.test(f)).sort();
    const inputs = ["-i", path.join(root, "brand/out/intro-886x1920.mp4")]; // from export.cjs --video
    // One frame per screen: zoompan turns it into per × 30 frames.
    shots.forEach((s) => inputs.push("-i", path.join(dir, s)));
    const parts = [`[0:v]fps=30,format=yuv420p,setsar=1[v0]`];
    shots.forEach((_, i) => parts.push(`[${i + 1}:v]scale=${W * 2}:-1,zoompan=z='1+0.00045*on':d=${per * 30}:s=${W}x${H}:fps=30:x='iw/2-(iw/zoom/2)':y='0',format=yuv420p,setsar=1[v${i + 1}]`));
    let last = "v0", t = 2.4 - fade;
    shots.forEach((_, i) => {
      const out = `x${i + 1}`;
      parts.push(`[${last}][v${i + 1}]xfade=transition=fade:duration=${fade}:offset=${t.toFixed(2)}[${out}]`);
      last = out; t += per - fade;
    });
    const file = path.join(root, `store/ios/${lang}/app-preview-6.9.mp4`);
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...inputs, "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
      "-filter_complex", parts.join(";"), "-map", `[${last}]`, "-map", `${shots.length + 1}:a`, "-shortest",
      "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p", "-r", "30", "-b:v", "10M", "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart", file]);
    console.log("app preview:", file);
  }
}
