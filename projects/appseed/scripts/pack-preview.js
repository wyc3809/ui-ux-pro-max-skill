// Packs `expo export -p web` output into one self-contained HTML page (all JS inlined, fonts/images as data URIs)
// for sharing as a hosted preview: `npm run preview:pack` → dist/appseed-preview.html
const fs = require("fs"), path = require("path");
const [dist, out] = process.argv.slice(2);
const jsDir = path.join(dist, "_expo/static/js/web");
// Order: Metro runtime, shared modules, every route chunk, then the entry (which starts the app).
const files = fs.readdirSync(jsDir).filter((f) => f.endsWith(".js"));
const rank = (f) => (f.startsWith("__expo-metro-runtime") ? 0 : f.startsWith("__common") ? 1 : f.startsWith("entry-") ? 3 : 2);
files.sort((a, b) => rank(a) - rank(b));
const scripts = files.map((f) => fs.readFileSync(path.join(jsDir, f), "utf8"));
let js = scripts.join("\n/*@@CHUNK@@*/\n");
const USED = /DMSans_(400Regular|500Medium|600SemiBold|700Bold|800ExtraBold)\.|JetBrainsMono_(400Regular|700Bold)\.|Ionicons\.|\.png$/;
const mime = { ".ttf": "font/ttf", ".png": "image/png" };
let embedded = 0;
js = js.replace(/"(\/assets\/[^"]+)"/g, (m, p) => {
  if (!USED.test(p)) return m;
  const file = path.join(dist, p);
  if (!fs.existsSync(file)) return m;
  embedded++;
  return JSON.stringify(`data:${mime[path.extname(p)]};base64,${fs.readFileSync(file).toString("base64")}`);
});
js = js.replace(/<\/script/gi, "<\\/script");
const html = `<title>AppSeed</title>
<style>
  :root { --bg: #f5f6f3; }
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg: #0a0c0b; color-scheme: dark } }
  :root[data-theme="dark"] { --bg: #0a0c0b; color-scheme: dark }
  html, body { height: 100%; }
  body { overflow: hidden; background: var(--bg); }
  #root { display: flex; height: 100%; flex: 1; }
</style>
<div id="root"></div>
<script>
  // Expo Router reads the URL path; start every visit on the Explore tab.
  try { history.replaceState(null, "", "/"); } catch (e) {}
</script>
${js.split("\n/*@@CHUNK@@*/\n").map((c, i) => (i === files.length - 1 ? `<script>
  // Route chunks are inlined above, so their modules are already registered: make the async loader resolve at once.
  (function () {
    var ready = function () { return Promise.resolve(); };
    ready.isReady = function () { return true; };
    globalThis.__loadBundleAsync = ready;
  })();
</script>
` : "") + `<script>${c}</script>`).join("\n")}
`;
fs.writeFileSync(out, html);
console.log("embedded", embedded, "assets; size", (html.length / 1048576).toFixed(2), "MB");
