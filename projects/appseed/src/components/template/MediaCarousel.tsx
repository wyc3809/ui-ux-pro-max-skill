import { useState } from "react";
import { View, type LayoutChangeEvent } from "react-native";
import Animated, { Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, type SharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import type { Template } from "@/api/types";
import { useT } from "@/i18n";
import { haptic } from "@/lib/haptic";
import { useTheme } from "@/theme/ThemeProvider";
import { gap, radius } from "@/theme/tokens";
import { Cover } from "./Cover";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useVideoPlayer, VideoView } from "expo-video";
import type { ListingMedia } from "@/lib/media";

type Showcase = Pick<Template, "cover" | "screens"> & { media?: ListingMedia };
type Page = { kind: "video"; uri: string } | { kind: "shot"; uri: string } | { kind: "placeholder"; i: number };

/** Uploaded video first, then screenshots; without uploads, the generated placeholder screens (§39). */
export const pagesFor = (t: Showcase): Page[] => {
  const real: Page[] = [...(t.media?.video ? [{ kind: "video" as const, uri: t.media.video }] : []), ...(t.media?.screenshots ?? []).map((uri) => ({ kind: "shot" as const, uri }))];
  return real.length ? real : Array.from({ length: Math.max(1, t.screens) }, (_, i) => ({ kind: "placeholder" as const, i }));
};

/** Paged screenshots. Each page subtly scales/fades with scroll; the active dot stretches into a pill. */
export function MediaCarousel({ t }: { t: Showcase }) {
  const tr = useT();
  const [w, setW] = useState(0);
  const x = useSharedValue(0);
  const page = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    x.value = e.contentOffset.x;
    if (w > 0) {
      const p = Math.round(e.contentOffset.x / w);
      if (p !== page.value) {
        page.value = p;
        scheduleOnRN(haptic, "selection");
      }
    }
  });
  const pages = pagesFor(t);
  const screens = pages.map((_, i) => i);
  return (
    <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)} style={{ gap: 12 }}>
      {w > 0 && (
        <Animated.ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={16} style={{ borderRadius: radius.media }}>
          {pages.map((pg, i) => (
            <Page key={i} i={i} w={w} x={x} label={pg.kind === "video" ? tr("media.playVideo") : tr("a11y.media", { i: i + 1, n: pages.length })}>
              {pg.kind === "placeholder" ? <Cover t={t} screen={pg.i} /> : pg.kind === "video" ? <PreviewVideo uri={pg.uri} /> : <Shot t={t} uri={pg.uri} />}
            </Page>
          ))}
        </Animated.ScrollView>
      )}
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 8 }}>
        {screens.map((i) => (
          <Dot key={i} i={i} w={w} x={x} />
        ))}
      </View>
    </View>
  );
}

/** A portrait screenshot shown whole on the listing's own gradient. */
function Shot({ t, uri }: { t: Showcase; uri: string }) {
  const { c } = useTheme();
  return (
    <LinearGradient colors={[t.cover.from, t.cover.to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ aspectRatio: 16 / 10, borderRadius: radius.media, overflow: "hidden", borderWidth: 1, borderColor: c.border, padding: gap.md }}>
      <Image source={{ uri }} style={{ flex: 1 }} contentFit="contain" transition={160} />
    </LinearGradient>
  );
}

/** The preview video, never autoplaying (§16): the platform's own controls start it. */
function PreviewVideo({ uri }: { uri: string }) {
  const { c } = useTheme();
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.muted = true;
  });
  return (
    <View style={{ aspectRatio: 16 / 10, borderRadius: radius.media, overflow: "hidden", borderWidth: 1, borderColor: c.border, backgroundColor: "#000000" }}>
      <VideoView player={player} style={{ flex: 1 }} contentFit="contain" nativeControls />
    </View>
  );
}

function Page({ i, w, x, label, children }: { i: number; w: number; x: SharedValue<number>; label: string; children: React.ReactNode }) {
  const a = useAnimatedStyle(() => {
    const d = (x.value - i * w) / w;
    return { opacity: interpolate(Math.abs(d), [0, 1], [1, 0.6], Extrapolation.CLAMP), transform: [{ scale: interpolate(Math.abs(d), [0, 1], [1, 0.94], Extrapolation.CLAMP) }] };
  });
  return (
    <Animated.View accessible accessibilityLabel={label} style={[{ width: w }, a]}>
      {children}
    </Animated.View>
  );
}

function Dot({ i, w, x }: { i: number; w: number; x: SharedValue<number> }) {
  const { c } = useTheme();
  const a = useAnimatedStyle(() => {
    const d = w > 0 ? Math.abs(x.value / w - i) : i === 0 ? 0 : 1;
    return {
      width: interpolate(d, [0, 1], [18, 6], Extrapolation.CLAMP),
      opacity: interpolate(d, [0, 1], [1, 0.35], Extrapolation.CLAMP),
    };
  });
  return <Animated.View style={[{ height: 6, borderRadius: 3, backgroundColor: c.fg }, a]} />;
}
