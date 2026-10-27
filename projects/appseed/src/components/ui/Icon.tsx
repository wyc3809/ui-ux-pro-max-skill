import createIconSet from "@expo/vector-icons/createIconSet";
import { useEffect, useRef } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { motion } from "@/theme/tokens";
import { PHOSPHOR_FILL, PHOSPHOR_REGULAR, type PhosphorGlyph } from "./phosphorGlyphs";

const PhosphorRegular = createIconSet(PHOSPHOR_REGULAR, "phosphor-regular", require("../../../assets/fonts/Phosphor.ttf"));
const PhosphorFill = createIconSet(PHOSPHOR_FILL, "phosphor-fill", require("../../../assets/fonts/PhosphorFill.ttf"));

/** Load with the app's other fonts so icons never flash as boxes. */
export const iconFonts = { ...PhosphorRegular.font, ...PhosphorFill.font };

const BRANDS = { x: "x-logo", linkedin: "linkedin-logo", threads: "threads-logo", whatsapp: "whatsapp-logo", apple: "apple-logo", google: "google-logo" } as const;
export type Brand = keyof typeof BRANDS;

/** Third-party logos for sign-in and share buttons (filled brand marks), from the same font. */
export function BrandIcon({ brand, size = 20, color }: { brand: Brand; size?: number; color: string }) {
  return <PhosphorFill name={BRANDS[brand]} size={size} color={color} />;
}

/**
 * Logical icon names → Phosphor glyph. Each glyph exists in the regular (outline) and fill fonts,
 * which is what lets an icon morph from outline to filled instead of swapping.
 * Icons are a font, never SVG.
 */
export const ICONS = {
  bell: "bell",
  book: "book-open",
  building: "buildings",
  bus: "bus",
  check: "check",
  checkCircle: "check-circle",
  alert: "warning-circle",
  chef: "chef-hat",
  chevronDown: "caret-down",
  chevronLeft: "caret-left",
  chevronRight: "caret-right",
  clock: "clock",
  close: "x",
  closeCircle: "x-circle",
  compass: "compass",
  copy: "copy",
  file: "file-text",
  flag: "flag",
  folder: "folder",
  git: "git-branch",
  grid: "grid-four",
  heart: "heart",
  image: "image",
  info: "info",
  language: "translate",
  laptop: "laptop",
  library: "books",
  link: "link",
  list: "list-numbers",
  lock: "lock",
  mail: "envelope-simple",
  moon: "moon",
  package: "package",
  pen: "pencil-simple-line",
  phone: "device-mobile",
  plus: "plus",
  minus: "minus",
  receipt: "receipt",
  refresh: "arrow-clockwise",
  reply: "arrow-bend-down-right",
  scale: "scales",
  search: "magnifying-glass",
  settings: "gear-six",
  share: "share-network",
  shield: "shield-check",
  sliders: "sliders-horizontal",
  sprout: "plant",
  star: "star",
  starHalf: "star-half",
  ticket: "ticket",
  trash: "trash",
  user: "user",
  userX: "user-minus",
  wallet: "wallet",
  warning: "warning",
  sparkles: "sparkle",
  code: "code",
  chat: "chats",
  camera: "camera",
  rocket: "rocket-launch",
  game: "game-controller",
  trendingUp: "trend-up",
  upvote: "arrow-fat-up",
  tag: "tag",
  briefcase: "briefcase",
  people: "users",
  download: "download-simple",
  hammer: "hammer",
  cash: "money",
  hand: "hand",
  megaphone: "megaphone",
  flash: "lightning",
  eye: "eye",
  terminal: "terminal-window",
  layers: "stack",
  trophy: "trophy",
  globe: "globe",
  timer: "timer",
  swap: "swap",
  logout: "sign-out",
  bookmark: "bookmark-simple",
  comment: "chat-circle",
  remix: "git-merge",
  send: "paper-plane-tilt",
  more: "dots-three",
  trendingDown: "trend-down",
  chart: "chart-bar",
  funnel: "funnel",
  calendar: "calendar-blank",
  click: "cursor-click",
  report: "presentation-chart",
  arrowUp: "arrow-up",
  arrowDown: "arrow-down",
} as const satisfies Record<string, PhosphorGlyph>;

export type IconName = keyof typeof ICONS;

/** What plays when `trigger` (or `active`) changes after mount. */
export type IconMotion = "pop" | "wiggle" | "spin" | "nudge" | "bounce" | "none";

type Props = {
  name: IconName;
  size?: number;
  color: string;
  /** Filled glyph colour when active; defaults to `color`. */
  activeColor?: string;
  /** false = outline glyph, true = filled glyph. The change is a scale-and-crossfade morph. */
  active?: boolean;
  /** Motion replayed on every change of `trigger` / `active`. */
  motion?: IconMotion;
  trigger?: unknown;
  /** Spring in from 0.4× on mount; `enterDelay` staggers icons in a row. */
  enter?: boolean;
  enterDelay?: number;
  /** Continuous idle motion, e.g. a loading or attention state. */
  loop?: "spin" | "breathe";
  style?: StyleProp<ViewStyle>;
};

const RM = ReduceMotion.System;
const spring = { ...motion.pop, reduceMotion: RM };

/** Every icon in the app goes through here, so none of them ever appear or change state without motion. */
export function Icon({ name, size = 20, color, activeColor, active = false, motion: kind = "pop", trigger, enter = true, enterDelay = 0, loop, style }: Props) {
  const base = ICONS[name];
  const fill = useSharedValue(active ? 1 : 0);
  const scale = useSharedValue(enter ? 0.4 : 1);
  const opacity = useSharedValue(enter ? 0 : 1);
  const rotate = useSharedValue(0);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const first = useRef(true);

  useEffect(() => {
    if (!enter) return;
    scale.value = withDelay(enterDelay, withSpring(1, { damping: 12, stiffness: 260, mass: 0.6, reduceMotion: RM }));
    opacity.value = withDelay(enterDelay, withTiming(1, { duration: 180, reduceMotion: RM }));
  }, [enter, enterDelay, scale, opacity]);

  useEffect(() => {
    fill.value = withTiming(active ? 1 : 0, { duration: 260, easing: Easing.out(Easing.cubic), reduceMotion: RM });
  }, [active, fill]);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = (v: number, d = 70) => withTiming(v, { duration: d, reduceMotion: RM });
    switch (kind) {
      case "pop":
        scale.value = withSequence(t(1.28, 110), withSpring(1, spring));
        break;
      case "wiggle":
        rotate.value = withSequence(t(-14), t(12), t(-8), t(6), t(0));
        break;
      case "spin":
        rotate.value = 0;
        rotate.value = withTiming(360, { duration: 520, easing: Easing.out(Easing.cubic), reduceMotion: RM });
        break;
      case "nudge":
        tx.value = withSequence(t(4, 90), withSpring(0, spring));
        break;
      case "bounce":
        ty.value = withSequence(t(-5, 110), withSpring(0, spring));
        break;
    }
  }, [trigger, active, kind, scale, rotate, tx, ty]);

  useEffect(() => {
    if (loop === "spin") {
      const tick = () => {
        rotate.value = 0;
        rotate.value = withTiming(360, { duration: 900, easing: Easing.linear, reduceMotion: RM }, (done) => {
          if (done) tick();
        });
      };
      tick();
    } else if (loop === "breathe") {
      const tick = () => {
        scale.value = withSequence(withTiming(1.12, { duration: 700, reduceMotion: RM }), withTiming(1, { duration: 700, reduceMotion: RM }, (done) => {
          if (done) tick();
        }));
      };
      tick();
    }
  }, [loop, rotate, scale]);

  const wrap = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }, { rotate: `${rotate.value}deg` }],
  }));
  const outline = useAnimatedStyle(() => ({ opacity: 1 - fill.value, transform: [{ scale: 1 - fill.value * 0.25 }] }));
  const filled = useAnimatedStyle(() => ({ opacity: fill.value, transform: [{ scale: 0.6 + fill.value * 0.4 }] }));

  return (
    <Animated.View pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={[{ width: size, height: size }, wrap, style]}>
      <Animated.View style={[{ position: "absolute" }, outline]}>
        <PhosphorRegular name={base} size={size} color={color} />
      </Animated.View>
      <Animated.View style={[{ position: "absolute" }, filled]}>
        <PhosphorFill name={base} size={size} color={activeColor ?? color} />
      </Animated.View>
    </Animated.View>
  );
}
