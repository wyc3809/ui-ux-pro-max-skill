# CLAUDE.md

## Product
AppSeed: a marketplace for runnable app source code plus "build stories" (prompts,
architecture decisions, pitfalls, launch steps). React Native + Expo for iOS, Android
and Web. Buyers browse and purchase on mobile, then send the code to their computer.
Creators upload templates (web recommended), pass review, and get paid via Stripe Connect.

## Design
- Every screen follows docs/DESIGN.md: colours, radii, shadows and motion only from
  src/theme/tokens.ts; reuse components in src/components/ui and src/components/template.
- Motion: layout presets live in src/theme/animations.ts, direction/stagger rules in
  src/lib/motion.ts. Every animation passes `ReduceMotion.System`.
- No SVG anywhere (no react-native-svg / lucide). Icons are the Ionicons font via
  src/components/ui/Icon.tsx, which animates every glyph (outline↔filled morph, enter pop,
  replayed motion on state change). Loading = `Spinner`, never ActivityIndicator.
  A test fails if an SVG dependency or import comes back.
- Tap targets ≥44; skeletons instead of full-screen spinners; haptics via lib/haptic.ts;
  respect reduced motion.
- UI copy: all strings in i18n; Chinese UI is written Chinese (書面語). Creator content is exempt.

## Markets (docs/DESIGN.md §22)
- Four markets share one design system: templates, prompts, whole-app buyouts, launches.
- Buyouts are business transfers paid via web escrow, never IAP; the app only takes offers.
- Prompt full text is only sent to owners by the server; the client shows preview + locked count.
- Sponsored launches must be labelled 贊助 and never carry an organic rank.

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

## Commands
```bash
npm test            # Jest (logic + components)
npm run typecheck   # tsc --noEmit
npm run web         # dev server in the browser
npx expo run:ios    # development build (IAP and MMKV need native modules, not Expo Go)
```
Expo SDK 58 — see AGENTS.md: always use `npx expo install` and check versioned docs.
