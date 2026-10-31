# App 原型市集 App：設計與手感藍圖

> 用途：放在新 repo 的 `docs/DESIGN.md`，並在 `CLAUDE.md` 寫明「所有 UI 必須跟從 docs/DESIGN.md」。
> 手感、數值和規則沿用 WorthBook 及「香港公司查冊 App」藍圖（同一位作者），以 **React Native + Expo** 實作，一份程式碼出 iOS、Android 和網頁版。
> 產品名稱 **AppSeed**，副標 **Vibe coding incubator**（所有語言相同，見 i18n `brand`）：創作者上載**可運行的 App 原始碼**和**製作經歷**（用過的 prompt、架構決定、踩過的坑、上架步驟），其他人付費取得，用作自己 App 的起點，再用 Claude Code 等 AI 工具修改。

---

## 0. 一句話定位

**「AI 年代的 App 起點」**：買家三秒內看懂一個原型能做甚麼、用了甚麼技術、要多少錢；買下之後一鍵把原始碼送到電腦。創作者用手機就能看銷售、回覆評價，在網頁版完成上載。

---

## 1. 產品原則（每個新功能都要對照）

| 原則 | 具體做法 |
|---|---|
| 先看到成果 | 模板頁頂部先放截圖／示範影片，再放文字；每個模板必須附可以運行的截圖或影片 |
| 一個畫面講清一件事 | 模板頁 hero 只放：名稱、創作者、價錢、評分、技術棧、最後更新 |
| 單手可用 | 主要操作在畫面下半部：底部分頁列、中間搜尋鍵、固定在底部的購買按鈕、Bottom sheet |
| 每次操作都有回饋 | 按下會縮放並震動；收藏、購買成功、複製 prompt 都有 success 震動和提示 |
| 不要死胡同 | 找不到結果、離線、付款失敗、審核被拒，都要提供「下一步」 |
| 可信 | 每個模板顯示：最後更新日期、已測試的平台、授權類別、審核狀態、真實買家評價（只限已購用戶） |
| 手機看、電腦做 | 手機負責發現、閱讀製作經歷、購買、管理；原始碼一律「傳送到電腦」（電郵連結／GitHub 存取），不在手機上解壓或編輯 |
| 創作者優先 | 上架流程清楚、審核有時限、收入和分成透明 |
| 視覺一致 | 新畫面只用 theme token 和現有元件，不另創新樣式 |

---

## 2. 技術棧

| 層 | 選擇 | 備註 |
|---|---|---|
| 框架 | Expo（SDK 最新）+ React Native（New Architecture）+ TypeScript strict | iOS、Android、Web 同一份程式碼 |
| 路由 | Expo Router（`(tabs)` 分頁 + native stack） | 網頁版同一套路由，模板頁有可分享的網址 |
| 動畫 | react-native-reanimated + react-native-gesture-handler | 所有動畫在 UI thread 執行 |
| Bottom sheet | @gorhom/bottom-sheet | 全 App 唯一的彈出層 |
| 列表 | @shopify/flash-list | 模板列表、評價、版本紀錄 |
| 圖片／影片 | expo-image（快取、blurhash 佔位）+ expo-video | 截圖輪播、示範影片 |
| Markdown | react-native-marked（自訂 renderer，代碼區塊用 token 樣式） | 製作經歷、README 預覽 |
| 伺服器資料 | TanStack Query（快取 + 重試 + 離線讀快取） | |
| 本機狀態 | Zustand + react-native-mmkv（persist） | 收藏、搜尋紀錄、設定、草稿 |
| 後端 | Supabase（Auth、Postgres、Storage、Edge Functions） | 上載檔案放私有 bucket，下載用限時簽名網址 |
| 付款 | iOS／Android：RevenueCat（App 內購買）；網頁：Stripe Checkout | 見 §13 |
| 創作者收款 | Stripe Connect（Express 帳戶） | 分成、退款、報表 |
| 檔案 | expo-document-picker、expo-file-system、expo-sharing | 手機只做小型上載（截圖）；原始碼建議在網頁上載 |
| 震動 | expo-haptics | |
| 模糊 | expo-blur | 分頁列 |
| 字體 | Geist；代碼用 Geist Mono；中文用系統字（PingFang／Noto Sans CJK） | 字重最多 700，不用斜體（§25） |
| 圖示 | Phosphor 字型（regular + fill 兩個子集字型，經 `createIconSet`），**不用 SVG** | 全部經 `Icon` 元件：outline ↔ filled 變形、進場彈出、狀態改變時播放動畫 |
| 圖表（少量） | Reanimated + View 長條（不用 SVG） | 只用於創作者銷售統計，長條逐條長出 |
| 通知 | expo-notifications | 審核結果、新銷售、已購模板有新版本 |
| 測試 | Jest + @testing-library/react-native + Maestro + MSW | |
| 建置及上架 | EAS Build、EAS Submit；EAS Update 只用於修正 bug；網頁版用 `expo export -p web` 部署 | |

---

## 3. 專案結構

```
app/
  (tabs)/
    _layout.tsx            # 自訂分頁列：4 個分頁 + 中間搜尋鍵
    index.tsx              # 探索：搜尋列、分類 chips、精選、新上架、熱門
    library.tsx            # 已購：已購模板、收藏
    studio.tsx             # 創作者中心：我的模板、銷售、收款
    me.tsx                 # 我的：帳戶、設定、授權說明、私隱
  search.tsx               # 搜尋（全螢幕，鍵盤自動彈出）
  template/[slug].tsx      # 模板詳情
  template/[slug]/story.tsx  # 製作經歷（長文閱讀）
  creator/[handle].tsx     # 創作者頁
  checkout/[slug].tsx      # 購買確認（sheet 形式，網頁版為頁面）
  studio/new.tsx           # 上載精靈（多步驟）
  studio/[id].tsx          # 編輯模板、看審核結果
src/
  theme/tokens.ts          # 顏色、圓角、陰影、字級、動效常數（唯一來源）
  components/ui/           # Card, ListRow, Button, HeaderButton, SegmentedControl, Chip,
                           # StatusBadge, SearchBar, Skeleton, EmptyState, ErrorState, Sheet,
                           # PriceTag, RatingStars, StickyCTA
  components/template/     # TemplateCard, TemplateHero, MediaCarousel, StackChips,
                           # FileTree, StoryStep, PromptBlock, ReviewRow, VersionTimeline
  components/studio/       # UploadStepper, ListingRow, SalesChart, PayoutCard
  lib/                     # 純邏輯（可單元測試）：價錢格式、分成計算、狀態對應、
                           # 搜尋正規化、授權規則、動效規則
  api/                     # Supabase client、型別、query keys
  store/                   # Zustand：favorites, history, settings, uploadDraft
  i18n/                    # zh-Hant / en（key 有型別）
supabase/
  migrations/              # 資料庫結構（見 §14）
  functions/               # 掃描上載、簽名下載、付款 webhook、分成結算
e2e/maestro/*.yaml         # 使用流程
```

**規則**：邏輯放在 `lib/`，寫成純函數並加單元測試；元件只負責「套用」邏輯。**分成和價錢計算只在伺服器決定**，App 端的 `lib/` 只用作顯示。

---

## 4. 設計 Token（`src/theme/tokens.ts`）

所有顏色只能從 token 取用，**元件內不可寫死色碼**。

> 以下是第一版數值。Apple 風格改版（§25）之後，色值、圓角、字體以 `src/theme/tokens.ts` 為準：深色模式改用純黑系底色，新增 `glass`／`glassEdge`，圓角改為 Tailwind 階梯。中性色沿用 WorthBook；品牌色由信任藍改為**創作紫**（可以換，換後重新檢查對比度）。

```ts
export const light = {
  bg: "#f5f6f3",          // 頁面底色：略帶暖灰，不用純白
  bgElevated: "#ffffff",  // 卡片、sheet
  bgMuted: "#eef1ef",     // 輸入框、次要按鈕、inset 區
  bgCode: "#f0f2f5",      // 代碼區塊、檔案樹
  fg: "#0f1412",
  fgMuted: "#5f6b64",
  fgSubtle: "#646f69",    // 在所有底色上都要 ≥4.5:1
  border: "rgba(15,20,18,0.08)",
  accent: "#5b3fd6",      // 品牌色：白底文字 ≥4.5:1
  accentPressed: "#4a31b8",
  accentSoft: "rgba(91,63,214,0.12)",
  accentFg: "#ffffff",
  price: "#0f1412",       // 價錢用主文字色，不用品牌色，避免像廣告
  rating: "#b45309",      // 星星
  // 模板狀態（不要用品牌色表示狀態）
  live: "#147a3b",        liveSoft: "#e7f6ec",       // 已上架、已購
  pending: "#1d5fd1",     pendingSoft: "rgba(29,95,209,0.1)", // 審核中
  ended: "#5f6b64",       endedSoft: "#eef0ec",      // 草稿、已下架
  warn: "#b45309",        warnSoft: "rgba(180,83,9,0.1)",   // 需要修改
  danger: "#c81e1e",      dangerSoft: "rgba(200,30,30,0.1)", // 被拒、付款失敗
  segmentTrack: "#eceeea",
  overlay: "rgba(15,20,18,0.45)",
};

export const dark: typeof light = {
  bg: "#0a0c0b", bgElevated: "#141816", bgMuted: "#1c211f", bgCode: "#101412",
  fg: "#f4f7f5", fgMuted: "#a3ada7", fgSubtle: "#828d86",
  border: "rgba(244,247,245,0.08)",
  accent: "#a594ff", accentPressed: "#8f7bff", accentSoft: "rgba(165,148,255,0.16)", accentFg: "#120a33",
  price: "#f4f7f5", rating: "#f59e0b",
  live: "#4ade80", liveSoft: "rgba(74,222,128,0.14)",
  pending: "#5b9cff", pendingSoft: "rgba(91,156,255,0.16)",
  ended: "#a3ada7", endedSoft: "rgba(244,247,245,0.08)",
  warn: "#f59e0b", warnSoft: "rgba(245,158,11,0.14)",
  danger: "#f87171", dangerSoft: "rgba(248,113,113,0.12)",
  segmentTrack: "#1c211f",
  overlay: "rgba(0,0,0,0.62)",
};

export const radius = { card: 22, hero: 24, row: 18, inset: 16, control: 12, media: 18, chip: 999 };
export const space = { gutter: 16, cardPad: 16, rowPadX: 14, rowPadY: 12 };
export const hit = 44; // 最小觸控尺寸

/** 淺色模式卡片靠陰影浮起；深色模式陰影看不見，改用 1px border。 */
export const shadow = {
  card: { shadowColor: "#0f1412", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  soft: { shadowColor: "#0f1412", shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
};
```

- 用 `useColorScheme()` 加上用戶設定（跟隨系統／淺色／深色）選擇 theme；用 `expo-system-ui` 設定根背景，避免開 App 時閃白。
- 換品牌色時只需要改 `accent*`，然後重新檢查對比度是否 ≥4.5:1。
- 截圖和影片四周加 1px `border`，避免白色截圖在淺色底上「消失」。

---

## 5. 字體與排版

字級只用 Tailwind 階梯：12/16、14/20、16/24、18/28、20/28、24/32、30/36、36/40；字重最多 700。

| 用途 | 樣式 |
|---|---|
| 分頁大標題 | 30／36，700，`letterSpacing: -0.75` |
| 模板名稱（hero） | 24／32，700，最多 2 行 |
| 一句話簡介（hero） | 16／24，400，`fgMuted`，最多 2 行 |
| 區塊標題 | 18／28，600 |
| 眉標（區塊上方小字） | 12／16，600，全大寫，`letterSpacing: 0.5`，`fgSubtle` |
| 內文 | 14／20；製作經歷長文用 16／24 |
| 代碼、prompt、檔案樹 | Geist Mono 12／16，`bgCode` 底 |
| 價錢 | 18／28，700，`tabular-nums` |
| 輔助文字 | 12／16，`fgSubtle` |
| 分頁列標籤 | 12／16，500 |

- 價錢、日期、銷量、評分一律用 `fontVariant: ["tabular-nums"]`。
- 支援系統字體放大（Dynamic Type）：不要把高度寫死，`maxFontSizeMultiplier` 設為 1.4；代碼區塊橫向捲動，不自動換行。
- 搜尋結果中命中的字用 `accent` 色加粗。

---

## 6. App 外殼

```
┌───────────────────────────┐  ← SafeArea top
│  探索                 ⚙   │  ← HeaderButton 40px 圓形
│  [🔍 搜尋模板、技術或用途 ] │  ← 搜尋列（點擊後進入全螢幕搜尋）
│  （列表捲動區）             │
├───────────────────────────┤
│ 探索  已購  (🔍)  創作  我的 │  ← 自訂 tabBar：BlurView + 頂部細線
└───────────────────────────┘  ← SafeArea bottom
```

1. **分頁列**：`expo-blur` 模糊（iOS intensity 60；Android 改用 94% 不透明底色）、頂部 hairline 分隔線、向上的柔和陰影；欄寬 1:1:72px:1:1。
2. **中間搜尋鍵**：56px 圓形、品牌色漸變、向上浮出 22px、外圈有 4px 底色環；按下縮放到 0.95 並震動，然後打開全螢幕搜尋（鍵盤自動彈出）。
3. **推入頁**（模板、製作經歷、創作者）用 native stack 的原生轉場和返回手勢，不要自己重寫。
4. **捲動**：頁首大標題捲動時收起（iOS large title 效果）；每個分頁記住自己的捲動位置。
5. **底部固定 CTA**（模板頁）：`StickyCTA` 浮在分頁列位置之上，顯示價錢和主按鈕（購買／傳送到電腦）；捲動時不隱藏。
6. **網頁版**：寬度 ≥1024px 時改為左側導航 + 中間內容（最闊 1120px）；模板頁變為左邊媒體、右邊資料和購買卡；token 和元件不變。
7. **Android**：edge-to-edge，系統返回鍵先關 sheet，再返回上一頁。
8. **鍵盤**：用 `react-native-keyboard-controller`；搜尋頁捲動時收起鍵盤（`keyboardDismissMode="on-drag"`）。

---

## 7. 元件規格

沿用原有元件（Card、ListRow、Button、HeaderButton、SegmentedControl、Chip、SearchBar、Skeleton、EmptyState、ErrorState、Switch、Sheet），規格不變。以下為新增或改動：

| 元件 | 規格 |
|---|---|
| `TemplateCard` | 用於列表和精選：上方 16:10 封面（圓角 18，`expo-image` + blurhash）；下方名稱（2 行）、創作者、`RatingStars`、`PriceTag`；按下縮放到 0.97 |
| `TemplateHero` | 圓角 24；`MediaCarousel` → 名稱、一句話簡介 → 創作者列（頭像 + 名稱，點擊進入創作者頁）→ `StackChips` → 評分、銷量、最後更新；右上角收藏按鈕 |
| `MediaCarousel` | 橫向分頁，支援截圖和影片；下方小圓點指示；點擊全螢幕檢視，雙指縮放；影片預設靜音、不自動播放 |
| `StackChips` | 技術棧標籤（Expo、Supabase、Stripe、Claude Code…），用 `Chip` 樣式但不可選，`bgMuted` 底 |
| `PriceTag` | 價錢 + 幣別（HK$／US$，依地區）；免費顯示「免費」；已購顯示 `StatusBadge`「已購」取代價錢 |
| `RatingStars` | 5 粒星，0.5 為單位，旁邊是評分數字和評價數量；評價少於 3 則顯示「新上架」 |
| `StatusBadge` | 全圓角 11／700：已上架、已購＝`live`；審核中＝`pending`；草稿、已下架＝`ended`；需要修改＝`warn`；被拒＝`danger`；對應寫在 `lib/status.ts` 並加單元測試 |
| `PromptBlock` | `bgCode` 底、圓角 16；左上眉標「PROMPT」或工具名稱；右上「複製」鍵（success 震動）；超過 12 行時摺起，「展開全部」 |
| `StoryStep` | 製作經歷的一個步驟：左邊編號圓點和直線（時間軸），右邊標題、內文、可選的 `PromptBlock`、截圖、「踩過的坑」提示框（`warnSoft` 底） |
| `FileTree` | 唯讀檔案樹預覽，資料夾可展開；只顯示檔名和大小，**不顯示檔案內容**（README 除外） |
| `ReviewRow` | 頭像、名稱、星數、日期、內文（最多 4 行可展開）；標示「已購買」；創作者回覆縮排顯示 |
| `VersionTimeline` | 版本號、日期、更新說明；最新版本標示「最新」 |
| `StickyCTA` | 高 64 + SafeArea；左邊 `PriceTag`，右邊主 `Button`（佔 60% 寬）；狀態：購買／處理中（spinner）／傳送到電腦／不可購買（disabled 並顯示原因） |
| `UploadStepper` | 頂部步驟進度（1/5…），每步一個畫面；底部「上一步／下一步」；自動儲存草稿到 MMKV 和伺服器 |
| `ListingRow` | 創作者自己的模板：縮圖、名稱、`StatusBadge`、本月銷量、收入 |
| `PayoutCard` | 可提取金額（numberRoll）、下次結算日期、「查看收款紀錄」 |
| `Sheet`（@gorhom/bottom-sheet） | 頂部圓角 24、背景遮罩 `overlay`；標題和底部按鈕固定，只捲動中間；點遮罩、向下拖、Android 返回鍵都會關閉；**不要用 `Alert.alert` 做確認**，改用 ConfirmSheet |

---

## 8. 動效（Reanimated）

```ts
// src/theme/tokens.ts
export const motion = {
  enter:   { duration: 450, easing: Easing.out(Easing.cubic) },       // 區塊淡入上移 10px
  stagger: 80,                                                         // 第 2、3 個區塊延遲
  sheet:   { duration: 320, easing: Easing.bezier(0.32, 0.72, 0, 1) },
  tab:     { duration: 300, easing: Easing.bezier(0.2, 0.8, 0.2, 1), offset: 18 },
  rowIn:   { duration: 300, easing: Easing.bezier(0.16, 1, 0.3, 1) },
  rowOut:  { duration: 220, easing: Easing.bezier(0.7, 0, 0.84, 0) },
  press:   { scale: 0.97, duration: 120 },
  numberRoll: 480,
  purchase: { duration: 600 },                                         // 購買成功：按鈕變色 + 勾號
};
```

| 場景 | 做法 |
|---|---|
| 頁面內容進場 | `FadeInDown`（位移 10），第 2、3 個區塊依次延遲 80ms |
| 切換分頁 | 右邊的分頁從右邊淡入、左邊的從左邊，位移 18（方向邏輯寫成純函數並加測試） |
| 推入頁 | native stack 預設轉場；`TemplateCard` 封面到 hero 可用 shared element（之後再做，非必要） |
| 分頁圖示 | 選中時彈一下：scale 1 → 1.18 → 1（彈性曲線） |
| 收藏 | 心形 scale 1 → 1.3 → 1 + 填色 |
| 購買成功 | `StickyCTA` 由品牌色過渡到 `live`，文字換成勾號和「已購」，600ms；之後變成「傳送到電腦」 |
| 列表新增／刪除 | `entering` 用 rowIn、`exiting` 用 rowOut、`LinearTransition` 重新排列 |
| 骨架 → 內容 | 交叉淡入 200ms，版面不跳動（骨架和內容同尺寸） |
| 按下 | `Pressable` + `withTiming(scale 0.97)` |
| 數字（銷量、收入） | 滾動到新值，480ms |

- 一次出現超過 3 個新項目（首次載入、同步）時**不播**逐項動畫。
- `useReducedMotion()` 為 true 時全部改成即時切換。

---

## 9. 觸感（expo-haptics）

| 類型 | 何時用 | API |
|---|---|---|
| selection | 切分頁、切 segment、選 chip、截圖翻頁 | `Haptics.selectionAsync()` |
| tap | 打開 sheet、按中間搜尋鍵、收藏 | `Haptics.impactAsync(Light)` |
| success | 購買成功、複製 prompt、傳送到電腦成功、提交審核 | `Haptics.notificationAsync(Success)` |
| warning | 表單未填妥、付款失敗、上載失敗 | `Haptics.notificationAsync(Warning)` |

集中寫在 `lib/haptic.ts`；只在事件處理器內觸發；失敗時靜默略過；設定頁提供開關。

---

## 10. 主要畫面

### 買家

1. **探索（首頁）**：大標題 → 搜尋列 → 分類 chips（全部／工具／記帳理財／AI 應用／遊戲／香港本地／商戶工具）→ 精選（橫向大卡）→ 新上架 → 本週熱門 → 「免費入門」。
2. **搜尋**（全螢幕）：鍵盤自動彈出；可搜尋名稱、用途、技術（例如「Expo Supabase」）；結果用 `TemplateCard` 的列表版；上方 chips 篩選：價錢（免費／付費）、平台（iOS／Android／Web）、技術棧、排序（相關／最新／評分／銷量），篩選用 Sheet。
3. **模板詳情**：`TemplateHero` → 分段：概覽｜製作經歷｜檔案｜評價｜版本 → `StickyCTA`。
   - 概覽：功能清單、適合誰、需要的帳戶和費用（例如「需要 Supabase 免費帳戶」）、已測試平台、授權類別（點擊打開授權說明 Sheet）。
   - 製作經歷：首 1–2 個步驟免費預覽，其餘鎖定並模糊，顯示「購買後解鎖全部 N 個步驟」。
   - 檔案：`FileTree` + README 預覽；顯示總大小和檔案數。
   - 評價：平均分 + 分佈 + `ReviewRow` 列表；只有已購用戶可以評價。
   - 版本：`VersionTimeline`。
   - 頁尾：「最後更新於 yyyy-mm-dd｜已通過安全掃描｜檢舉此模板」。
4. **製作經歷**（長文閱讀頁）：上方進度條；`StoryStep` 時間軸；`PromptBlock` 可複製；右上「目錄」Sheet 跳到步驟；記住閱讀位置；已購內容可離線閱讀。
5. **購買**（Sheet）：模板名稱、授權類別、價錢、付款方式 → 確認 → 處理中 → 成功動畫 → 「傳送到電腦」。
6. **已購**：分段：已購｜收藏。已購列表顯示版本，有新版本時加「有更新」標記；每項可「傳送到電腦」「閱讀製作經歷」「評價」。
7. **傳送到電腦**（Sheet）：
   - 寄到我的電郵（附限時下載連結，24 小時有效）
   - 邀請我的 GitHub 帳戶存取私有 repo（如果創作者用 GitHub 上載）
   - 複製網頁版連結（在電腦登入後下載）
   - 網頁版直接顯示「下載 zip」。
8. **創作者頁**：頭像、名稱、簡介、連結、總銷量、平均評分、模板列表。

### 創作者

9. **創作者中心**（分頁）：首次使用時顯示介紹和「成為創作者」（需要完成 Stripe Connect 收款設定）；之後顯示：本月收入（numberRoll）、`SalesChart`（30 日）、我的模板（`ListingRow`）、`PayoutCard`、「上載新模板」按鈕。
10. **上載精靈**（5 步，草稿自動儲存）：
    1. 基本資料：名稱、一句話簡介、分類、平台、技術棧
    2. 原始碼：連結 GitHub repo（建議）或上載 zip（手機上建議改用網頁版，畫面上直接提示）；必須有 README 和運行步驟
    3. 媒體：3–8 張截圖、可選示範影片、封面
    4. 製作經歷：逐步填寫（標題、內文、prompt、截圖、踩過的坑）；設定免費預覽的步驟數
    5. 定價與授權：價錢（從固定價格級別選擇，見 §13）、授權類別、確認原創聲明 → 提交審核
11. **審核結果**：`StatusBadge` + 審核員意見；「需要修改」時列出要改的地方和「重新提交」。

### 共用

12. **我的**：帳戶、語言、主題、通知、震動、授權說明、退款政策、私隱政策、條款、清除搜尋紀錄、刪除帳戶、關於。

---

## 11. 互動規則

1. 觸控目標 ≥44×44；列表整列都可以點擊。
2. **未登入可以瀏覽和搜尋**；收藏、購買、評價、上載才要求登入（Sign in with Apple、Google、電郵）。登入用 Sheet，完成後回到原本的操作。
3. 篩選、排序、確認、購買一律用 Sheet，不跳去新頁。
4. **載入**：先顯示快取的資料，背景再更新；首次載入顯示骨架；下拉可以重新整理。
5. **錯誤**：提示寫清楚原因和下一步；付款失敗時說明「未有扣款」或「已扣款，正在處理」，不可以含糊。
6. **破壞性操作**（下架模板、刪除帳戶、清除紀錄）：用 ConfirmSheet 確認，按鈕用紅色；下架不影響已購用戶的存取權。
7. **重複購買保護**：已購模板不可再購買，按鈕直接變成「傳送到電腦」。
8. **Android 返回鍵**：先關最上層 sheet，再返回上一頁，在首頁才離開 App。
9. **Deep link**：`appseed://t/<slug>`、`appseed://c/<handle>` 和 universal link `https://<domain>/t/<slug>`；分享模板時用網頁連結，沒有安裝 App 的人也可以打開。
10. **長按 prompt**：複製並顯示 success 提示。

---

## 12. 吉祥物（可選）

可以沿用 WorthBook 的結構：一個「種子」角色，只在空白狀態（未有已購、未有上載）、首次購買、首次上架、銷售里程碑出現。市集以清晰、可信為先，角色要克制。

---

## 13. 付款、授權與合規（開發前必須確認）

> 以下是設計時要處理的事項，**不是法律意見**；上架前請逐條核對最新的 App Store Review Guidelines、Google Play 政策，並向律師和會計師確認。

### 付款
- **App 內購買**：在 iOS／Android App 內出售數碼內容，一般要用 Apple／Google 的 App 內購買。Apple 不容許動態新增商品，所以 App 內用**固定價格級別**（例如 HK$38／78／158／388／788）對應 IAP 商品，模板定價只可以從這些級別選擇。用 RevenueCat 管理收據，由伺服器 webhook 授予存取權。
- **抽成**：Apple／Google 加入小型企業計劃後一般為 15%。App 內收入的分成公式要先扣平台抽成，再計創作者分成，寫在 `supabase/functions/settlement` 並加測試。
- **網頁購買**：網頁版用 Stripe Checkout，抽成較低。App 內是否可以引導用戶到網頁購買，視乎地區和最新規則（例如美國商店的外部連結規定），**不可預設可以**；用 feature flag 按地區開關。
- **分帳**：Stripe Connect（Express）；創作者收入在退款期過後才結算（例如 14 日），每月或每兩星期付款一次。
- **稅務**：保留每筆交易的地區、幣別和稅項紀錄；跨境出售可能涉及當地的數碼服務稅。

### 授權
- 提供 2–3 個標準授權，創作者只可以選擇，不可以自訂：
  - **個人／學習**：可修改、可用於一個非商業項目
  - **商業（單一產品）**：可用於一個上架的商業 App
  - **擴展**：多個產品或客戶項目
- 所有授權都**禁止轉售或公開原始碼本身**。授權全文在模板頁和購買 Sheet 都要可以打開。

### 內容與安全
- **原創聲明**：上載時必須確認擁有原始碼的權利、沒有包括他人受版權保護的素材、第三方套件的授權相容（例如 GPL 套件要特別標示）。
- **自動掃描**（Edge Function）：密鑰和 API key（gitleaks）、惡意程式（ClamAV）、依賴套件漏洞（`npm audit`／osv-scanner）、檔案大小上限；發現密鑰時直接退回並提示創作者。
- **人手審核**：所有新模板和新版本都要人手審核（用 §20 的審核後台）；檢查能否按 README 運行、截圖是否真實、製作經歷是否完整。目標 3 個工作天內回覆。之後可以讓信譽良好的創作者的小版本更新免審。
- **App 本身不執行下載的程式碼**：手機 App 只保存和轉送檔案，不在 App 內運行、解壓或載入，以符合 Apple Guideline 2.5.2。
- **檢舉**：每個模板和評價都可以檢舉（抄襲、惡意程式、侵權），並提供版權投訴（takedown）聯絡方式。
- **退款政策**：數碼產品可以被複製，所以退款只限「不能按說明運行」並在指定日數內提出；寫清楚在購買 Sheet 上。App 內購買的退款由 Apple／Google 處理，伺服器收到通知後收回存取權。

### 私隱與上架
- **個人資料（私隱）條例**：只收集必要資料（電郵、名稱、付款紀錄）；寫清楚收集和使用聲明。
- **App Store／Google Play**：私隱政策、Data safety 申報（帳戶、購買紀錄）、**App 內可以刪除帳戶**、Sign in with Apple（如果提供其他第三方登入）。
- 創作者的收款資料（身份證明、銀行帳戶）**只交由 Stripe 處理**，不存入自己的資料庫。

---

## 14. 資料、快取與私隱

1. 主要資料表：`profiles`、`creators`、`templates`、`template_versions`、`story_steps`、`media`、`purchases`、`reviews`、`payouts`、`reports`。所有表開啟 Row Level Security。
2. 原始碼存放在私有 Storage bucket；下載只經 Edge Function 簽發**限時簽名網址**，並檢查購買紀錄。
3. 伺服器資料：TanStack Query；模板頁快取 1 小時，列表 10 分鐘；快取保存到 MMKV，離線時可以看已購模板和已讀的製作經歷。
4. 本機資料：收藏（未登入時）、搜尋紀錄、設定、上載草稿存 MMKV；登入後收藏同步到伺服器。
5. **不可以**用空資料覆蓋有內容的本機資料（例如同步失敗時）。
6. 購買狀態以伺服器為準，App 端不可以自行判斷「已購」。
7. 不放第三方廣告 SDK；分析工具用可以關閉、不含個人資料的方案，並寫進私隱政策。
8. 通知：審核結果、新銷售（可關閉）、已購模板有新版本；通知內容不包括付款資料。

---

## 15. 文案與多語言

- 每個字串都放在 `i18n/{zh-Hant,en}.ts`，key 有型別；缺少 key 時編譯失敗。
- 介面中文一律用**書面語**（「的」不用「嘅」），用單元測試自動檢查；**創作者上載的內容不受此限**。
- 模板狀態、授權類別、分類、技術棧的中英對照集中放在 `lib/labels.ts`。
- 日期格式：中文用 `2026年10月26日`，英文用 `26 Oct 2026`；價錢依地區顯示幣別。
- 語氣：直接、具體，例如「購買後解鎖全部 12 個步驟」，不用「立即搶購」之類的推銷字眼。

---

## 16. 無障礙

- 文字對比 ≥4.5:1（token 已經按此設定）。
- 每個圖示按鈕都要設 `accessibilityLabel`；`StatusBadge`、`RatingStars` 要讀出文字（例如「4.5 星，共 23 則評價」），不能只靠顏色或圖形。
- 截圖要有替代文字（上載時要求創作者填寫，可以用 AI 預填）。
- 支援字體放大、VoiceOver／TalkBack 讀出順序合理；Sheet 打開時焦點移入。
- 尊重「減少動態效果」設定；影片不自動播放。

---

## 17. 測試政策

- **每個功能都要在同一個 PR 附上測試**：邏輯（分成計算、價格級別、狀態對應、授權規則、搜尋正規化、動效方向）用 Jest；元件用 Testing Library；使用流程用 Maestro。
- API 用 MSW 模擬；付款用 RevenueCat sandbox 和 Stripe test mode；測試資料用**虛構的模板、創作者和買家**。
- 必測流程：
  - 瀏覽 → 打開模板 → 預覽製作經歷 → 登入 → 購買（sandbox）→ 在已購看到 → 傳送到電郵
  - 已購用戶再打開同一模板：按鈕是「傳送到電腦」，不可以再購買
  - 創作者：上載草稿 → 關閉 App → 重開後草稿仍在 → 提交審核 → 狀態變「審核中」
  - 離線打開已購模板的製作經歷
  - 退款通知 → 存取權被收回
  - 深色模式截圖、網頁版寬螢幕截圖
- 分成和結算的 Edge Function 要有獨立測試，包括退款、部分退款、不同地區抽成。
- 不可以為了令 CI 轉綠而跳過或停用測試；flaky 測試要修正等待條件。

---

## 18. 建置與發佈

1. `app.config.ts` 管理 bundle id、版本號（只改一處）、deep link scheme、universal link 網域。
2. 開發用 development build（`expo-dev-client`），不要依賴 Expo Go（IAP 需要原生模組）。
3. EAS Build 出 iOS（TestFlight）和 Android（`.aab`）；EAS Submit 上載到兩個商店；網頁版另外部署（Vercel／Cloudflare Pages）。
4. 簽名檔、API key、Stripe 和 RevenueCat 密鑰只放 EAS secrets、Supabase secrets 或 CI secrets，不可以 commit，也不可以貼在對話中。
5. EAS Update 只用於修正 bug，不用來推出需要審核的新功能。
6. Google Play 的個人開發者帳戶要先做 closed testing（12 個測試者，連續 14 日）。
7. 送審時附上測試帳戶和說明：App 不在手機上執行下載的程式碼、數碼內容用 IAP 出售。

---

## 19. 起步清單

- [ ] `npx create-expo-app`（TypeScript）→ 加入 Expo Router、Reanimated、Gesture Handler、bottom-sheet、FlashList、TanStack Query、Zustand、MMKV、expo-haptics、expo-blur、expo-image
- [ ] 建立 `src/theme/tokens.ts`（§4、§8）和 `ThemeProvider`
- [ ] 建立 §7 的 UI 元件，每個元件附一個測試
- [ ] 自訂分頁列（§6）和全螢幕搜尋
- [ ] Supabase：資料表、RLS、私有 bucket（§14）；用 MSW 寫好假 API
- [ ] 探索頁 + 模板詳情頁 + 製作經歷頁（先用自己準備的 10–20 個模板做內容）
- [ ] 登入 + 收藏
- [ ] 付款：RevenueCat（價格級別）+ Stripe（網頁）+ webhook 授予存取權
- [ ] 已購 + 傳送到電腦（限時簽名網址）
- [ ] 創作者中心 + 上載精靈 + 掃描 Edge Function
- [ ] 審核後台（§20）
- [ ] Stripe Connect 收款和結算
- [ ] i18n（zh-Hant／en）和書面語測試
- [ ] Maestro 流程：瀏覽 → 購買 → 已購 → 傳送；創作者上載 → 審核 → 上架 → 第一筆銷售
- [ ] 授權條款、退款政策、私隱政策、創作者條款、版權投訴頁

> **上線方式**：第一版直接開放給其他創作者上載和收款，不分期。冷啟動的做法見 §21。

---

## 20. 審核後台（只限管理員）

第一版用網頁版內的 `/admin` 路由（同一套元件，以 Supabase role 限制存取），不另做系統。

| 功能 | 規格 |
|---|---|
| 審核隊列 | 按提交時間排序；顯示自動掃描結果（密鑰、惡意程式、漏洞、大小）；超過 3 個工作天顯示 `warn` |
| 審核頁 | 左邊：截圖、README、檔案樹、製作經歷；右邊：檢查清單（可以運行、截圖真實、授權相容、沒有密鑰、製作經歷完整、沒有抄襲）+ 意見欄 |
| 決定 | 通過／需要修改（必須填意見）／拒絕（必須選原因）；每個決定都會通知創作者並留下紀錄 |
| 檢舉處理 | 檢舉隊列；可以暫停模板（已購用戶仍可存取）、移除評價、停權創作者 |
| 抄襲檢查 | 比對新上載與現有模板的檔案雜湊和相似度；相似度高時標示，由人手判斷 |
| 創作者管理 | 收款設定狀態、累計銷售、退款率、檢舉次數；退款率或檢舉過高時自動標示 |
| 財務 | 待結算金額、已付款紀錄、退款和拒付；結算前可以人手暫停某位創作者的款項 |

- 每個管理操作都寫入 `admin_audit_log`（誰、何時、做了甚麼、原因）。
- 管理帳戶必須開啟兩步驗證。

---

## 21. 冷啟動：開放創作者的上線策略

雙邊市集最大的風險是開張時沒有內容。上線前要先準備好供應方。

### 上線前（約 4–6 星期）
1. **自己先上架 5–10 個模板**（例如記帳 App、查冊 App 的部分系統、遊戲系統），作為品質示範和審核標準。
2. **邀請 10–20 位「創始創作者」**：在 Threads、X、Reddit、連登、Discord 的 indie 開發者和 AI 寫 App 社群中招募；目標是上線當日有 30 個以上已審核模板。
3. **創始創作者優惠**：首 6–12 個月平台抽成降低（例如 10%，之後回到正常 20–30%）、個人頁顯示「創始創作者」徽章、首頁精選位置。
4. **預先審核**：上線前完成所有創始模板的審核，上線當日不會出現大量「審核中」。
5. **等候名單**：買家和創作者分開登記；買家名單用來向創作者證明有需求。

### 上線後
- **品質優先於數量**：寧願少而精；每個分類最少有 3 個模板才在首頁顯示該分類。
- **需求清單**：買家可以提交「想要的模板」並投票，創作者按需求製作。
- **創作者指南**：寫一份「怎樣寫好製作經歷」的範例和模板，降低上載門檻。
- **首批數據**：每星期看轉換率（瀏覽 → 購買）、退款率、審核時間、新創作者數量；退款率高的分類要收緊審核。

### 創作者條款要寫清楚
- 抽成比例和計算方式（扣除 Apple／Google 抽成之後才計分成）
- 結算週期和最低提款金額
- 退款和拒付由誰承擔
- 平台可以下架模板的情況
- 創作者保留版權，平台只獲得展示和分發的授權

### 放進新 repo 的 `CLAUDE.md` 片段

```md
## Product
AppSeed: a marketplace for runnable app source code plus "build stories" (prompts,
architecture decisions, pitfalls, launch steps). React Native + Expo for iOS, Android
and Web. Buyers browse and purchase on mobile, then send the code to their computer.
Creators upload templates (web recommended), pass review, and get paid via Stripe Connect.

## Design
- Every screen follows docs/DESIGN.md: colours, radii, shadows and motion only from
  src/theme/tokens.ts; reuse components in src/components/ui and src/components/template.
- Tap targets ≥44; skeletons instead of full-screen spinners; haptics via lib/haptic.ts;
  respect reduced motion.
- UI copy: all strings in i18n; Chinese UI is written Chinese (書面語). Creator content is exempt.

## Payments & access
- Purchase state comes from the server only; never grant access on the client.
- In-app purchases use fixed price tiers via RevenueCat; web uses Stripe Checkout.
- Revenue split and settlement live in supabase/functions/settlement with tests.
- The mobile app never executes, unzips or loads downloaded code.

## Data & security
- Source code lives in a private bucket; downloads only via short-lived signed URLs.
- All tables use Row Level Security. Never store creators' ID or bank details (Stripe only).
- No ads or third-party tracking SDKs. Secrets never committed.

## Testing
- Every feature ships with Jest tests; user-facing flows also need a Maestro flow.
- Test data uses fictional templates, creators and buyers only.
```

---

## 22. 擴展市集：新作推廣、買斷 App、Prompt 買賣

在原有「模板」之外加入三個市集，同一套 token、元件、動效和測試規則。探索頁頂部用 `SegmentedControl` 切換：**新作推廣｜模板｜Prompt｜買斷 App**（預設「新作推廣」），切換時內容按方向滑入（`DirectionalSwap`）。

### 22.1 新作推廣（AI vibe coding App 展示）

| 項目 | 規格 |
|---|---|
| 目的 | 創作者展示用 AI（Claude Code、Cursor、v0…）做出來的 App，帶動模板和 Prompt 銷售 |
| 排名 | `hotScore = (票數 + 1) / (小時 + 2)^1.5`，新作有公平曝光（`lib/launch.ts`，有測試） |
| 付費推廣 | 最多一個「贊助」位置，固定在第二位，**必須標示「贊助」**，不顯示排名數字 |
| 首頁 | 今日第一名用大卡（hero），其餘從第 2 名開始列出 |
| 推薦 | 每人一票，可取消；樂觀更新（即時變色和數字滾動），伺服器拒絕時還原 |
| 詳情頁 | 製作故事、使用的 AI 工具和日數、試用連結、**相關模板／Prompt**（由推廣導向購買） |
| 動效 | 推薦鍵：箭頭 outline → filled 並向上彈、數字滾動、8 粒粒子向外散開 |

### 22.2 買斷 App（整個 App 轉讓）

| 項目 | 規格 |
|---|---|
| 與模板的分別 | 模板是授權（可賣多次）；買斷是**獨家轉讓**：App（經商店官方轉移）、原始碼、網域、用戶，賣出後下架。**只轉讓 App，不轉讓開發者帳戶**（Apple 帳戶不可轉讓；有收入的個人 Play 帳戶只可逐個 App 轉移） |
| 付款 | **不經 App 內購買**。屬業務轉讓，款項由**持牌托管合作機構**在網頁版處理，AppSeed 不代為持有款項；App 只顯示資料、收報價、說明流程。正式推出前須確認香港相關牌照要求，大額交易附資產買賣及知識產權轉讓文件 |
| 托管流程 | 雙方同意條款 → 買家付款到托管 → 賣家轉移 App、原始碼和網域 → 買家逐項確認交接清單 → 全部確認後放款（`EscrowSteps`，有次序意義所以用編號；`canRelease` 要求清單每項都已確認） |
| 轉移條件 | 上架前檢查（`transferReadiness`）：最少一個版本已正式上架、沒有版本在審核／等待發佈／預購、TestFlight 已關閉，任何一項不符合就不能上架。警告（顯示給買家）：使用 Sign in with Apple 須在轉移後用 Apple 轉移識別碼遷移用戶；沒有用 Play App Signing 須加密交出簽署金鑰。只有網頁版則不涉及商店轉移 |
| 交接清單 | `handoverItems` 按次序列出：App Store 轉移（買家 60 日內接受）→ Sign in with Apple 遷移 → Google Play 轉移（買家提供登記交易編號，約 2 個工作天）→ 簽署金鑰 → 原始碼 → 後端服務 → 收款服務 → 網域 → 社交帳戶 → 最後更換所有密鑰。詳情頁顯示唯讀版本，交易中的買家逐項剔選 |
| 數據 | 每月收入、每月活躍用戶、總下載、叫價、約幾倍年收入（`revenueMultiple`） |
| 收入核實 | 只接受唯讀權限：App Store Connect（銷售報告）、Play Console（財務檢視）、RevenueCat、Stripe，**不接受截圖**。有收入的上架最少要連接一個來源（`needsVerification`）；詳情頁寫明「已透過 … 唯讀權限核實」 |
| 報價 | 最少為叫價一半（`validateOffer`）；步進按叫價大小調整（`offerStep`）；錯誤時數字搖動並提示 |
| 狀態 | 出售中＝`live`、洽談中＝`pending`、已售出＝`ended`；已售出列表沉到底部並蓋上「已售出」印章動畫 |
| 托管費 | 分兩行顯示（§31）：托管機構的托管費（預計，預設買家付）和 AppSeed 佣金（賣家付）；實際由伺服器和托管機構決定 |

### 22.3 Prompt 市集

| 項目 | 規格 |
|---|---|
| 定價 | 固定級別 `PROMPT_TIERS = 0／8／18／38／78`（IAP 不可動態新增商品） |
| 預覽 | 創作者設定免費預覽行數；**伺服器只把完整內容傳給已購用戶**，App 只顯示「購買後顯示其餘 N 行」 |
| 變數 | 用 `{{變數}}` 標示；購買後可逐個填入並「複製完成的 prompt」（`fillPrompt`，未填的保留原樣） |
| 解鎖動效 | 購買成功後，餘下內容以打字機效果逐字出現（減少動態效果時即時顯示） |
| 授權 | 同模板：禁止轉售或公開 prompt 本身 |

### 22.4 上架

創作頁的「上架」按鈕打開 Sheet，四個選項逐個滑入：模板、Prompt、出售整個 App、推廣 App。每個表單都用 `ListingWizard`（進度條、方向滑動、缺欄位時搖動），草稿自動儲存到 MMKV（`useFormDraft`），驗證在 `lib/listing.ts` 並有測試。

### 22.5 已購與搜尋

- 已購分頁：**已購（模板）｜Prompt｜報價｜收藏**；收藏同時支援模板、Prompt 和買斷列表。
- 搜尋可按類型篩選：不限／新作推廣／模板／Prompt／買斷 App；命中字以 `accent` 加粗。

### 22.6 原始碼來源（上架模板和出售 App 共用）

不強制連接 GitHub，但建議使用。`SourcePicker` 提供兩個來源，兩者都要通過同一套上架前檢查：

| 來源 | 規格 |
|---|---|
| 連接 GitHub（推薦） | 以 **GitHub App** 安裝（不用個人 token）：只限創作者揀選的 repo、唯讀、可隨時取消。授權前用 Sheet 清楚列出權限。之後可以用 tag 發佈新版本；買家可以獲邀存取私有 repo；買斷時可以直接轉讓 repo |
| 上載 zip | 只限網頁版。手機顯示提示和「把上載連結寄到我的電郵」，草稿保留 |

**上架前檢查**（`lib/sourceScan.ts`，伺服器實際以 gitleaks、ClamAV、osv-scanner 執行）：

| 檢查 | 結果 |
|---|---|
| 有 README、README 有運行步驟、沒有密鑰或 API key、大小在 200 MB 以內 | 不通過＝**阻止提交**，並顯示修正方法 |
| 有 lockfile、有 LICENSE、偵測到框架（Expo SDK） | 只作建議 |

- 檢查中每項以「呼吸」狀態顯示，結果到達後逐項變成通過／建議／不通過（間隔 180ms），結論在全部顯示後才出現。
- 通過後自動填入技術棧（由 `package.json` 偵測），並顯示買家會看到的檔案樹（只有檔名）。
- 「我的」顯示 GitHub 連接狀態，中斷連接用 ConfirmSheet；已上架的模板不受影響。

---

## 23. 註冊與登入

| 項目 | 規格 |
|---|---|
| 原則 | 未登入可以瀏覽和搜尋；收藏、購買、報價、推薦、上架才要求登入（§11.2）。登入用 Sheet，完成後**自動繼續原本的操作**（`requireAuth(reason, action)`，有測試） |
| 方式 | 以 Apple 繼續、以 Google 繼續、電郵驗證碼。提供 Google 就必須同時提供 Sign in with Apple（App Store 4.8） |
| Apple | iOS 用系統的 Sign in with Apple（`expo-apple-authentication`，`ios.usesAppleSignIn`）；按鈕跟 Apple HIG：淺色模式黑底白字、深色模式白底黑字。Apple 只在第一次登入提供名稱和電郵，電郵可能是「隱藏電郵」轉發地址，要照常使用並標示 |
| 電郵 | 6 位數字驗證碼（同時寄出 magic link）；支援貼上和 iOS 一次性密碼自動填入；錯誤時格子變紅並搖動；30 秒後才可重新寄出 |
| 新帳戶 | 名稱 + 用戶名。用戶名 3–20 字元、小寫英文開頭、只用 a-z 0-9 - _、保留字不可用；即時檢查是否已被使用。建議用戶名由名稱或電郵產生，**不使用 Apple 隱藏電郵**（`lib/auth.ts`，有測試） |
| 完成 | 勾號和擴散圓環動畫，顯示「歡迎／歡迎回來」，Sheet 關閉後繼續原本的操作 |
| 我的 | 已登入顯示頭像、名稱、@用戶名、登入方式；登出和**刪除帳戶**都用 ConfirmSheet（App Store 5.1.1(v) 要求 App 內可刪除帳戶；刪除時伺服器同時撤銷 Apple token） |
| 後端 | Supabase Auth：Apple 用 `signInWithIdToken`、Google 用 OAuth、電郵用 `signInWithOtp`；token 存安全儲存，App 的 session store 只驅動介面 |

---

## 24. 互動數據：讚好、瀏覽、分享、留言、收藏

模板、Prompt、買斷 App、新作四種詳情頁都在主卡下方顯示 `EngagementPanel`（3 × 2 數據格）和分享列，頁尾有 `CommentsSection`。

| 數據格 | 規格 |
|---|---|
| 讚好（心形） | 可以按：心形 outline → filled（`danger` 色）、數字滾動、樂觀更新；需要登入，登入後自動完成。新作用「推薦」代替讚好（同一個推薦狀態） |
| 瀏覽 | 每部裝置每個項目 30 分鐘只計一次（`shouldCountView`），伺服器再按用戶去重 |
| 分享 | 每次交出分享（複製連結、各平台、系統分享）都即時 +1 |
| 留言 | 按下會平滑捲動到留言區 |
| 收藏（書籤） | 與「已購 › 收藏」同一份資料；書籤 outline → filled（`accent` 色）。心形只用於讚好，書籤只用於收藏 |
| 第六格 | 模板／Prompt：衍生作品（引用它的新作數量）；買斷：報價數；新作：製作日數 |

- 數字用簡寫：英文 21.5K、中文 2.2萬（`formatCompact`）；仍然逐位滾動到新值。
- **分享列**：複製連結、X、LinkedIn、Threads、WhatsApp、更多（系統分享），六個按鈕平均分配一行，逐個彈出。分享用公開網址 `https://appseed.app/{t|p|b|l}/{slug}`，沒有安裝 App 的人也可以打開；平台 logo 是字型圖示，LinkedIn 和 WhatsApp 保留品牌色。
- **留言**：未登入時輸入框會先打開登入。新留言從頂部滑入，自己的留言可以刪除（淡出並收起空位）。超過 400 字顯示字數，上限 500 字（`validateComment`）。時間顯示「剛剛／3 分鐘前／5 小時前／2 日前」，一星期後顯示日期。
- 讚好、留言、刪除留言都是樂觀更新，伺服器拒絕時還原。

---

## 25. Apple 風格改版：玻璃、無縫轉場、統一系統

參考 `.claude/skills/landing-page-design`（排版、間距、圓角、底色、文案規則）和 `design-to-motion`（進場曲線、上升 + 模糊）。兩個 skill 原本為網頁而寫，App 只採用通用規則，網頁專用的（例如 hero 版面、SEO）不適用。

**玻璃材質（`src/components/ui/Glass.tsx`）**

- 所有浮在內容上面的東西共用一種材質：分頁列、頂部按鈕、詳情頁頂欄、大標題頂欄、購買／報價列、toast。
- iOS 26 用系統 Liquid Glass（`expo-glass-effect`，按鈕和分頁列可互動）；舊 iOS 用 system chrome 模糊；網頁用 `backdrop-filter: blur(24px) saturate(180%)`；Android 用 96% 不透明底色（軟件模糊太耗效能）。
- 每塊玻璃都有一條 hairline 高光邊（四邊，不用單邊 border）；淺色模式加柔和陰影，深色模式只靠高光邊。
- 網頁注意：玻璃的祖先元素不可以有 `overflow: hidden`＋圓角或 `filter`，否則 backdrop 模糊失效。所以背景頁面只在 sheet 打開時才裁切，`Reveal` 完成後會把 `filter` 清走。

**外殼**

- 分頁列：離底 12pt（或 home indicator 高度）的浮動膠囊，高 64；選中項有一粒會滑動的玻璃膠囊，移動途中橫向拉長再彈回（液態感）。搜尋獨立成右邊的品牌色玻璃圓鈕。
- 購買／報價列同樣是浮動玻璃，圓角 24，內距 8，所以裡面的按鈕圓角是 24 − 8 = 16（同心圓角）。
- 打開 sheet 時，後面整頁縮到 0.94、圓角 24、變暗 15%（iOS card stack），sheet 看起來是同一個表面的上一層。網頁 sheet 用 portal 掛到 `<body>`，不會被縮放困住。

**轉場與動效**

- 區塊進場用 `Reveal`：文字上升 10px、由模糊 4px 變清晰；卡片上升 24px、0.985 → 1、模糊 6px；曲線 `cubic-bezier(0.22, 1, 0.36, 1)`，500–600ms，首三個區塊錯開 60ms。模糊只在網頁執行（CSS filter），iOS／Android 只有上升、淡入和縮放。
- 模板、Prompt、買斷卡片打開詳情頁時用 iOS 18 zoom 轉場（`Link.AppleZoom` → `Link.AppleZoomTarget`）：封面放大成詳情頁的主圖，向右掃返回時縮回原位。Android 和網頁維持一般推入。
- 所有按壓：按下 0.98，放手用彈簧回彈（輕微超出再回到 1）。
- 全部動畫跟隨系統「減少動態效果」。

**統一系統**

- 間距只用 0、2、4、8、12、16、24、32、40、48、64、80、96（`gap` token）；`src/theme/__tests__/tokens.test.ts` 會掃描原始碼，寫死的間距不在表上就失敗。
- 圓角只用 2、4、6、8、12、16、24、全圓；內層圓角 = 外層 − 間距（`nested()`，只在間距 < 32 而結果 > 2 時用）。
- 深色模式底色只用 #000000、#181818、#1F1F1F、#272727。
- 創作者封面的漸層是內容，不算介面背景，所以保留。
- 文案：英文不用連字號和感嘆號，不用填充詞；網頁鍵盤操作有品牌色 focus ring。

---

## 26. 創作者數據報告（參考 App Store Connect）

創作分頁在收入卡下面有「數據報告」概覽卡（最近 7 日瀏覽、讚好、分享和升跌），按下打開 `/studio/analytics`。

| 區塊 | 規格 |
|---|---|
| 期間 | 7 日／30 日／90 日（SegmentedControl）。所有數字都和**之前同樣長度的期間**比較，▲ 綠色、▼ 紅色；之前沒有數據就顯示「—」，不顯示無限大的升幅 |
| 作品 | 「全部作品」或單一已上架作品（Chip）。審核中的作品沒有數據，不列出 |
| 數據格 | 瀏覽、讚好、分享、收藏、留言、銷量（免費作品計「取得」）、收入、轉換率（銷量 ÷ 瀏覽）。按下一格就把下面的圖表換成該項數據，選中格用品牌淡色填滿 |
| 圖表 | 柱狀圖（不用 SVG）：30 日內每日一柱，90 日改為每週一柱，保持手指可以按到。按柱看該段日期和數字；淡線是平均值。轉換率的圖表顯示背後的銷量 |
| 轉換漏斗 | 瀏覽產品頁 → 讚好或收藏 → 購買或取得，顯示佔瀏覽的百分比 |
| 流量來源 | 探索、搜尋、分享連結、創作者頁面、外部網站：一條堆疊長條加圖例，百分比用最大餘數法湊足 100% |
| 分享去向 | 複製連結、WhatsApp、Threads、X、LinkedIn、其他，按數量排序 |
| 按作品 | 只在「全部作品」時顯示，按目前選中的數據排序並顯示佔比；按一列就切換到該作品 |

- 數字來自伺服器的每小時彙總，只有合計數字，不會傳送個別瀏覽者或原始事件；瀏覽沿用 §24 的去重規則（同一裝置 30 分鐘一次）。全部是第一方數據，不用第三方追蹤 SDK。
- 轉換期間或作品時保留舊報告（`placeholderData`），數字直接滾動到新值，不會先變空白。
- 純函數在 `src/lib/analytics.ts`（總數、升跌、轉換率、分桶、百分比、漏斗、排名），有單元測試；Maestro 流程在 `e2e/maestro/analytics.yaml`。

---

## 27. 討論區（參考 Threads）

探索分頁第二個分頁是「討論」（第一個是排行榜，見 §28），讓創作者宣傳自己的 App、分享進度和提問。

| 項目 | 規格 |
|---|---|
| 版面 | Threads 式：左邊頭像欄（有回覆時有直線向下），右邊名稱、相對時間、內文、附上的作品卡、動作列；帖子之間用 hairline 分隔（與文字欄對齊），不用卡片 |
| 動作 | 讚好（心形 → `danger` 色）、回覆、轉發（`live` 色）、分享（系統分享 `https://appseed.app/post/{id}`），全部樂觀更新；讚好、回覆、轉發、發帖都要先登入（`requireAuth`），瀏覽不用 |
| 排序 | 最新、熱門。熱門 = (讚好 + 2×回覆 + 3×轉發 + 1) ÷ (小時 + 2)^1.5（`postScore`），回覆和轉發比讚好重，舊帖慢慢下沉 |
| 發帖 | Sheet：最多 500 字（剩 100 字內顯示字數）、最多 2 條連結、`#標籤` 和連結用品牌色。可附上一個**自己已上架的作品**，帖子會標示「作者作品」，每人每天最多 3 則宣傳帖子（`validatePost`、`promoCountToday`，伺服器再檢查一次）；回覆不可附作品 |
| 討論串 | `/post/[id]`：主帖放大，回覆按時間由舊到新，底部浮動玻璃回覆列 |
| 檢舉 | 「更多」→ 檢舉帖子：帖子即時從檢舉者的動態消失，24 小時內人手審查 |
| 內容 | 帖子屬用戶內容，不受書面語規則限制；介面文字仍然全部經 i18n |

純函數在 `src/lib/posts.ts`（驗證、字數、標籤／連結分段、熱門分數、排序、每日宣傳數）並有單元測試；Maestro 流程 `e2e/maestro/discuss.yaml` 和 `e2e/maestro/buyout-list.yaml`。

---

## 28. 排行榜與推薦演算法

開 App 先見到**排行榜**（探索第一個分頁），第二個是**討論**。兩者都用公開說明的演算法，按「ⓘ」打開說明 Sheet，用一般人看得懂的文字逐點解釋。

**排行榜（`src/lib/ranking.ts`）**

| 步驟 | 規則 |
|---|---|
| 期間 | 今日（24 小時內上架）、本週（7 日）、本月（30 日） |
| 可信度加權 | 有購買或上架紀錄、註冊超過 30 日的帳戶每票計 1，新帳戶計 0.5（`weightedVotes`）；作者自己的票不計 |
| 防刷票 | 超過 40% 票數來自註冊未滿 7 日的帳戶，票數再減半 |
| 互動 | 分數 = 加權票數 + 0.5 × 留言 + 0.3 × 分享（`engagement`） |
| 時間遞減 | (分數 + 1) ÷ (小時 + 2)^g，今日 g = 1.8、本週 1.2、本月不遞減（`boardScore`） |
| 檢舉 | 3 次或以上暫時下榜，人手審查後恢復 |
| 同分 | 留言較多者先，再同分則較早上架者先 |
| 贊助 | 不參與排名；期間內最多一個，固定第二位，標示「贊助」，沒有名次（`sponsoredPick`） |
| 名次變化 | 與 6 小時前的排行比較：▲n 綠色、▼n 紅色、「新」、不變顯示小圓點（`withMovement`） |

**討論「為你推薦」（`src/lib/feed.ts`）**

| 步驟 | 規則 |
|---|---|
| 基礎 | 討論熱度 `postScore`（回覆 ×2、轉發 ×3、按時間遞減） |
| 個人化 | 收藏或購買過的創作者 +0.6；帖子 #標籤與搜尋紀錄相符每個 +0.25（最多 +0.5）；附上作品的種類是你常互動的 +0.2；只用 AppSeed 內的資料，未登入不作個人化 |
| 新帖曝光 | 一小時內的帖子 ×1.5 |
| 降權 | 看過的帖子 ×0.6；被檢舉 3 次或以上 ×0.3 |
| 多樣性 | 同一作者不會連續出現；每三則最多一則宣傳帖子（`diversify`） |
| 自己的新帖 | 10 分鐘內發佈的帖子置頂，讓作者看到帖子已發佈 |

排序選項：為你推薦（預設）、熱門、最新。

---

## 29. 創作者資料與社交連結

- 每個作品（模板、Prompt、買斷、新作）下方都有「關於創作者」卡：頭像、名稱、創始創作者標記、作品數、簡介和社交連結（圓形品牌圖示按鈕，44pt）。按卡片進入創作者主頁，主頁用「圖示 + 用戶名」顯示連結。
- 支援 X、Instagram、GitHub、Threads、LinkedIn、YouTube 和個人網站。在「我的 › 創作者資料」編輯。
- 安全：只儲存用戶名，網址由 App 按平台組合（`socialUrl`），所以連結只可能指向該平台；貼上的網址會檢查網域（`normalizeSocial`，錯誤網站顯示「這不是 GitHub 的網址」）；個人網站必須是 https。伺服器儲存前再檢查一次。簡介最多 160 字。
- 示範資料的社交帳號全部用 appseed demo 前綴，避免指向真實人物。

---

## 30. 上架合規：內容安全、條款、知識產權、付款

送審對照表和備註範本見 `docs/APP_REVIEW.md`。

| 項目 | 規格 |
|---|---|
| 發佈前過濾 | `screenText`：不當字眼（英文和粵語，包括 f*ck、全形字等簡單變形）、站外聯絡及付款（WhatsApp、Telegram、FPS 號碼；電話號碼要有 +852 或「電話／call」等字眼在前，單純 8 位數字如下載量不算）、垃圾訊息（同一字母或感嘆號連續 6 次以上、同一字詞連續 4 次；數字和分隔線不算）。買斷報價留言同樣檢查。發帖 Sheet 輸入時即時提示並停用「發佈」；留言送出前檢查；伺服器再檢查一次，並另有完整分類器 |
| 檢舉 | 帖子、回覆、留言、作品、創作者主頁的「更多」→ 檢舉，須選原因：垃圾訊息、騷擾、色情、暴力、詐騙、侵犯版權、其他。侵犯版權須附說明（20 字以上）和聯絡電郵（`validateReport`）。帖子和留言即時對檢舉者隱藏，24 小時內人手審查 |
| 封鎖 | 同一個 Sheet 封鎖對方；對方的帖子、回覆、留言全部隱藏（`withoutBlocked`），不會通知對方。創作者主頁顯示「你已封鎖這位用戶」並可解除；「我的 › 已封鎖的用戶」列出全部 |
| 條款更新 | 條款改版（`TERMS_VERSION`）後，發帖、回覆、留言或儲存創作者資料前會先顯示「條款已更新」Sheet，同意後繼續原本的動作（`requireTerms`）；伺服器拒絕舊版同意的帳戶發佈內容 |
| 條款 | 註冊最後一步必須勾選「我已閱讀並同意條款與社群守則，包括不容忍不當內容和濫用行為」，可即場展開閱讀；伺服器拒絕沒有同意的註冊。「我的 › 條款／私隱政策」打開 `/terms`：社群守則、知識產權、付款、私隱、聯絡（`src/lib/contact.ts`） |
| 知識產權 | 模板、Prompt、買斷、新作四個上架流程最後一步都要確認擁有權利（`OwnershipAttest`）；作品頁底部「檢舉此作品」是侵權投訴入口 |
| 付費推廣 | 屬 App 內使用的數碼服務，用 IAP（`BOOST_PRODUCT`，HK$38，24 小時） |
| 恢復購買 | 「我的 › 恢復購買」和「已購」空白頁的按鈕：未登入先登入，再同步商店收據並重新讀取伺服器上這個帳戶擁有的項目（`useRestore`）。價格級別是消耗型商品，擁有權記錄在帳戶，所以換裝置和重裝都靠帳戶恢復 |
| 買斷付款 | 只有美國 storefront 顯示「前往網頁版付款」連結（`canLinkOut`）；其他地區只說明到 appseed.app 完成托管付款，不放連結、不寄連結。正式版從 StoreKit／Play Billing 讀 storefront |
| 帳戶切換 | 登入後所有查詢重新載入，購買前再向伺服器確認是否已擁有（`ownsFresh`），避免恢復動作時重複收費；登出或刪除帳戶會清除查詢快取和裝置上的個人資料（封鎖、收藏、搜尋紀錄、已看帖子、草稿）（`store/account.ts`） |

---

## 31. 收費與結算的披露

所有收費集中在 `src/lib/fees.ts`（`FEES`），條款頁、創作頁和買斷畫面都從這裡讀數字，所以披露不會和實際收費不一致。條款頁「收費與結算」一節預設收起在清楚的標題下，按「查看收費詳情」展開；`/terms?section=fees` 直接展開（創作頁「收費與結算說明」和買斷 Sheet「收費詳情」都連到這裡）。

| 項目 | 現行設定 | 誰付 |
|---|---|---|
| AppSeed 分成 | 扣除平台或刷卡手續費後 20%（待確認） | 賣家 |
| Apple／Google | 15%（年收入超過 100 萬美元為 30%） | 在分成前扣除 |
| Stripe 刷卡（網頁） | 約 3.4% + HK$2.35；海外卡另加約 0.5%，另有匯率費 | 在分成前扣除 |
| RevenueCat | 約 1%（每月收入 2,500 美元以上） | AppSeed |
| 結算 | 每月一次；成交 30 日後才可提取；未滿 HK$100 滾存 | — |
| Stripe Connect 轉帳 | 約 0.25% + HK$0.25，從該次結算扣除；其他帳戶月費由 AppSeed 付 | 賣家 |
| 退款 | 已結算訂單退款在下次結算扣回，不足時結轉 | 賣家 |
| 拒付 | Stripe 約 HK$85 由 AppSeed 付；拒付成立則扣回該筆收入 | AppSeed／賣家 |
| 買斷托管費 | 托管機構收取，約 3.25% 起，金額越大比例越低 | 預設買家 |
| 買斷佣金 | 5%，最低 HK$500（待確認），由托管機構在放款時扣除 | 賣家 |
| 改動通知 | AppSeed 調整自己的分成或規則前 30 日通知 | — |

第三方收費是約數，條款寫明以各服務當時公布的價格為準。正式推出前要向 Stripe、RevenueCat 和托管機構確認最新收費，並由律師和會計師審閱。

---

## 32. 付款後台：帳目與結算

程式碼在 `supabase/`：`migrations/20261030000000_payments.sql`（資料庫）、`functions/payments-webhook`、`functions/settlement`，邏輯放在 `functions/_shared`（純 TypeScript，有 Jest 測試）。

**原則**

1. 金額一律用整數（港幣「仙」），比率用基點，不用小數運算。
2. 帳目只可新增（`ledger_entries` 有 trigger 禁止修改和刪除）；更正就寫一筆反向記錄。
3. 每筆記錄有唯一 `source_key`（例如 `sale:<訂單>`、`refund:<訂單>:<退款>`、`payout:<結算>`），所以 webhook 重送或結算重跑都不會重複入帳或重複付款。
4. 用戶只可以經 RLS 讀自己的資料；寫入只在 Edge Function 用 service role 進行。不儲存銀行或身份資料，只存 Stripe Connect 帳戶 ID 和狀態。
5. 伺服器收費表 `_shared/schedule.ts` 和條款用的 `src/lib/fees.ts` 由測試保證一致。

**流程**

| 事件 | 來源 | 結果 |
|---|---|---|
| App 內購買 | RevenueCat `NON_RENEWING_PURCHASE` | App 購買前先建立 `purchase_intents`（價格級別是共用的），webhook 配對後建立訂單；平台費用用 RevenueCat 的實際 take-home，非港幣以美元價和 `HKD_PER_USD` 換算 |
| 網頁購買 | Stripe `checkout.session.completed` | Checkout session 的 metadata 帶 `listing_id`、`buyer_id`；賣家由 `listing_prices` 決定，不信任 metadata |
| 退款 | RevenueCat 退款取消、Stripe `refund.created` | 按比例扣回賣家收入，多次部分退款合計不會超過原本入帳 |
| 拒付 | Stripe `charge.dispute.*` | 開始時暫扣賣家收入；勝訴退回，敗訴維持扣除；拒付手續費由 AppSeed 承擔，不入賣家帳 |
| 帳戶狀態 | Stripe `account.updated` | 更新 `payouts_enabled`；未可收款的賣家餘額保留到可以收款為止 |
| 每月結算 | pg_cron 每月 9 日呼叫 `settlement` | 先完成上次未完成的轉帳，再為每位賣家結算：可提取餘額 ≥ HK$100 才轉帳，扣除轉帳費；`create_payout` 在同一個交易內重新核對餘額並寫入扣數；轉帳失敗會寫回餘額，下次再付 |

銷售收入在成交 30 日後才計入可提取餘額；退款和拒付即時扣除，不足的金額成為負數，從之後的收入扣回。

**部署前要設定的 secrets**：`STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET`、`REVENUECAT_WEBHOOK_SECRET`、`SETTLEMENT_CRON_SECRET`、`HKD_PER_USD`（預設 7.8）。`SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY` 由 Supabase 提供。

**未做**：Stripe Connect 開戶流程（帳戶連結和 App 內狀態）、建立 Checkout session 的函數、買家「已購」存取權（退款後收回）、`listing_prices` 由上架審核寫入。

---

## 33. 真後端：帳戶、內容、已購

程式碼：`supabase/migrations/20261031000000_core.sql`、`supabase/functions/content`、`src/api/remote.ts`。

**切換**：設定 `EXPO_PUBLIC_SUPABASE_URL` 和 `EXPO_PUBLIC_SUPABASE_ANON_KEY`（見 `.env.example`）後，`src/api/backend.ts` 用 Supabase 版本取代示範伺服器中已有真後端的部分；沒有設定時全部照舊用示範伺服器。App 一律從 `@/api/backend` 取得 `api`。

**已接上 Supabase**

| 範圍 | 做法 |
|---|---|
| 登入 | Apple（iOS 用 identity token；網頁用重新導向）、電郵驗證碼、網頁 Google 重新導向；新帳戶經 `content` 建立資料（用戶名規則、內容過濾、條款版本） |
| 創作者資料 | `content` 的 saveProfile：社交連結只存用戶名，網站必須 https |
| 已購 | `my_purchases()`：有效訂單（未全數退款、沒有未解決或敗訴的拒付）加免費領取；恢復購買讀這裡；Prompt 全文只有擁有者和賣家可讀（`prompt_texts` RLS） |
| 討論區 | `post_feed` view；發帖、回覆經 `content`，資料庫原子地檢查條款、每日 3 則宣傳（香港時間午夜重設）、只可附上自己已上架的作品 |
| 留言、讚好、瀏覽、分享 | 留言經 `content`；讚好直接寫入（RLS 只容許自己）；分享只計已登入的人 |
| 檢舉 | 訪客和用戶都可以檢舉；用戶只能以自己名義；IP 投訴必須有描述和電郵；用戶讀不到檢舉 |
| 買斷報價 | 經 `content`：過濾訊息、只可對別人已上架的買斷出價；金額以仙儲存 |
| 刪除帳戶 | 刪除帖子、留言、讚好、封鎖、報價，清空資料，下架作品，停用登入；訂單和帳目保留作會計紀錄 |

**規則只有一份**：伺服器用的 `moderation`、`posts`、`auth`、`socialLinks`、`contact` 由 `node scripts/sync-shared.mjs` 從 `src/lib` 複製到 `supabase/functions/_shared/rules`，測試在兩者不同時失敗。

**仍用示範伺服器**：作品目錄（模板、Prompt、買斷、新作的內容和排行榜計算）、創作中心、GitHub／zip 上載、數據報告、付費購買（免費項目已可領取；付費要接 RevenueCat 和 Stripe Checkout）、封鎖名單同步、Android／iOS 原生 Google 登入、刪除帳戶時撤銷 Apple token。

