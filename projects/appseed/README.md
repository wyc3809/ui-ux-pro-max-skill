# AppSeed（原型市集）

依照 [`docs/DESIGN.md`](docs/DESIGN.md) 實作的 Expo（SDK 58）App：iOS、Android、Web 同一份程式碼。
目前是**前端第一版**：資料來自 `src/api/mockServer.ts` 的虛構模板，付款為模擬流程，尚未接上 Supabase／RevenueCat／Stripe。

## 已完成

| 範圍 | 內容 |
|---|---|
| 外殼 | 自訂分頁列（iOS 模糊、Android／Web 94% 底色）、浮起的漸變搜尋鍵、大標題捲動收起、下拉重新整理 |
| 畫面 | 探索、全螢幕搜尋（篩選 Sheet、搜尋紀錄、命中字高亮）、模板詳情（概覽／製作經歷／檔案／評價／版本）、製作經歷閱讀頁（進度條、目錄、記住位置）、已購／收藏、創作者中心、上載精靈（5 步、草稿自動儲存）、創作者頁、我的 |
| 元件 | §7 全部元件：TemplateCard、TemplateHero、MediaCarousel、PromptBlock、StoryStep、FileTree、ReviewRow、VersionTimeline、StickyCTA、Sheet、ConfirmSheet 等 |
| 狀態 | TanStack Query（伺服器狀態，「已購」只由伺服器決定）、Zustand + MMKV（收藏、搜尋紀錄、設定、上載草稿） |
| 多語言 | zh-Hant／en，key 有型別；書面語由測試檢查 |

## 動效（§8）

所有數值集中在 `src/theme/tokens.ts` 的 `motion`，全部在 UI thread 執行，並跟隨系統「減少動態效果」。

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
npm test             # 38 個測試
npm run typecheck
npm run web          # 瀏覽器預覽
npx expo run:ios     # development build（MMKV、IAP 需要原生模組，不支援 Expo Go）
```

## 已知限制

- `@gorhom/bottom-sheet` 的 modal 在 react-native-web 上不會掛載，所以網頁版使用 `Sheet.web.tsx`（相同 API、token 和曲線）；iOS／Android 仍用 gorhom。
- Reanimated 在網頁版的 layout animation 不支援自訂 bezier，會退回 linear；原生平台不受影響。
- 未有後端：登入、付款、傳送到電腦、檢舉均為模擬；Maestro 流程（`e2e/maestro/`）已寫好，需要在模擬器上執行。
- 封面為漸變佔位圖，創作者上載真實截圖後改用 `expo-image` + blurhash。
