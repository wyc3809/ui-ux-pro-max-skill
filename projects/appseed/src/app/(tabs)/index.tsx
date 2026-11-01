import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, useWindowDimensions, View } from "react-native";
import Animated, { Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, type SharedValue } from "react-native-reanimated";
import { useQueryClient } from "@tanstack/react-query";
import { qk, useBuyouts, useLaunches, usePrompts, useTemplates } from "@/api/queries";
import type { CategoryKey, Template } from "@/api/types";
import { DiscussFeed } from "@/components/feed/DiscussFeed";
import { BuyoutCard, PromptCard } from "@/components/market/Cards";
import { CategoryChips, LaunchBoard } from "@/components/market/LaunchBoard";
import { inCategory } from "@/lib/categories";
import { LargeTitleScreen } from "@/components/shell/LargeTitleScreen";
import { TabScene } from "@/components/shell/TabScene";
import { Cover } from "@/components/template/Cover";
import { TemplateCard } from "@/components/template/TemplateCard";
import { DirectionalSwap } from "@/components/ui/DirectionalSwap";
import { HeaderButton } from "@/components/ui/HeaderButton";
import { Icon } from "@/components/ui/Icon";
import { PressableScale } from "@/components/ui/PressableScale";
import { ZoomLink, ZoomSource } from "@/components/ui/ZoomLink";
import { PriceTag } from "@/components/ui/PriceTag";
import { RatingStars } from "@/components/ui/RatingStars";
import { SearchBarButton } from "@/components/ui/SearchBar";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Section } from "@/components/ui/Section";
import { Skeleton } from "@/components/ui/Skeleton";
import { Txt } from "@/components/ui/Txt";
import { useT } from "@/i18n";
import { requireAuth } from "@/store/authGate";
import { crossfadeIn } from "@/theme/animations";
import { useTheme } from "@/theme/ThemeProvider";
import { gap, nested, radius, space } from "@/theme/tokens";
import { Reveal } from "@/components/ui/Reveal";
import { FEATURES } from "@/lib/features";

type Hub = "launches" | "discuss" | "templates" | "prompts" | "buyouts";
/** The leaderboard opens first, then the discussion feed (§28). */
const HUBS: Hub[] = (["launches", "discuss", "templates", "prompts", "buyouts"] as Hub[]).filter((h) => h !== "buyouts" || FEATURES.buyouts);
const HUB_QUERIES: Record<Hub, readonly unknown[]> = { launches: ["leaderboard"], discuss: ["posts"], templates: qk.templates, prompts: qk.prompts, buyouts: qk.buyouts };

export default function Explore() {
  const t = useT();
  const [hub, setHub] = useState<Hub>("launches");
  const qc = useQueryClient();
  // Pull to refresh reloads what the visible hub shows (the leaderboard and feed are keyed by period / sort).
  const refetch = () => qc.refetchQueries({ queryKey: HUB_QUERIES[hub], type: "active" });

  return (
    <TabScene index={0}>
      <LargeTitleScreen title={t("explore.title")} right={<HeaderButton icon="settings" motion="spin" label={t("a11y.settings")} onPress={() => router.navigate("/me")} />} onRefresh={refetch}>
        <Reveal style={{ paddingHorizontal: space.gutter, gap: 16 }}>
          <SearchBarButton placeholder={t("explore.searchPlaceholder")} label={t("a11y.search")} onPress={() => router.push("/search")} />
          <SegmentedControl value={hub} onChange={setHub} options={HUBS.map((h) => ({ value: h, label: t(`hub.${h}`) }))} />
        </Reveal>
        <DirectionalSwap value={hub} order={HUBS}>
          {hub === "launches" && <LaunchesFeed />}
          {hub === "discuss" && <DiscussFeed />}
          {hub === "templates" && <TemplatesFeed />}
          {hub === "prompts" && <PromptsFeed />}
          {hub === "buyouts" && <BuyoutsFeed />}
        </DirectionalSwap>
      </LargeTitleScreen>
    </TabScene>
  );
}

/**
 * 排行榜: the first thing people see. The overall board, or one category's board picked from the chips
 * (docs/DESIGN.md §40); 所有類別 opens the App Store style category list.
 */
function LaunchesFeed() {
  const t = useT();
  const { c } = useTheme();
  const [cat, setCat] = useState<CategoryKey | "all">("all");
  const { data: all } = useLaunches();
  return (
    <View style={{ gap: gap.xl, paddingTop: gap.lg }}>
      <Reveal>
        <CategoryChips items={all ?? []} value={cat} onChange={setCat} />
      </Reveal>
      <LaunchBoard category={cat} eyebrow={cat === "all" ? undefined : t(`category.${cat}`)} index={1} />
      <Reveal index={3} style={{ paddingHorizontal: space.gutter }}>
        <PressableScale onPress={() => requireAuth("auth.reasonList", () => router.push("/studio/new-launch"))} hapticKind="tap" accessibilityLabel={t("listing.launch")} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: radius.card, backgroundColor: c.accentSoft }}>
          <Icon name="rocket" size={24} color={c.accent} active loop="breathe" />
          <View style={{ flex: 1 }}>
            <Txt variant="bodyStrong" tone="accent">
              {t("listing.launch")}
            </Txt>
            <Txt variant="caption" tone="fgMuted">
              {t("listing.launchBody")}
            </Txt>
          </View>
          <Icon name="chevronRight" size={16} color={c.accent} enter={false} />
        </PressableScale>
      </Reveal>
    </View>
  );
}

function PromptsFeed() {
  const t = useT();
  const { data } = usePrompts();
  const { width } = useWindowDimensions();
  const colW = (Math.min(width, 1120) - space.gutter * 2 - 12) / 2;
  if (!data) return <ListSkeleton />;
  return (
    <View style={{ paddingTop: 16 }}>
      <Section eyebrow={t("feed.promptsEyebrow")} title={t("feed.promptsTitle")} index={0}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, paddingHorizontal: space.gutter }}>
          {[...data]
            .sort((a, b) => b.sales - a.sales)
            .map((p) => (
              <PromptCard key={p.slug} p={p} width={colW} />
            ))}
        </View>
      </Section>
    </View>
  );
}

function BuyoutsFeed() {
  const t = useT();
  const { c } = useTheme();
  const { data } = useBuyouts();
  if (!data) return <ListSkeleton />;
  // Sold listings stay visible (social proof) but sink to the bottom.
  const sorted = [...data].sort((a, b) => Number(a.status === "sold") - Number(b.status === "sold"));
  return (
    <View style={{ paddingTop: 16, gap: 16 }}>
      <Section eyebrow={t("feed.buyoutsEyebrow")} title={t("feed.buyoutsTitle")} index={0}>
        <View style={{ gap: 12 }}>
          {sorted.map((b) => (
            <BuyoutCard key={b.slug} b={b} />
          ))}
        </View>
      </Section>
      <Reveal index={1} style={{ marginHorizontal: space.gutter, flexDirection: "row", gap: 12, padding: 16, borderRadius: radius.inset, backgroundColor: c.pendingSoft }}>
        <Icon name="shield" size={18} color={c.pending} active />
        <Txt style={{ flex: 1 }}>{t("buyout.escrowNote")}</Txt>
      </Reveal>
    </View>
  );
}

function ListSkeleton() {
  return (
    <View style={{ gap: 12, paddingHorizontal: space.gutter, paddingTop: 16 }}>
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} height={84} radius={radius.row} />
      ))}
    </View>
  );
}

function TemplatesFeed() {
  const t = useT();
  const { data, isLoading } = useTemplates();
  const [cat, setCat] = useState<CategoryKey | "all">("all");
  const { width } = useWindowDimensions();
  const cardW = Math.min(width, 1120) * 0.44;

  const list = useMemo(() => (data ?? []).filter((x) => cat === "all" || inCategory(x, cat)), [data, cat]);
  const featured = list.filter((x) => x.featured);
  const fresh = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);
  const trending = [...list].filter((x) => x.price > 0).sort((a, b) => b.sales - a.sales).slice(0, 6);
  const free = list.filter((x) => x.price === 0);

  return (
    <View>
      <View style={{ paddingVertical: gap.lg }}>
        <CategoryChips items={data ?? []} value={cat} onChange={setCat} />
      </View>
      {isLoading ? (
        <ExploreSkeleton cardW={cardW} />
      ) : (
        // Re-keying on category cross-fades the whole feed instead of hard-swapping it.
        <Animated.View key={cat} entering={crossfadeIn} style={{ gap: 32, paddingTop: 4 }}>
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
    </View>
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
      contentContainerStyle={{ gap: 12, paddingHorizontal: space.gutter, paddingBottom: 16 }}
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
      <ZoomLink href={`/template/${item.slug}`} accessibilityLabel={item.name} style={[{ backgroundColor: c.bgElevated, borderRadius: radius.hero, padding: gap.md, gap: gap.md }, card]}>
        <ZoomSource>
          <Cover t={item} rounded={nested(radius.hero, gap.md)} />
        </ZoomSource>
        <View style={{ paddingHorizontal: gap.xs, paddingBottom: gap.xs, gap: gap.xs }}>
          <Txt variant="heroTitle" style={{ fontSize: 20, lineHeight: 28 }} numberOfLines={1}>
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
      </ZoomLink>
    </Animated.View>
  );
}

function ExploreSkeleton({ cardW }: { cardW: number }) {
  const { c, card } = useTheme();
  return (
    <View style={{ gap: 32, paddingHorizontal: space.gutter, paddingTop: 4 }}>
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
          <View key={i} style={[{ width: cardW, backgroundColor: c.bgElevated, borderRadius: radius.card, padding: 12, gap: 12 }, card]}>
            <Skeleton height={cardW / 1.6 - 12} radius={radius.media} />
            <Skeleton width="80%" height={14} />
            <Skeleton width="50%" height={12} />
          </View>
        ))}
      </View>
    </View>
  );
}
