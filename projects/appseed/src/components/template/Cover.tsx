import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import type { ListingMedia } from "@/lib/media";
import { View, type ViewStyle } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeInLeft, ReduceMotion } from "react-native-reanimated";
import type { CoverIcon, Template } from "@/api/types";
import { startFrom } from "@/theme/animations";
import { Icon, type IconName } from "@/components/ui/Icon";
import { useTheme } from "@/theme/ThemeProvider";
import { radius } from "@/theme/tokens";

const icons: Record<CoverIcon, IconName> = {
  wallet: "wallet",
  building: "building",
  chef: "chef",
  grid: "grid",
  ticket: "ticket",
  sprout: "sprout",
  bus: "bus",
  receipt: "receipt",
  sparkles: "sparkles",
  code: "code",
  chat: "chat",
  camera: "camera",
  rocket: "rocket",
  game: "game",
  megaphone: "megaphone",
  hammer: "hammer",
  globe: "globe",
};

const RM = ReduceMotion.System;

/**
 * Placeholder artwork for a template until real screenshots are uploaded: the creator's
 * gradient with a stylised phone frame. Media always gets a 1px border (§4).
 * Creator-supplied gradients are content, not UI chrome, so they are exempt from tokens.
 * Motion: the phone rises into frame on a spring and its UI blocks build up one by one.
 */
export function Cover({ t, style, screen = 0, rounded = radius.media }: { t: { cover: Template["cover"]; media?: ListingMedia }; style?: ViewStyle; screen?: number; rounded?: number }) {
  const { c } = useTheme();
  // A creator's uploaded icon replaces the placeholder: full-bleed in square thumbnails, centred on the creator's
  // gradient in wider cards (§39).
  if (t.media?.icon) {
    const square = style?.aspectRatio === 1;
    return (
      <View style={[{ aspectRatio: 16 / 10, borderRadius: rounded, overflow: "hidden", borderWidth: 1, borderColor: c.border }, style]}>
        {square ? (
          <Image source={{ uri: t.media.icon }} style={{ flex: 1 }} contentFit="cover" transition={160} accessibilityIgnoresInvertColors />
        ) : (
          <LinearGradient colors={[t.cover.from, t.cover.to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Image source={{ uri: t.media.icon }} style={{ width: "34%", aspectRatio: 1, borderRadius: radius.card }} contentFit="cover" transition={160} accessibilityIgnoresInvertColors />
          </LinearGradient>
        )}
      </View>
    );
  }
  const angle = screen % 2 === 0 ? { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } } : { start: { x: 1, y: 0 }, end: { x: 0, y: 1 } };
  return (
    <View style={[{ aspectRatio: 16 / 10, borderRadius: rounded, overflow: "hidden", borderWidth: 1, borderColor: c.border }, style]}>
      <LinearGradient colors={[t.cover.from, t.cover.to]} {...angle} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end" }}>
        <View style={{ position: "absolute", top: "18%", left: "8%", opacity: 0.95 }}>
          <Icon name={icons[t.cover.icon]} size={36} color="#ffffff" active enterDelay={120} />
        </View>
        <Animated.View entering={startFrom(FadeInDown.springify().damping(16).stiffness(140).delay(60), { opacity: 0, transform: [{ translateY: 40 }] }).reduceMotion(RM)} style={{ width: "38%", height: "78%", borderTopLeftRadius: 18, borderTopRightRadius: 18, backgroundColor: "rgba(255,255,255,0.92)", padding: 12, gap: 8, transform: [{ translateX: 34 }] }}>
          <Animated.View entering={FadeInLeft.duration(260).delay(260).reduceMotion(RM)} style={{ height: 8, width: "55%", borderRadius: 4, backgroundColor: t.cover.from, opacity: 0.85 }} />
          <Animated.View entering={FadeIn.duration(260).delay(330).reduceMotion(RM)} style={{ height: 30, borderRadius: 8, backgroundColor: t.cover.to, opacity: 0.35 + (screen % 3) * 0.15 }} />
          {[0.9, 0.7, 0.8].map((w, i) => (
            <Animated.View key={i} entering={FadeInLeft.duration(260).delay(400 + i * 70).reduceMotion(RM)} style={{ height: 6, width: `${w * 100}%`, borderRadius: 3, backgroundColor: "rgba(15,20,18,0.12)" }} />
          ))}
        </Animated.View>
      </LinearGradient>
    </View>
  );
}
