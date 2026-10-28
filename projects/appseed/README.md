# AppSeed · Vibe coding incubator

依照 [`docs/DESIGN.md`](docs/DESIGN.md) 實作的 Expo（SDK 58）App：iOS、Android、Web 同一份程式碼。
目前是**前端第一版**：資料來自 `src/api/mockServer.ts` 的虛構模板，付款為模擬流程，尚未接上 Supabase／RevenueCat／Stripe。

## 已完成

> 第 22 節擴展：**新作推廣**（AI vibe coding App 展示和推薦排名）、**買斷 App**（整個 App 轉讓、報價、托管流程）、**Prompt 市集**（預覽、購買解鎖、變數填寫）。規則見 [`docs/DESIGN.md` §22](docs/DESIGN.md)。上架模板和出售 App 時可以連接 GitHub（推薦）或在網頁版上載 zip，兩者都要通過上架前檢查（§22.6）。註冊和登入支援 Apple、Google 和電郵驗證碼，需要帳戶的操作會先打開登入 Sheet，完成後自動繼續（§23）。每個詳情頁都有讚好、瀏覽、分享、留言、收藏數據和分享列（§24）。

| 範圍 | 內容 |
|---|---|
| 外殼 | 自訂分頁列（iOS 模糊、Android／Web 94% 底色）、浮起的漸變搜尋鍵、大標題捲動收起、下拉重新整理 |
| 畫面 | 探索、全螢幕搜尋（篩選 Sheet、搜尋紀錄、命中字高亮）、模板詳情（概覽／製作經歷／檔案／評價／版本）、製作經歷閱讀頁（進度條、目錄、記住位置）、已購／收藏、創作者中心、上載精靈（5 步、草稿自動儲存）、創作者頁、我的 |
| 元件 | §7 全部元件：TemplateCard、TemplateHero、MediaCarousel、PromptBlock、StoryStep、FileTree、ReviewRow、VersionTimeline、StickyCTA、Sheet、ConfirmSheet 等 |
| 狀態 | TanStack Query（伺服器狀態，「已購」只由伺服器決定）、Zustand + MMKV（收藏、搜尋紀錄、設定、上載草稿） |
| 多語言 | zh-Hant／en，key 有型別；書面語由測試檢查 |

## 上架合規（§30，`docs/APP_REVIEW.md`）

- 發佈前內容過濾、檢舉（須選原因）、封鎖用戶、已封鎖名單
- 註冊須同意條款與社群守則；條款頁有知識產權投訴方法和聯絡電郵
- 上架須確認版權；付費推廣用 App 內購買；買斷只在美國 storefront 連出網頁付款

## 排行榜與演算法（§28）

- 開 App 先見排行榜（今日／本週／本月），再到討論；名次變化 ▲▼
- 排行榜：可信度加權、防刷票、留言和分享加分、按期間遞減；討論「為你推薦」：個人化、新帖曝光、多樣性
- 兩者都有「ⓘ」說明 Sheet

## 創作者資料（§29）

- 每個作品下方有創作者卡，連 X、Instagram、GitHub、Threads、LinkedIn、YouTube、網站
- 只存用戶名，網址由 App 組合，防止假連結

## 討論區（§27）

- 探索第一個分頁：Threads 式帖子，讚好、回覆、轉發、分享、檢舉；最新／熱門排序
- 可附上自己的作品宣傳，標示「作者作品」，每天最多 3 則

## 買斷轉移（§22.2）

- 只轉讓 App（App Store／Google Play 官方轉移），不轉讓開發者帳戶
- 上架前檢查轉移條件；收入只用唯讀權限核實；交接清單全部確認後才放款

## 創作者數據報告（§26）

- 參考 App Store Connect：7／30／90 日、按作品篩選、8 個數據格（瀏覽、讚好、分享、收藏、留言、銷量、收入、轉換率）連升跌
- 可以按的柱狀圖、轉換漏斗、流量來源、分享去向、按作品分佈；只顯示彙總數字

## Apple 風格（§25）

- Geist 字體、Tailwind 字級、純黑深色模式、同心圓角、固定間距表（測試會檢查）
- 共用玻璃材質：浮動膠囊分頁列、頂部按鈕、頂欄、購買列、toast（iOS 26 用 Liquid Glass）
- 打開 sheet 時背景頁面縮後；卡片用 iOS 18 zoom 轉場打開詳情頁；區塊以「上升 + 模糊」進場

## 動效（§8）

所有數值集中在 `src/theme/tokens.ts` 的 `motion`，全部在 UI thread 執行，並跟隨系統「減少動態效果」。

**全 App 不用 SVG。** 圖示是 Phosphor 字型（regular + fill），全部經 `src/components/ui/Icon.tsx`：

- 每個圖示由 0.4× 彈性進場，可以用 `enterDelay` 錯開（例如評分星星逐粒出現）
- 狀態改變時 outline → filled 縮放交叉變形（分頁、收藏、資料夾展開、已購）
- 狀態改變時播放 `pop`／`wiggle`／`spin`／`nudge`／`bounce`（返回鍵向左推、設定齒輪轉一圈、警告搖一搖）
- `loop="breathe"／"spin"` 用於鎖定內容和空白狀態
- 載入一律用 `Spinner`（三粒跳動圓點），開 App 時顯示彈出的品牌標誌
- 封面的手機畫面以彈性升起，介面方塊逐個出現；時間軸直線向下畫出；標籤、要點逐個彈入
- `src/components/ui/__tests__/icon.test.tsx` 會在 SVG 套件或 import 重新出現時失敗

- **頁面進場**：區塊淡入上移 10px，第 2、3 個區塊延遲 80ms（`enterAt`）
- **切換分頁／分段**：按方向從左或右滑入 18px（`tabEnterOffset`，有單元測試）
- **分頁圖示**：選中時 1 → 1.18 → 1 彈性；**收藏**心形 1 → 1.3 → 1 並填色
- **購買成功**：StickyCTA 由品牌紫 600ms 過渡到 `live` 綠，勾號彈入，之後變成「傳送到電腦」
- **按下**：所有可點擊元素縮放至 0.97（`PressableScale`）
- **SegmentedControl**：滑塊跟隨選項滑動；**Chip**：顏色漸變而非瞬間切換
- **MediaCarousel**：截圖隨捲動縮放淡出，指示點拉長成膠囊；精選卡片有景深效果
- **數字**（收入、可提取金額）480ms 滾動；**銷售圖表**由左至右逐條長出
- **列表**：新增／刪除用 rowIn／rowOut，一次超過 3 項不播逐項動畫
- **骨架 → 內容**：同尺寸交叉淡入，版面不跳動

## 開始

```bash
npm install
npm test             # 141 個測試
npm run typecheck
npm run web          # 瀏覽器預覽
npm run preview:pack # 打包成單一 HTML 預覽頁（dist/appseed-preview.html）
npx expo run:ios     # development build（MMKV、IAP 需要原生模組，不支援 Expo Go）
```

## 已知限制

- `@gorhom/bottom-sheet` 的 modal 在 react-native-web 上不會掛載，所以網頁版使用 `Sheet.web.tsx`（相同 API、token 和曲線）；iOS／Android 仍用 gorhom。
- Reanimated 在網頁版的 layout animation 不支援自訂 bezier，會退回 linear；原生平台不受影響。
- Reanimated 4.7 網頁版會在自訂起始值（`withInitialValues`／`Keyframe`）的進場動畫結束後，把元素設為 `position: absolute`，令版面重疊。所以網頁版經 `startFrom()` 改用預設動畫，原生平台照用自訂起始值。
- 登入目前是模擬：Apple 在 iOS 會用系統的 Sign in with Apple，其他平台和 Google 是示範帳戶；電郵驗證碼固定為 123456（畫面會標示「示範模式」）。
- GitHub 授權、repo 列表和掃描目前是模擬；真正接入需要 GitHub App 和伺服器端掃描（Edge Function）。
- 未有後端：登入、付款、傳送到電腦、檢舉均為模擬；Maestro 流程（`e2e/maestro/`）已寫好，需要在模擬器上執行。
- 封面為漸變佔位圖，創作者上載真實截圖後改用 `expo-image` + blurhash。
