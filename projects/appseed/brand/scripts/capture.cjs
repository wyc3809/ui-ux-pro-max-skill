// Captures the real app (web build, demo data, dark mode) for the store screenshots: npm run brand:shots
// Needs the web build served locally: npx expo export -p web && npx serve dist -l 8099 (or any static server).
const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const BASE = process.env.SHOTS_URL || "http://localhost:8099";
const OUT = path.join(__dirname, "../out/raw");
const DEVICES = {
  iphone: { viewport: { width: 440, height: 956 }, deviceScaleFactor: 3 }, // 1320 × 2868 (6.9")
  ipad: { viewport: { width: 1032, height: 1376 }, deviceScaleFactor: 2 }, // 2064 × 2752 (13")
};
const LOCALES = { "zh-Hant": "zh-HK", en: "en-US" };
// Same order as store/README.md: leaderboard, categories, template, prompt, discussion, studio.
const SCREENS = [
  ["01-leaderboard", "/"],
  ["02-category", "/category/games"],
  ["03-template", "/template/pocket-ledger"],
  ["04-prompt", "/prompt/app-store-listing-writer"],
  ["05-discuss", "/", async (p, lang) => p.getByText(lang === "en" ? "Discuss" : "討論", { exact: true }).first().click()],
  ["06-categories", "/categories"],
];

(async () => {
  const browser = await chromium.launch();
  for (const [device, opts] of Object.entries(DEVICES)) {
    for (const [lang, locale] of Object.entries(LOCALES)) {
      const ctx = await browser.newContext({ ...opts, locale, colorScheme: "dark", reducedMotion: "reduce" });
      // The app's language is a saved setting (zustand persist in MMKV → localStorage on the web).
      await ctx.addInitScript((l) => localStorage.setItem("vcseed\\settings", JSON.stringify({ state: { theme: "dark", haptics: true, locale: l }, version: 0 })), lang);
      const page = await ctx.newPage();
      for (const [name, url, act] of SCREENS) {
        await page.goto(BASE + url, { waitUntil: "networkidle" });
        await page.waitForTimeout(1200);
        if (act) { await act(page, lang); await page.waitForTimeout(1200); }
        const file = path.join(OUT, device, lang, `${name}.png`);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        await page.screenshot({ path: file });
      }
      await ctx.close();
    }
  }
  await browser.close();
  console.log("captured", Object.keys(DEVICES).length * 2 * SCREENS.length);
})();
