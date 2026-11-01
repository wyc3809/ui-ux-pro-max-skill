# 商店素材

全部由腳本產生（docs/BRAND.md §7），不要手改。文案在 `listing.json`（App Store 和 Google Play，繁體中文和英文），`brand/__tests__/brand.test.ts` 會檢查字數上限和圖片規格。

## App Store Connect

| 欄位 | 檔案 | 規格 |
|---|---|---|
| App icon | `ios/app-icon-1024.png`（EAS build 會用 `assets/icon.png` 自動放入，通常不用另外上載） | 1024 × 1024，PNG，不透明 |
| iPhone 6.9" 截圖 | `ios/<語言>/iphone-6.9/01–06.png` | 1320 × 2868，6 張（Apple 會自動縮放到較小的 iPhone） |
| iPad 13" 截圖 | `ios/<語言>/ipad-13/01–06.png` | 2064 × 2752，6 張（`supportsTablet` 開啟，所以必須提供） |
| App Preview | `ios/<語言>/app-preview-6.9.mp4` | 886 × 1920，19.8 秒，H.264 30fps，立體聲 AAC（靜音） |
| 名稱、副標題、推廣文字、關鍵字、描述 | `listing.json` → `appStore` | 30 / 30 / 170 / 100 / 4000 字 |

上載：App Store Connect → App → 你的版本 →「App 預覽和截圖」，先選語言（繁體中文（香港）、英文），把對應資料夾的圖按次序拖入。

## Google Play Console

| 欄位 | 檔案 | 規格 |
|---|---|---|
| App icon | `android/icon-512.png` | 512 × 512，PNG |
| 主題圖片 | `android/<語言>/feature-graphic.png` | 1024 × 500，不透明 |
| 手機截圖 | `android/<語言>/phone/01–06.png` | 1080 × 1920 |
| 標題、簡短說明、完整說明 | `listing.json` → `googlePlay`（完整說明與 App Store 描述相同） | 30 / 80 / 4000 字 |

宣傳影片在 Google Play 是 YouTube 連結：可以把 `ios/<語言>/app-preview-6.9.mp4` 上載到 YouTube（不公開），再貼上連結。

## 品牌影片

`video/brand-intro.mp4`（1080 × 1080，60fps）和 `video/brand-intro.gif`：社交媒體、網站、簡報用。

## 截圖次序與文案

| # | 畫面 | 標題（繁中 / English） |
|---|---|---|
| 1 | 排行榜 | 每日新作排行榜 / Today's top launches |
| 2 | 類別頁（遊戲） | 每個類別都有自己的榜 / A leaderboard for every category |
| 3 | 模板頁 | 買下可運行的原始碼 / Buy runnable source |
| 4 | Prompt 頁 | Prompt 先看再買 / Prompts that work |
| 5 | 討論 | 和同路人一起交流 / Build together |
| 6 | 所有類別 | 由一句 prompt 到上架 / From one prompt to the App Store |
