import { Easing } from "react-native-reanimated";

/**
 * Single source of truth for colour, radius, shadow, type and motion.
 * Components must never hard-code a colour — see docs/DESIGN.md §4.
 */
export const light = {
  bg: "#f5f5f7",
  bgElevated: "#ffffff",
  bgMuted: "#ebebef",
  bgCode: "#f2f2f5",
  fg: "#1d1d1f",
  fgMuted: "#48484c",
  fgSubtle: "#636366",
  border: "rgba(29,29,31,0.08)",
  accent: "#5b3fd6",
  accentPressed: "#4a31b8",
  accentSoft: "rgba(91,63,214,0.12)",
  accentFg: "#ffffff",
  price: "#1d1d1f",
  rating: "#a34a07",
  live: "#147a3b",
  liveSoft: "rgba(20,122,59,0.1)",
  pending: "#1d5fd1",
  pendingSoft: "rgba(29,95,209,0.1)",
  ended: "#48484c",
  endedSoft: "rgba(29,29,31,0.06)",
  warn: "#a34a07",
  warnSoft: "rgba(163,74,7,0.1)",
  danger: "#c81e1e",
  dangerSoft: "rgba(200,30,30,0.1)",
  segmentTrack: "#e8e8ed",
  overlay: "rgba(0,0,0,0.4)",
  /** Liquid glass: translucent fill + a hairline specular edge. */
  glass: "rgba(255,255,255,0.72)",
  glassEdge: "rgba(255,255,255,0.9)",
};

export type Palette = typeof light;

/** Dark surfaces use only the landing-page-design dark set: #000000, #181818, #1F1F1F, #272727. */
export const dark: Palette = {
  bg: "#000000",
  bgElevated: "#181818",
  bgMuted: "#272727",
  bgCode: "#1f1f1f",
  fg: "#f5f5f7",
  fgMuted: "#aeaeb2",
  fgSubtle: "#8e8e93",
  border: "rgba(245,245,247,0.1)",
  accent: "#a594ff",
  accentPressed: "#8f7bff",
  accentSoft: "rgba(165,148,255,0.16)",
  accentFg: "#120a33",
  price: "#f5f5f7",
  rating: "#f59e0b",
  live: "#4ade80",
  liveSoft: "rgba(74,222,128,0.14)",
  pending: "#5b9cff",
  pendingSoft: "rgba(91,156,255,0.16)",
  ended: "#aeaeb2",
  endedSoft: "rgba(245,245,247,0.08)",
  warn: "#f59e0b",
  warnSoft: "rgba(245,158,11,0.14)",
  danger: "#f87171",
  dangerSoft: "rgba(248,113,113,0.12)",
  segmentTrack: "#1f1f1f",
  overlay: "rgba(0,0,0,0.6)",
  glass: "rgba(39,39,39,0.66)",
  glassEdge: "rgba(255,255,255,0.14)",
};

/** Tailwind radius steps only. Nested elements use `nested(outer, gap)` = outer − gap. */
export const radius = { card: 24, hero: 24, row: 16, inset: 16, control: 12, media: 16, chip: 999 };
/** Inner radius for an element inset `gap` inside a container of `outer` radius (skill rule: only when gap < 32). */
export const nested = (outer: number, gap: number) => (gap < 32 && outer - gap > 2 ? outer - gap : outer);
/** Spacing scale: 0, 2, 4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96. Nothing in between. */
export const gap = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, x3: 40, x4: 48, x5: 64 } as const;
export const space = { gutter: 16, cardPad: 16, rowPadX: 16, rowPadY: 12 };
export const hit = 44;

/** Light mode floats cards with shadow; dark mode swaps it for a 1px border. */
export const shadow = {
  card: { shadowColor: "#0f1412", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  soft: { shadowColor: "#0f1412", shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
};

/** Geist for UI, Geist Mono for code. Weights stop at 700. */
export const font = {
  regular: "Geist_400Regular",
  medium: "Geist_500Medium",
  semibold: "Geist_600SemiBold",
  bold: "Geist_700Bold",
  heavy: "Geist_700Bold",
  mono: "GeistMono_400Regular",
  monoBold: "GeistMono_700Bold",
} as const;

/** Type scale on Tailwind steps only: 12/16, 14/20, 16/24, 18/28, 20/28, 24/32, 30/36, 36/40. */
export const type = {
  largeTitle: { fontSize: 30, lineHeight: 36, fontFamily: font.bold, letterSpacing: -0.75 },
  heroTitle: { fontSize: 24, lineHeight: 32, fontFamily: font.bold, letterSpacing: -0.5 },
  heroLede: { fontSize: 16, lineHeight: 24, fontFamily: font.regular },
  section: { fontSize: 18, lineHeight: 28, fontFamily: font.semibold, letterSpacing: -0.25 },
  eyebrow: { fontSize: 12, lineHeight: 16, fontFamily: font.semibold, letterSpacing: 0.5, textTransform: "uppercase" as const },
  body: { fontSize: 14, lineHeight: 20, fontFamily: font.regular },
  bodyStrong: { fontSize: 14, lineHeight: 20, fontFamily: font.semibold },
  longform: { fontSize: 16, lineHeight: 24, fontFamily: font.regular },
  code: { fontSize: 12, lineHeight: 16, fontFamily: font.mono },
  price: { fontSize: 18, lineHeight: 28, fontFamily: font.bold, fontVariant: ["tabular-nums" as const] },
  caption: { fontSize: 12, lineHeight: 16, fontFamily: font.medium },
  tabLabel: { fontSize: 12, lineHeight: 16, fontFamily: font.medium },
};

/** Shared curves. `out` is the skill base curve (0.22,1,0.36,1); `e`/`e2`/`io` are design-to-motion's. */
export const curve = {
  out: Easing.bezier(0.22, 1, 0.36, 1),
  e: Easing.bezier(0.16, 1, 0.3, 1),
  e2: Easing.bezier(0.33, 1, 0.68, 1),
  io: Easing.bezier(0.65, 0, 0.35, 1),
};

/** §8 motion constants. Every animation in the app reads from here. */
export const motion = {
  enter: { duration: 500, easing: curve.out, offset: 10 },
  /** Rise + blur reveal: text rises 10px from blur 4, cards 24px from blur 6 at .985 scale. */
  reveal: { duration: 500, rise: 10, blur: 4, stagger: 60 },
  revealCard: { duration: 600, rise: 24, blur: 6, scale: 0.985 },
  /** Hero headline appears word by word: 6px rise, 2px blur, 60ms stagger. */
  hero: { duration: 500, rise: 6, blur: 2, stagger: 60 },
  stagger: 60,
  sheet: { duration: 420, easing: Easing.bezier(0.32, 0.72, 0, 1) },
  /** Page behind an open sheet recedes to this scale (iOS card stack). */
  sheetRecede: 0.94,
  tab: { duration: 360, easing: curve.e, offset: 16 },
  rowIn: { duration: 360, easing: curve.e },
  rowOut: { duration: 220, easing: Easing.bezier(0.7, 0, 0.84, 0) },
  press: { scale: 0.98, duration: 120 },
  /** Liquid press: squash to .96 then spring back with a slight overshoot. */
  liquid: { scale: 0.96, damping: 14, stiffness: 380, mass: 0.7 },
  crossfade: 200,
  numberRoll: 500,
  purchase: { duration: 600 },
  /** Springy "pop" used by tab icons (1 → 1.18 → 1) and the favourite heart (1 → 1.3 → 1). */
  pop: { damping: 9, stiffness: 320, mass: 0.6 },
};
