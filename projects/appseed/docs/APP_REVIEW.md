# App Review 準備清單（AppSeed）

送審前逐項核對。指引會變，送審前請再讀一次 Apple 的 [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) 和 Google Play 的開發者政策。

## 指引對照

| 指引 | 要求 | AppSeed 的做法 | 位置 |
|---|---|---|---|
| 1.2 用戶內容 | 發佈前過濾不當內容 | 帖子、留言、創作者名稱和簡介發佈前檢查（不當字眼、站外聯絡及付款、垃圾訊息），伺服器再檢查一次 | `src/lib/moderation.ts` `screenText` |
| 1.2 用戶內容 | 檢舉並及時處理 | 每則帖子、回覆、留言、作品、創作者主頁都可以檢舉，須選原因；24 小時內人手審查；檢舉者即時看不到該內容 | `ModerationSheet` |
| 1.2 用戶內容 | 封鎖濫用用戶 | 同一個 Sheet 可以封鎖；被封鎖者的帖子、回覆、留言全部隱藏；「我的 › 已封鎖的用戶」可以解除 | `src/store/blocks.ts`、`BlockedSheet` |
| 1.2 用戶內容 | 條款寫明不容忍不當內容、公開聯絡方法 | 註冊時必須勾選同意條款與社群守則；「我的 › 條款」顯示守則、知識產權投訴方法和聯絡電郵 | `src/app/terms.tsx`、`src/lib/contact.ts` |
| 2.5.2 程式碼 | 不可下載或執行改變 App 功能的程式碼 | 原始碼只會傳送到用戶電腦，App 從不在裝置上解壓、載入或執行 | `CLAUDE.md` Payments & access |
| 3.1.1 App 內購買 | 數碼內容和 App 內使用的服務須用 IAP | 模板、Prompt、付費推廣全部用固定價格級別的 IAP（RevenueCat） | `src/lib/price.ts`、`BOOST_PRODUCT` |
| 3.1.1 恢復購買 | 可以恢復已購買的內容 | 「我的 › 恢復購買」和「已購」空白頁都有按鈕；未登入會先登入，然後同步商店收據並重新讀取伺服器上這個帳戶擁有的項目 | `src/components/account/useRestore.ts` |
| 3.1.1 IAP 類型 | 永久解鎖的內容通常用非消耗型 | 模板和 Prompt 數以千計，每件開一個商品不可行，所以用固定價格級別的消耗型商品；購買必須登入，擁有權記錄在帳戶，換裝置或重裝都可以經帳戶恢復 | 見下面送審備註 |
| 3.2.2 第三方 App 目錄 | 不可做類似 App Store 的第三方 App 介面 | 「新作推廣」是社群介紹和討論（類似 Product Hunt）：不提供下載或安裝，連結只去官方 App Store／Google Play 頁面或開發者網站 | `src/app/launch/[slug].tsx` |
| 3.1.1(a) / 3.1.3 外部付款 | 只有美國 storefront 可以連到外部網站付款 | 買斷屬業務轉讓，經持牌托管在網頁付款；只有美國 storefront 顯示「前往網頁版付款」連結，其他地區只說明到網頁完成，不放連結、不寄連結 | `src/lib/storefront.ts` |
| 4.8 登入服務 | 提供第三方登入時要有 Sign in with Apple | Apple、Google、電郵；Apple 在最上面 | `AuthSheet` |
| 5.1.1(v) 刪除帳戶 | App 內可以刪除帳戶 | 我的 › 刪除帳戶（同時撤銷 Apple token） | `src/app/(tabs)/me.tsx` |
| 5.1.2 私隱 | 不追蹤則不用 ATT | 沒有第三方追蹤或廣告 SDK；推薦只用 App 內收藏、購買、搜尋 | §26、§28 |
| 5.2 知識產權 | 不可侵權，要有處理機制 | 每個上架流程最後一步必須確認擁有權利；作品頁有「檢舉此作品」，知識產權投訴須附說明和聯絡電郵 | `OwnershipAttest`、`validateReport` |

## 送審備註（App Review Information › Notes）範本

> AppSeed is a marketplace where developers sell runnable app source code (templates), AI prompts and build stories, and where makers promote apps they built.
>
> - Templates, prompts and launch boosts are digital content and use In-App Purchase only.
> - Source code is delivered to the buyer's computer. The app never downloads, unzips, loads or executes code on device (Guideline 2.5.2).
> - "Buy the whole app" is a sale of a business (the app's store listing is moved with App Store Connect's official app transfer, plus domain and backend). Payment goes through a licensed third party escrow on our website; the app only shows listings and takes offers. Outside the US storefront the app does not link to external payment.
> - In-App Purchase types: templates and prompts are sold with a small set of fixed price tiers configured as consumable products, because the catalogue has thousands of creator listings and one product per listing is not workable. Buying requires an account; ownership is stored on our server per account, never on the device. "Restore Purchases" (Me › Restore Purchases, and on the empty Library screen) signs in, syncs store receipts and reloads everything the account owns, so purchases survive new devices and reinstalls.
> - Launches are a community showcase and discussion of apps people built (similar to Product Hunt). AppSeed does not distribute, download or install apps; links go to the official App Store or Google Play page, or the maker's website.
> - User generated content: posts, replies, comments and profiles are screened before publishing, every item can be reported with a reason, users can be blocked, and reports are reviewed within 24 hours. Users must accept the terms (zero tolerance for objectionable content) to create an account.
> - Demo account: (fill in) / one time code 123456 in the review build.

## 如果審核員有意見

| 意見 | 應對 |
|---|---|
| 永久內容不應該用消耗型 IAP | 先回覆說明（數以千計的作品、帳戶恢復）；仍不接受就把最常用的價格級別改為每件作品一個非消耗型商品，`purchase_intents` 和結算不用改 |
| 新作推廣像 App 目錄 | 說明不提供下載；需要時把「前往 App Store」按鈕改為只在詳情頁底部的文字連結 |
| 買斷應該用 IAP | 說明這是業務轉讓（App Store Connect 官方轉移、域名、後端），由持牌托管處理；仍不接受就從 `src/lib/storefront.ts` 的 `LINK_OUT` 移除 `US`，iOS 全部地區只保留出價，付款只在網頁 |

## 送審前要做

- [ ] `src/lib/contact.ts` 換成真實的支援和知識產權電郵，並確保有人處理
- [ ] 審核後台可以在 24 小時內處理檢舉、移除內容和停用帳戶
- [ ] 伺服器端內容分類器（`screenText` 只捕捉明顯個案）
- [ ] 在 App Store Connect 建立 IAP 商品（模板、Prompt 價格級別、`launch_boost_24h`）
- [ ] 私隱營養標籤：電郵、名稱、用戶內容、購買紀錄；不用於追蹤
- [ ] 托管合作機構合約，以及香港相關牌照的法律意見
- [ ] 準備示範帳戶和示範資料：至少一件已購模板、一個已購 Prompt、一則帖子，讓審核員看到「恢復購買」和已購內容
- [ ] 伺服器的買家已購清單（恢復購買讀取的資料，退款後收回）
- [ ] 用 sandbox 帳戶在新裝置測試「恢復購買」
