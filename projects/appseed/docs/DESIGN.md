# App 原型市集 App：設計與手感藍圖

> 用途：放在新 repo 的 `docs/DESIGN.md`，並在 `CLAUDE.md` 寫明「所有 UI 必須跟從 docs/DESIGN.md」。
> 手感、數值和規則沿用 WorthBook 及「香港公司查冊 App」藍圖（同一位作者），以 **React Native + Expo** 實作，一份程式碼出 iOS、Android 和網頁版。
> 產品（暫名 **AppSeed**，可換）：創作者上載**可運行的 App 原始碼**和**製作經歷**（用過的 prompt、架構決定、踩過的坑、上架步驟），其他人付費取得，用作自己 App 的起點，再用 Claude Code 等 AI 工具修改。

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
| 字體 | DM Sans；代碼用 JetBrains Mono；中文用系統字（PingFang／Noto Sans CJK） | |
| 圖示 | lucide-react-native（stroke 2，選中時 2.4） | |
| 圖表（少量） | react-native-svg + victory-native | 只用於創作者銷售統計 |
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

所有顏色只能從 token 取用，**元件內不可寫死色碼**。中性色沿用 WorthBook；品牌色由信任藍改為**創作紫**（可以換，換後重新檢查對比度）。

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

| 用途 | 樣式 |
|---|---|
| 分頁大標題 | 30，800，`letterSpacing: -0.9` |
| 模板名稱（hero） | 22–24，800，最多 2 行 |
| 一句話簡介（hero） | 15，500，`fgMuted`，最多 2 行 |
| 區塊標題 | 16，700 |
| 眉標（區塊上方小字） | 11，700，全大寫，`letterSpacing: 1.5`，`fgSubtle` |
| 內文 | 14／行高 20；製作經歷長文用 16／行高 26 |
| 代碼、prompt、檔案樹 | JetBrains Mono 13／行高 20，`bgCode` 底 |
| 價錢 | 18，800，`tabular-nums` |
| 輔助文字 | 12，`fgSubtle` |
| 分頁列標籤 | 11，700 |

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
