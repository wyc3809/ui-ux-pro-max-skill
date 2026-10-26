import { Easing } from "react-native-reanimated";

/**
 * Single source of truth for colour, radius, shadow, type and motion.
 * Components must never hard-code a colour — see docs/DESIGN.md §4.
 */
export const light = {
  bg: "#f5f6f3",
  bgElevated: "#ffffff",
  bgMuted: "#eef1ef",
  bgCode: "#f0f2f5",
  fg: "#0f1412",
  fgMuted: "#5f6b64",
  fgSubtle: "#646f69",
  border: "rgba(15,20,18,0.08)",
  accent: "#5b3fd6",
  accentPressed: "#4a31b8",
  accentSoft: "rgba(91,63,214,0.12)",
  accentFg: "#ffffff",
  price: "#0f1412",
  rating: "#b45309",
  live: "#147a3b",
  liveSoft: "#e7f6ec",
  pending: "#1d5fd1",
  pendingSoft: "rgba(29,95,209,0.1)",
  ended: "#5f6b64",
  endedSoft: "#eef0ec",
  warn: "#b45309",
  warnSoft: "rgba(180,83,9,0.1)",
  danger: "#c81e1e",
  dangerSoft: "rgba(200,30,30,0.1)",
  segmentTrack: "#eceeea",
  overlay: "rgba(15,20,18,0.45)",
};

export type Palette = typeof light;

export const dark: Palette = {
  bg: "#0a0c0b",
  bgElevated: "#141816",
  bgMuted: "#1c211f",
  bgCode: "#101412",
  fg: "#f4f7f5",
  fgMuted: "#a3ada7",
  fgSubtle: "#828d86",
  border: "rgba(244,247,245,0.08)",
  accent: "#a594ff",
  accentPressed: "#8f7bff",
  accentSoft: "rgba(165,148,255,0.16)",
  accentFg: "#120a33",
  price: "#f4f7f5",
  rating: "#f59e0b",
  live: "#4ade80",
  liveSoft: "rgba(74,222,128,0.14)",
  pending: "#5b9cff",
  pendingSoft: "rgba(91,156,255,0.16)",
  ended: "#a3ada7",
  endedSoft: "rgba(244,247,245,0.08)",
  warn: "#f59e0b",
  warnSoft: "rgba(245,158,11,0.14)",
  danger: "#f87171",
  dangerSoft: "rgba(248,113,113,0.12)",
  segmentTrack: "#1c211f",
  overlay: "rgba(0,0,0,0.62)",
};

export const radius = { card: 22, hero: 24, row: 18, inset: 16, control: 12, media: 18, chip: 999 };
export const space = { gutter: 16, cardPad: 16, rowPadX: 14, rowPadY: 12 };
export const hit = 44;

/** Light mode floats cards with shadow; dark mode swaps it for a 1px border. */
export const shadow = {
  card: { shadowColor: "#0f1412", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  soft: { shadowColor: "#0f1412", shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
};

export const font = {
  regular: "DMSans_400Regular",
  medium: "DMSans_500Medium",
  semibold: "DMSans_600SemiBold",
  bold: "DMSans_700Bold",
  heavy: "DMSans_800ExtraBold",
  mono: "JetBrainsMono_400Regular",
  monoBold: "JetBrainsMono_700Bold",
} as const;

/** §5 type scale. `family` is resolved per weight because RN custom fonts are one file per weight. */
export const type = {
  largeTitle: { fontSize: 30, fontFamily: font.heavy, letterSpacing: -0.9 },
  heroTitle: { fontSize: 23, fontFamily: font.heavy, letterSpacing: -0.4, lineHeight: 29 },
  heroLede: { fontSize: 15, fontFamily: font.medium, lineHeight: 21 },
  section: { fontSize: 16, fontFamily: font.bold },
  eyebrow: { fontSize: 11, fontFamily: font.bold, letterSpacing: 1.5, textTransform: "uppercase" as const },
  body: { fontSize: 14, lineHeight: 20, fontFamily: font.regular },
  bodyStrong: { fontSize: 14, lineHeight: 20, fontFamily: font.semibold },
  longform: { fontSize: 16, lineHeight: 26, fontFamily: font.regular },
  code: { fontSize: 13, lineHeight: 20, fontFamily: font.mono },
  price: { fontSize: 18, fontFamily: font.heavy, fontVariant: ["tabular-nums" as const] },
  caption: { fontSize: 12, lineHeight: 16, fontFamily: font.medium },
  tabLabel: { fontSize: 11, fontFamily: font.bold },
};

/** §8 motion constants. Every animation in the app reads from here. */
export const motion = {
  enter: { duration: 450, easing: Easing.out(Easing.cubic), offset: 10 },
  stagger: 80,
  sheet: { duration: 320, easing: Easing.bezier(0.32, 0.72, 0, 1) },
  tab: { duration: 300, easing: Easing.bezier(0.2, 0.8, 0.2, 1), offset: 18 },
  rowIn: { duration: 300, easing: Easing.bezier(0.16, 1, 0.3, 1) },
  rowOut: { duration: 220, easing: Easing.bezier(0.7, 0, 0.84, 0) },
  press: { scale: 0.97, duration: 120 },
  crossfade: 200,
  numberRoll: 480,
  purchase: { duration: 600 },
  /** Springy "pop" used by tab icons (1 → 1.18 → 1) and the favourite heart (1 → 1.3 → 1). */
  pop: { damping: 9, stiffness: 320, mass: 0.6 },
};
