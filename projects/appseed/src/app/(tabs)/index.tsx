import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, useWindowDimensions, View } from "react-native";
import Animated, { Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, type SharedValue } from "react-native-reanimated";
import { useTemplates } from "@/api/queries";
import type { CategoryKey, Template } from "@/api/types";
import { LargeTitleScreen } from "@/components/shell/LargeTitleScreen";
import { TabScene } from "@/components/shell/TabScene";
import { Cover } from "@/components/template/Cover";
import { TemplateCard } from "@/components/template/TemplateCard";
import { Chip } from "@/components/ui/Chip";
import { HeaderButton } from "@/components/ui/HeaderButton";
import { PressableScale } from "@/components/ui/PressableScale";
import { PriceTag } from "@/components/ui/PriceTag";
import { RatingStars } from "@/components/ui/RatingStars";
import { SearchBarButton } from "@/components/ui/SearchBar";
import { Section } from "@/components/ui/Section";
import { Skeleton } from "@/components/ui/Skeleton";
import { Txt } from "@/components/ui/Txt";
import { useT } from "@/i18n";
import { crossfadeIn, enterAt } from "@/theme/animations";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space } from "@/theme/tokens";

const CATEGORIES: (CategoryKey | "all")[] = ["all", "tools", "finance", "ai", "games", "hk", "merchant"];

export default function Explore() {
  const t = useT();
  const { data, isLoading, refetch } = useTemplates();
  const [cat, setCat] = useState<CategoryKey | "all">("all");
  const { width } = useWindowDimensions();
  const cardW = Math.min(width, 1120) * 0.44;

  const list = useMemo(() => (data ?? []).filter((x) => cat === "all" || x.category === cat), [data, cat]);
  const featured = list.filter((x) => x.featured);
  const fresh = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);
  const trending = [...list].filter((x) => x.price > 0).sort((a, b) => b.sales - a.sales).slice(0, 6);
  const free = list.filter((x) => x.price === 0);

  return (
    <TabScene index={0}>
      <LargeTitleScreen title={t("explore.title")} right={<HeaderButton icon="settings" motion="spin" label={t("a11y.settings")} onPress={() => router.navigate("/me")} />} onRefresh={refetch}>
        <Animated.View entering={enterAt(0)} style={{ paddingHorizontal: space.gutter, gap: 14 }}>
          <SearchBarButton placeholder={t("explore.searchPlaceholder")} label={t("a11y.search")} onPress={() => router.push("/search")} />
        </Animated.View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: space.gutter, paddingVertical: 14 }}>
          {CATEGORIES.map((k) => (
            <Chip key={k} label={t(`category.${k}`)} selected={cat === k} onPress={() => setCat(k)} />
          ))}
        </ScrollView>

        {isLoading ? (
          <ExploreSkeleton cardW={cardW} />
        ) : (
          // Re-keying on category cross-fades the whole feed instead of hard-swapping it.
          <Animated.View key={cat} entering={crossfadeIn} style={{ gap: 28, paddingTop: 4 }}>
            {featured.length > 0 && (
              <Section eyebrow={t("explore.eyebrowFeatured")} title={t("explore.featured")} index={0}>
                <FeaturedCarousel items={featured} />
              </Section>
            )}
            <Rail title={t("explore.fresh")} items={fresh} index={1} cardW={cardW} />
            <Rail title={t("explore.trending")} items={trending} index={2} cardW={cardW} />
            <Rail title={t("explore.freeStarters")} items={free} index={3} cardW={cardW} />
          </Animated.View>
        )}
      </LargeTitleScreen>
    </TabScene>
  );
}

function Rail({ title, items, index, cardW }: { title: string; items: Template[]; index: number; cardW: number }) {
  if (items.length === 0) return null;
  return (
    <Section title={title} index={index}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} decelerationRate="fast" snapToInterval={cardW + 12} contentContainerStyle={{ gap: 12, paddingHorizontal: space.gutter, paddingBottom: 12 }}>
        {items.map((x) => (
          <TemplateCard key={x.slug} t={x} width={cardW} />
        ))}
      </ScrollView>
    </Section>
  );
}

/** Large hero cards that scale down and dim as they leave centre — a soft depth effect, all on the UI thread. */
function FeaturedCarousel({ items }: { items: Template[] }) {
  const { width } = useWindowDimensions();
  const w = Math.min(width, 1120) - space.gutter * 2 - 24;
  const x = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    x.value = e.contentOffset.x;
  });
  return (
    <Animated.ScrollView
      horizontal
      onScroll={onScroll}
      scrollEventThrottle={16}
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      snapToInterval={w + 12}
      contentContainerStyle={{ gap: 12, paddingHorizontal: space.gutter, paddingBottom: 14 }}
    >
      {items.map((item, i) => (
        <FeaturedCard key={item.slug} item={item} i={i} w={w} x={x} />
      ))}
    </Animated.ScrollView>
  );
}

function FeaturedCard({ item, i, w, x }: { item: Template; i: number; w: number; x: SharedValue<number> }) {
  const { c, card } = useTheme();
  const a = useAnimatedStyle(() => {
    const d = Math.abs(x.value / (w + 12) - i);
    return { transform: [{ scale: interpolate(d, [0, 1], [1, 0.94], Extrapolation.CLAMP) }], opacity: interpolate(d, [0, 1], [1, 0.7], Extrapolation.CLAMP) };
  });
  return (
    <Animated.View style={[{ width: w }, a]}>
      <PressableScale onPress={() => router.push(`/template/${item.slug}`)} accessibilityLabel={item.name} style={[{ backgroundColor: c.bgElevated, borderRadius: radius.hero, padding: 12, gap: 12 }, card]}>
        <Cover t={item} rounded={radius.media} />
        <View style={{ paddingHorizontal: 4, paddingBottom: 4, gap: 6 }}>
          <Txt variant="heroTitle" style={{ fontSize: 20, lineHeight: 25 }} numberOfLines={1}>
            {item.name}
          </Txt>
          <Txt variant="body" tone="fgMuted" numberOfLines={2}>
            {item.tagline}
          </Txt>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
            <RatingStars value={item.rating} count={item.reviewCount} />
            <PriceTag amount={item.price} />
          </View>
        </View>
      </PressableScale>
    </Animated.View>
  );
}

function ExploreSkeleton({ cardW }: { cardW: number }) {
  const { c, card } = useTheme();
  return (
    <View style={{ gap: 28, paddingHorizontal: space.gutter, paddingTop: 4 }}>
      <View style={{ gap: 12 }}>
        <Skeleton width={120} height={14} />
        <View style={[{ backgroundColor: c.bgElevated, borderRadius: radius.hero, padding: 12, gap: 12 }, card]}>
          <Skeleton height={(cardW * 2) / 1.6} radius={radius.media} />
          <Skeleton width="70%" height={20} />
          <Skeleton width="90%" height={14} />
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 12 }}>
        {[0, 1].map((i) => (
          <View key={i} style={[{ width: cardW, backgroundColor: c.bgElevated, borderRadius: radius.card, padding: 10, gap: 10 }, card]}>
            <Skeleton height={cardW / 1.6 - 12} radius={radius.media} />
            <Skeleton width="80%" height={14} />
            <Skeleton width="50%" height={12} />
          </View>
        ))}
      </View>
    </View>
  );
}
