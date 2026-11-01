# Stripe 設定：一步一步

照次序做。先全部在 **sandbox（測試環境）** 做好、測試通過，最後才在正式環境（live）重做一次第 2、4 步。Stripe 介面的按鈕名稱間中會改，下面寫的是 2026 年的位置；找不到時用 Dashboard 頂部的搜尋。

**任何金鑰（`rk_…`、`sk_…`、`whsec_…`）都不要貼在對話、程式碼、截圖或 `.env` 入面。**

---

## 第 0 步：準備

- 一個 Supabase project（https://supabase.com → New project，地區揀 Singapore 或 Tokyo）。記下 **Project ref**（Settings → General，例如 `abcdxyz`）。
- 電腦已裝 Node.js。下面的指令在 `projects/appseed`（或新 repo `vcseed`）資料夾內執行。

函數網址的格式：`https://<project-ref>.supabase.co/functions/v1/<函數名>`

## 第 1 步：開 Stripe 帳戶和 sandbox

1. 到 https://dashboard.stripe.com/register 用你的電郵註冊，國家選 **Hong Kong**。
2. 開一個 sandbox：左上角帳戶名稱 → **Sandboxes** → **Create sandbox**，命名 `vcseed-dev`。
3. 之後第 2–6 步都在這個 sandbox 內做（左上角會顯示 sandbox 名稱）。

## 第 2 步：建立 4 條受限金鑰（Restricted keys）

**Developers → API keys → Create restricted key**。每條只開下表的權限，其他保持 None：

| 名稱 | 權限 | 存成 secret |
|---|---|---|
| `vcseed-checkout` | Checkout Sessions：Write | `STRIPE_CHECKOUT_KEY` |
| `vcseed-connect` | Connect（Accounts、Account Links、Login Links，包括 v2 Accounts）：Write | `STRIPE_CONNECT_KEY` |
| `vcseed-connect-read` | Connect Accounts（包括 v2 Accounts）：Read | `STRIPE_CONNECT_READ_KEY` |
| `vcseed-transfers` | Transfers：Write | `STRIPE_TRANSFERS_KEY` |

每建立一條，Stripe 只顯示一次完整金鑰，**即刻做第 3 步把它存入 Supabase**，不要另外抄下。

> 測試時如果某個功能出現 403（permission）錯誤，回來替那條金鑰加上錯誤訊息提到的權限。

## 第 3 步：把金鑰存入 Supabase

在電腦的終端機：

```bash
npx supabase login                       # 瀏覽器會打開，登入 Supabase
npx supabase link --project-ref <project-ref>
npx supabase secrets set STRIPE_CHECKOUT_KEY=rk_test_…      # 逐條貼上第 2 步的金鑰
npx supabase secrets set STRIPE_CONNECT_KEY=rk_test_…
npx supabase secrets set STRIPE_CONNECT_READ_KEY=rk_test_…
npx supabase secrets set STRIPE_TRANSFERS_KEY=rk_test_…
npx supabase secrets set SITE_URL=https://vcseed.app        # 未有網域前可先用網頁版的臨時網址
npx supabase secrets set SETTLEMENT_CRON_SECRET=$(openssl rand -hex 32)   # 每月結算排程用的密碼，自動產生
```

然後部署資料庫和函數：

```bash
npx supabase db push
npx supabase functions deploy checkout connect payments-webhook settlement --no-verify-jwt
```

（`--no-verify-jwt`：payments-webhook 由 Stripe 呼叫，沒有用戶登入；checkout 和 connect 在代碼內用 Supabase Auth 檢查登入，settlement 檢查排程密碼。）

## 第 4 步：建立兩個 webhook

**Developers → Webhooks → Add destination**（又叫 Event destinations）。

**(a) 一般事件** — Payload 選 **Snapshot**，事件：

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `refund.created`
- `charge.dispute.created`
- `charge.dispute.closed`

（創作者帳戶的變化由下面 (b) 的 thin 事件處理，這裏不用加 `account.updated`。）

網址：`https://<project-ref>.supabase.co/functions/v1/payments-webhook/stripe`

建立後打開它，複製 **Signing secret**（`whsec_…`），存入：

```bash
npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_…
```

**(b) Accounts v2 事件** — Payload 選 **Thin**，事件：

- `v2.core.account[requirements].updated`
- `v2.core.account[configuration.recipient].capability_status_updated`

網址：`https://<project-ref>.supabase.co/functions/v1/payments-webhook/stripe-thin`

```bash
npx supabase secrets set STRIPE_THIN_WEBHOOK_SECRET=whsec_…
```

## 第 5 步：設定 Connect（創作者收款）

1. 左邊 **Connect → Get started**。
2. 問你的業務模式時選 **Marketplace**（買家向平台付款，平台再分錢給賣家）。
3. 問誰負責手續費和負結餘時，選 **平台（platform / application）**，並在提示時確認你明白平台要承擔創作者帳戶的負結餘（例如退款或爭議時創作者結餘不足）。
4. **Settings → Connect → Branding**：上載 VCseed icon（`store/android/icon-512.png`），顏色用 `#5B3FD6`，名稱 VCseed。創作者在 Stripe 登記頁會看到。
5. **Settings → Connect → Express dashboard**：保持開啟（創作者用它看收入和改銀行資料）。

> 如果之後建立創作者帳戶時出現 `accounts_v2_access_blocked`，代表你的帳戶未開放 Accounts v2：到 https://support.stripe.com 聯絡 Stripe，說明你是香港 marketplace 平台，要用 Accounts v2 recipient 配置。

## 第 6 步：付款方式和稅

1. **Settings → Payments → Payment methods**：開 Cards、Apple Pay、Google Pay、Link；其他香港常用方式（例如 Alipay、WeChat Pay）按需要開。代碼不會指定付款方式，這裏開甚麼，網頁版結帳就顯示甚麼。
2. **Tax → Registrations / Monitoring**：開啟監察。香港沒有銷售稅，但賣給海外買家的數碼產品累積到一定金額，可能要在當地登記 VAT/GST。未登記前不要開自動計稅。
3. 想付款後自動寄發票 PDF 給買家（Stripe Invoicing，按張收費）：`npx supabase secrets set STRIPE_INVOICES=1`，否則不用設。

## 第 7 步：用測試卡試一次

測試卡（sandbox 才有效）：

| 卡號 | 結果 |
|---|---|
| `4242 4242 4242 4242` | 成功 |
| `4000 0000 0000 9995` | 餘額不足（失敗） |
| `4000 0025 0000 3155` | 要 3D Secure 驗證 |

有效期填任何未來日期，CVC 任何三位數。

檢查清單：

1. 網頁版登入 → 買一個付費模板 → 用 4242 付款 → 返回後「已購」出現該模板。
2. Stripe **Developers → Webhooks** → 剛才的 destination → 事件顯示 `200`。
3. 創作中心 → 設定收款 → 跳到 Stripe 登記頁 → 用 Stripe 提供的測試資料完成 → 返回後顯示「已可收款」。
4. 在 Supabase **Edge Functions → settlement** 手動執行一次（或等每月排程），檢查 Stripe **Connect → Transfers** 有轉帳紀錄。

任何一步失敗，把 Stripe 或 Supabase 顯示的**錯誤訊息**（不是金鑰）貼給 Claude。

## 第 8 步：正式上線

1. Stripe 右上角 **Activate account**：填公司或個人資料、香港銀行戶口、身份證明。
2. 切換到 **live mode**，重做第 2 步（金鑰會是 `rk_live_…`）和第 4 步（網址相同，新的 `whsec_`），再用第 3 步的指令把 live 的值覆蓋到**正式**的 Supabase project（測試和正式最好用兩個不同的 Supabase project）。
3. 在 Settings → Team and security 為 Stripe 帳戶開啟 passkey 或驗證 App 的兩步驗證（不要用短訊）。
4. 有員工離開或懷疑金鑰外洩：**Developers → API keys → Roll key**，再更新 Supabase secret。

---

## 想 Claude 代勞？

你只需要做第 0、1、5、6 步（開帳戶和在 Dashboard 選設定），第 2–4 步和部署可以交給 Claude：腳本 `scripts/stripe-sandbox-setup.mjs` 會用 API 建立兩個 webhook、把 signing secret 和其他 secrets 存入 Supabase、推送資料庫並部署付款函數。它只接受 sandbox 金鑰。

1. 準備四樣東西：
   - **Stripe sandbox 的 Secret key**：在 sandbox 內 Developers → API keys → Secret key（`sk_test_…`）→ Reveal。
   - **Supabase Project ref**：第 0 步記下的。
   - **Supabase access token**：supabase.com → 右上頭像 → Account → Access Tokens → Generate new token。
   - **Supabase 資料庫密碼**：開 project 時設定的密碼（忘記可在 Settings → Database 重設）。
2. 在這個 Claude 對話的標題列打開環境選單 → **Edit**，加入（有 Network secrets 一欄就放那裏，否則放環境變數）：

| 變數名 | 內容 |
|---|---|
| `STRIPE_SANDBOX_SECRET_KEY` | `sk_test_…` |
| `SUPABASE_PROJECT_REF` | Project ref |
| `SUPABASE_ACCESS_TOKEN` | access token |
| `SUPABASE_DB_PASSWORD` | 資料庫密碼 |

3. 開一個新對話（新設定要新對話才讀到），說「繼續 Stripe 設定」。

正式上線（第 8 步）的 live 金鑰仍然由你自己設定，不要放進 Claude 的環境。
