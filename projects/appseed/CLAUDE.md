# CLAUDE.md

## Product
VCseed (subtitle "Vibe coding incubator", same in every language via i18n `brand`): a marketplace for runnable app source code plus "build stories" (prompts,
architecture decisions, pitfalls, launch steps). React Native + Expo for iOS, Android
and Web. Buyers browse and purchase on mobile, then send the code to their computer.
Creators upload templates (web recommended), pass review, and get paid via Stripe Connect.

## Design
- Every screen follows docs/DESIGN.md: colours, radii, shadows and motion only from
  src/theme/tokens.ts; reuse components in src/components/ui and src/components/template.
- Motion: layout presets live in src/theme/animations.ts, direction/stagger rules in
  src/lib/motion.ts. Every animation passes `ReduceMotion.System`.
- Apple-style system (docs/DESIGN.md §25): Geist only (max weight 700), Tailwind type steps, spacing only
  from the `gap` scale (a test scans source), radii on the Tailwind steps with `nested(outer, gap)` for
  inner corners, dark surfaces #000/#181818/#1F1F1F/#272727. Floating surfaces use `Glass`; section
  entrances use `Reveal`; cards that open a detail page use `ZoomLink` + `ZoomTarget`.
- No SVG anywhere (no react-native-svg / lucide). Icons are the Phosphor font via
  src/components/ui/Icon.tsx, which animates every glyph (outline↔filled morph, enter pop,
  replayed motion on state change). Loading = `Spinner`, never ActivityIndicator.
  A test fails if an SVG dependency or import comes back.
- Tap targets ≥44; skeletons instead of full-screen spinners; haptics via lib/haptic.ts;
  respect reduced motion.
- UI copy: all strings in i18n; Chinese UI is written Chinese (書面語). Creator content is exempt.

## Markets (docs/DESIGN.md §22)
- Four markets share one design system: templates, prompts, whole-app buyouts, launches. Version 1 ships with
  buyouts off (`FEATURES.buyouts` in src/lib/features.ts, synced to the server): every buyout entry point must
  check it, so turning the flag on restores the market in one place.
- Buyouts are business transfers paid via a licensed escrow partner on the web, never IAP; the app only
  takes offers. Sell the app (official App Store / Play transfer), never the developer account. Listings
  must pass lib/transfer.ts readiness checks, revenue is verified only from read access (never screenshots),
  and escrow releases only when every hand-over item is confirmed (§22.2).
- Prompt full text is only sent to owners by the server; the client shows preview + locked count.
- Sponsored launches must be labelled 贊助 and never carry an organic rank.
- Source code comes from a GitHub App install (read-only, chosen repos) or a web zip upload;
  both pass lib/sourceScan.ts checks and any failed check blocks submission (§22.6).

## Leaderboard & ranking (docs/DESIGN.md §28)
- Explore opens on the leaderboard, then Discuss. Ranking lives in lib/ranking.ts (trust-weighted votes,
  vote-ring halving, period decay, reports, unranked sponsored slot); For you lives in lib/feed.ts. Every
  ranking surface has an ⓘ sheet explaining it in plain language; keep the sheet in sync with the code.

## Categories (docs/DESIGN.md §40)
- Categories come only from lib/categories.ts (synced to the server): the App Store's own top-level list plus vibe coding
  categories, each under one App Store parent. Listings need a primary category, may add one secondary.
- Every category has its own leaderboard: filter with `inCategory`, then rank with the normal `buildLeaderboard`, never a
  separate formula. An App Store category's board includes its vibe children. Labels live in i18n `category.<key>`.

## Creator profiles (docs/DESIGN.md §29)
- Every listing shows a CreatorCard with social links. Store bare handles and build URLs with
  lib/socialLinks.ts so a link can only point at its network; websites must be https.
- Demo data uses fictional handles with an vcseed demo prefix.

## Discussion (docs/DESIGN.md §27)
- Threads-style feed is the second Explore hub. Posting, liking, replying and reposting need sign-in.
- A post may attach one of the author's own live listings and is then labelled 作者作品; max 3 such
  posts a day, enforced by lib/posts.ts on both client and server. Replies never carry attachments.

## Creator analytics (docs/DESIGN.md §26)
- First-party, server-aggregated totals only; never send or show individual viewers or raw events.
- Every number compares against the previous period of the same length; no baseline shows a dash.
- Pure maths lives in src/lib/analytics.ts with tests; charts are animated Views, never SVG.

## Store compliance (docs/DESIGN.md §30, docs/APP_REVIEW.md)
- Every user-content surface (posts, replies, comments, profiles) runs lib/moderation.ts `screenText` in the
  client and on the server, offers report-with-reason and block via `useModeration`, and hides blocked people.
- Account creation requires accepting the terms (TERMS_VERSION); publishing actions go through
  `requireTerms` so a newer version is accepted first. Contacts live in lib/contact.ts.
- Account changes go through store/session.ts: sign-in invalidates queries, sign-out wipes the cache and
  per-person stores (store/account.ts). Buy actions call `ownsFresh` before charging.
- Every listing wizard ends with `OwnershipAttest`; listing pages expose "Report this listing" for IP claims.
- Digital goods and boosts use IAP only. Link out to pay only where lib/storefront.ts `canLinkOut` allows.

## Accounts (docs/DESIGN.md §23)
- Guests can browse and search; wrap account-only actions in `requireAuth(reason, action)` so
  sign-in opens as a Sheet and the action resumes afterwards. Never gate browsing.
- Offer Sign in with Apple wherever another third-party login is offered; accounts must be
  deletable in the app.

## Payments & access
- Purchase state comes from the server only; never grant access on the client.
- In-app purchases use fixed price tiers via RevenueCat; web uses Stripe Checkout.
- Every rate shown to users comes from src/lib/fees.ts (`FEES`), disclosed in the terms (§31). The server charges
  from supabase/functions/_shared/schedule.ts (minor units, basis points); a test fails if the two disagree.
- Payments backend (§32): money is integer HKD cents in an append-only ledger (`ledger_entries`, unique
  `source_key`); clients only read their own rows through RLS; writes happen only in the payments-webhook and
  settlement Edge Functions. Every write must stay idempotent (webhook replays, re-run settlement). Logic lives
  in supabase/functions/_shared as pure TS with Jest tests; SQL rules are tested by `npm run test:sql`.
- The mobile app never executes, unzips or loads downloaded code.

## Backend (docs/DESIGN.md §33)
- Import `api` from `@/api/backend`, never from mockServer: it is the demo server, or Supabase (src/api/remote.ts)
  merged over it when EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY are set.
- Content others read (profiles, posts, replies, comments, offers) is written only by the `content` Edge Function;
  reactions, votes, blocks and reports go straight in under RLS. Purchases come from `my_purchases()`.
- The server enforces src/lib rules through copies in supabase/functions/_shared/rules: after editing moderation,
  posts, auth, socialLinks, contact, features, price, prompt, license, sourceScan, media, storeLinks or categories, run `node scripts/sync-shared.mjs`
  (a test fails otherwise). Those files must stay import-free.
- supabase/seed.sql is generated from src/data: after changing demo data run `WRITE_SEED=1 npx jest supabase/tests/seed`.
- Edge Functions: logic in supabase/functions/_shared (pure, Jest-tested, dependencies injected); `index.ts` files only
  wire env, REST and `Deno.serve`. Signed-in endpoints use `_shared/http.ts` `signedInEndpoint`.
- Staff tools (§36) go through the `admin` function and are logged in `admin_actions`. Claude moderation is optional
  (ANTHROPIC_API_KEY) and must never block posting when unavailable.
- Error reports are first-party (lib/errorReport.ts): scrubbed, no account or device id. Never add a crash or
  analytics SDK.
- public/ ships with the web app: site pages (about, support, privacy, terms), .well-known link files and hosting
  rules. Keep the privacy policy in step with what the backend actually collects.

## Platforms & data (docs/DESIGN.md §38)
- One codebase and one Supabase project for iOS, Android and the web; the same account sees the same purchases,
  favourites, blocks, posts and studio everywhere. Only device preferences (theme, language, haptics, drafts) stay local.
- Links: build them with src/lib/links.ts (`ORIGIN`, short /t /p /l /b paths). Any new shareable route must be added to
  app.json (android.intentFilters) and public/.well-known/apple-app-site-association; a test checks they match.
- Layout is one column, centred at `layout.maxWidth` on iPad and desktop browsers.
- Builds: `npx eas-cli@latest build --profile development|preview|production` (eas.json); keep `npx expo-doctor` at 20/20.

## Listing media & store links (docs/DESIGN.md §39)
- Icons, screenshots and videos follow lib/media.ts in the app and in the studio function; uploads only through URLs
  the server signs, into the uploader's own folder of the public `media` bucket. Listings may only reference the
  creator's own files, and nothing is public before staff review.
- Store links are reduced to the app id and rebuilt as canonical apps.apple.com / play.google.com URLs (lib/storeLinks.ts);
  never store or open a pasted store URL as is. Videos never autoplay.

## Data & security
- Source code lives in a private bucket; downloads only via short-lived signed URLs.
- All tables use Row Level Security. Never store creators' ID or bank details (Stripe only).
- No ads or third-party tracking SDKs. Secrets never committed.

## Testing
- Every feature ships with Jest tests; user-facing flows also need a Maestro flow.
- Test data uses fictional templates, creators and buyers only.

## Commands
```bash
npm test            # Jest (logic + components)
npm run typecheck   # tsc for the app and the Edge Functions
npm run test:sql    # migrations + RLS + SQL functions on a local Postgres
npm run web         # dev server in the browser
npx expo run:ios    # development build (IAP and MMKV need native modules, not Expo Go)
```
Expo SDK 58 — see AGENTS.md: always use `npx expo install` and check versioned docs.
