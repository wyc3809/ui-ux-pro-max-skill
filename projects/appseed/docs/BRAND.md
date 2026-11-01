# VCseed 品牌守則

**VCseed**：VC 是 Vibe Coding，也帶出創投孵化的意思；seed 是種子。副題「Vibe coding incubator」在所有語言都一樣（i18n `brand`）。

這份守則是唯一標準。每一張品牌圖都由 `brand/src/mark.js` 畫出來，再由腳本輸出；**不要手畫、不要另外修圖**。要改設計就改 `mark.js`，然後重新輸出。`brand/__tests__/brand.test.ts` 會檢查尺寸、格式和顏色。

## 1. 標誌：玻璃雙葉

兩片半透明玻璃葉在底部交叉，砌成一個 V。紫葉在左、綠葉在右；兩葉重疊的地方透出光。

- 幾何在 1024 × 1024 格上（`LEAVES`）：左葉由 (540, 792) 到 (250, 228)，右葉由 (484, 792) 到 (774, 228)，飽滿度 0.85；兩莖交叉點 (512, 792) 是動畫的支點。
- 每片葉都有四層：下方同色光暈、由葉尖到葉底的漸變、上方光澤、白色邊光（38%）。
- 重疊區用「光」色（`BRAND.light`），是玻璃交疊透光的效果。
- 參考過：Apple 系統 App（iOS 26 Liquid Glass）、Linear、Raycast。查過名稱和圖形，暫時沒有找到同名 App 或相近的科技品牌標誌；最接近的是素食標誌 V-Label（一個 V 加一片葉，已註冊商標），而我們的是兩片對稱的葉、沒有 V 的筆畫，顏色也不同。正式註冊商標前，應請律師在香港知識產權署、USPTO 和 EUIPO 做檢索。

**不可以**：改葉子的比例或角度、加第三片葉、拉長或壓扁、加描邊或文字在標誌內、換成其他顏色、把標誌放在淺色漸變或照片上（只放在墨色底，或 App 的 `bg` 上）、做立體或擬物效果。

## 2. 顏色

| 名稱 | 值 | 用途 |
|---|---|---|
| 墨色 Ink | #1C1C22 → #08080A（由上至下） | Icon 底、商店圖底、影片底 |
| 紫 Violet | #B29BFF → #5B3FD6 | 左葉；#5B3FD6 就是 App 的 `accent` |
| 綠 Mint | #A6F7D3 → #16B577 | 右葉；商店圖標題的重點字 |
| 光 Light | #F1EDFF → #D2FBEA | 兩葉重疊處 |
| 白 | #FFFFFF | 文字、單色 icon |

品牌圖只用這五種顏色，加上由它們變出來的透明度。不要用其他顏色做點綴。

## 3. 字體

Geist（與 App 一致）：標題 700、副標題 500。中文跟系統字型（蘋方／思源黑體）。標題重點字用綠色漸變（`<em>`），每個標題最多一處重點。

## 4. 版本

| 檔案 | 用途 |
|---|---|
| `assets/icon.png` | App Store / iOS 主 icon，1024，不透明 |
| `assets/icon-dark.png`、`icon-tinted.png` | iOS 18+ 深色、染色主畫面（透明底，系統加底色） |
| `assets/android-icon-*` | Android adaptive icon（前景在 66dp 安全圈內）、Android 13+ 主題 icon |
| `assets/splash-icon.png` | 開機畫面（淺色 #F5F5F7、深色 #000000 底） |
| `assets/brand/*.png` | App 內動畫用的三層（左葉、右葉、重疊光），疊起來就是完整標誌 |
| `public/*` | 網站 favicon、apple-touch-icon、192/512 icon、OG 分享圖 |
| `store/*` | 商店素材（見 store/README.md） |

## 5. 動態

品牌動畫只有一種（`markAt`，1.6 秒）：兩片葉由交叉點長出，先合起像一粒種子，再以輕微回彈打開成 V；然後重疊處亮起，一道光澤掃過玻璃。

- **App 載入頁**（每次開 App）：系統開機畫面只有背景色（淺色 #F5F5F7、深色 #000000，與 App 的 `bg` 相同），`LaunchMark` 在同一個顏色上接手：標誌由種子長出、打開成 V，0.7 秒後 VCseed 和副題浮現；整段 1.9 秒播完、而且字型已載入，才淡出到 App（`Intro`，`src/app/_layout.tsx`）。App 在下面同時載入，所以不會多等。開了「減少動態效果」就直接顯示完成的標誌，0.6 秒後淡出。
- 影片：`store/video/brand-intro.mp4`（1080²，60fps）和 GIF；App Preview 以同一段開場。
- 不要另外設計其他標誌動畫（旋轉、彈跳、閃爍等）。

## 6. 商店圖

- 墨色底，左上紫色光暈、右下綠色光暈。
- 上方置中：標題（Geist 700，白色，一處綠色重點）＋一行副標題（白色 62%）。第一張在標題上方放標誌和 VCseed 字樣。
- 下方：App 的真實畫面（深色模式、示範資料），大圓角、細白邊光和紫色光暈；iPhone 和 Android 的畫面略為超出底部。
- 不用手機外框、不加貼紙、箭嘴或其他插圖；文案寫清楚一個好處。

## 7. 輸出

```bash
npm run brand:export   # icon、各版本、商店 icon 和橫幅、App 內圖層、品牌影片
npx expo export -p web && npx serve dist -l 8099   # 截圖用的網頁版（任何靜態伺服器都可以）
npm run brand:shots    # 影 App 畫面 → 商店截圖（iPhone 6.9"、iPad 13"、Android）和 App Preview
```
