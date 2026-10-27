import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, useWindowDimensions, View } from "react-native";
import Animated, { Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, type SharedValue } from "react-native-reanimated";
import { useBuyouts, useLaunches, usePrompts, useTemplates, useVote } from "@/api/queries";
import type { CategoryKey, Launch, Template } from "@/api/types";
import { BuyoutCard, LaunchRow, PromptCard } from "@/components/market/Cards";
import { UpvoteButton } from "@/components/market/UpvoteButton";
import { LargeTitleScreen } from "@/components/shell/LargeTitleScreen";
import { TabScene } from "@/components/shell/TabScene";
import { Cover } from "@/components/template/Cover";
import { TemplateCard } from "@/components/template/TemplateCard";
import { Chip, Tag } from "@/components/ui/Chip";
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
import { crossfadeIn} from "@/theme/animations";
import { useTheme } from "@/theme/ThemeProvider";
import { gap, nested, radius, space } from "@/theme/tokens";
import { Reveal } from "@/components/ui/Reveal";

const CATEGORIES: (CategoryKey | "all")[] = ["all", "tools", "finance", "ai", "games", "hk", "merchant"];

type Hub = "launches" | "templates" | "prompts" | "buyouts";
const HUBS: Hub[] = ["launches", "templates", "prompts", "buyouts"];

export default function Explore() {
  const t = useT();
  const [hub, setHub] = useState<Hub>("launches");
  const templates = useTemplates();
  const launches = useLaunches();
  const prompts = usePrompts();
  const buyouts = useBuyouts();
  const refetch = () => Promise.all([templates.refetch(), launches.refetch(), prompts.refetch(), buyouts.refetch()]);

  return (
    <TabScene index={0}>
      <LargeTitleScreen title={t("explore.title")} right={<HeaderButton icon="settings" motion="spin" label={t("a11y.settings")} onPress={() => router.navigate("/me")} />} onRefresh={refetch}>
        <Reveal style={{ paddingHorizontal: space.gutter, gap: 16 }}>
          <SearchBarButton placeholder={t("explore.searchPlaceholder")} label={t("a11y.search")} onPress={() => router.push("/search")} />
          <SegmentedControl value={hub} onChange={setHub} options={HUBS.map((h) => ({ value: h, label: t(`hub.${h}`) }))} />
        </Reveal>
        <DirectionalSwap value={hub} order={HUBS}>
          {hub === "launches" && <LaunchesFeed />}
          {hub === "templates" && <TemplatesFeed />}
          {hub === "prompts" && <PromptsFeed />}
          {hub === "buyouts" && <BuyoutsFeed />}
        </DirectionalSwap>
      </LargeTitleScreen>
    </TabScene>
  );
}

/** 新作推廣: the day's top launch as a hero, then the ranked board (sponsored slot disclosed), then a call to promote. */
function LaunchesFeed() {
  const t = useT();
  const { c } = useTheme();
  const { data } = useLaunches();
  if (!data) return <ListSkeleton />;
  // The top organic launch gets the hero card; the ranked list continues from #2 (sponsored slot keeps its place).
  const top = data.find((l) => !l.boosted);
  const rest = data.filter((l) => l !== top);
  return (
    <View style={{ gap: 24, paddingTop: 16 }}>
      {top && (
        <Section eyebrow={t("feed.launchesEyebrow")} title={t("feed.launchesTitle")} index={0}>
          <LaunchHero l={top} />
        </Section>
      )}
      <Section index={1}>
        <View style={{ gap: 12 }}>
          {rest.map((l) => (
            // Sponsored launches carry no rank number; organic ranks count only organic launches.
            <LaunchRow key={l.slug} l={l} rank={l.boosted ? undefined : rest.filter((x) => !x.boosted).indexOf(l) + (top ? 2 : 1)} />
          ))}
        </View>
      </Section>
      <Reveal index={2} style={{ paddingHorizontal: space.gutter }}>
        <PressableScale onPress={() => requireAuth("auth.reasonList", () => router.push("/studio/new-launch"))} hapticKind="tap" accessibilityLabel={t("listing.launch")} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: radius.card, backgroundColor: c.accentSoft }}>
          <Icon name="rocket" size={26} color={c.accent} active loop="breathe" />
          <View style={{ flex: 1 }}>
            <Txt variant="bodyStrong" tone="accent">
              {t("listing.launch")}
            </Txt>
            <Txt variant="caption" tone="fgMuted">
              {t("listing.launchBody")}
            </Txt>
          </View>
          <Icon name="chevronRight" size={18} color={c.accent} enter={false} />
        </PressableScale>
      </Reveal>
    </View>
  );
}

function LaunchHero({ l }: { l: Launch & { voted: boolean } }) {
  const { c, card } = useTheme();
  const t = useT();
  const vote = useVote();
  return (
    <View style={{ paddingHorizontal: space.gutter }}>
      <PressableScale onPress={() => router.push(`/launch/${l.slug}`)} accessibilityLabel={l.name} style={[{ backgroundColor: c.bgElevated, borderRadius: radius.hero, padding: gap.md, gap: gap.md }, card]}>
        <Cover t={l} rounded={nested(radius.hero, gap.md)} />
        <View style={{ paddingHorizontal: gap.xs, gap: gap.xs }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Icon name="trophy" size={16} color={c.rating} active motion="wiggle" trigger={l.slug} />
            <Txt variant="eyebrow" tone="fgSubtle">
              {t("launch.rank", { n: 1 })}
            </Txt>
          </View>
          <Txt variant="heroTitle" style={{ fontSize: 20, lineHeight: 28 }}>
            {l.name}
          </Txt>
          <Txt tone="fgMuted" numberOfLines={2}>
            {l.tagline}
          </Txt>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4, gap: 12 }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, flex: 1 }}>
              {l.aiTools.map((tool, i) => (
                <Tag key={tool} label={tool} index={i} />
              ))}
              <Tag label={t("launch.buildDays", { n: l.buildDays })} index={l.aiTools.length} />
            </View>
            <UpvoteButton count={l.upvotes} voted={l.voted} name={l.name} onToggle={() => vote.mutate(l.slug)} size="lg" />
          </View>
        </View>
      </PressableScale>
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

  const list = useMemo(() => (data ?? []).filter((x) => cat === "all" || x.category === cat), [data, cat]);
  const featured = list.filter((x) => x.featured);
  const fresh = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);
  const trending = [...list].filter((x) => x.price > 0).sort((a, b) => b.sales - a.sales).slice(0, 6);
  const free = list.filter((x) => x.price === 0);

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: space.gutter, paddingVertical: 16 }}>
        {CATEGORIES.map((k) => (
          <Chip key={k} label={t(`category.${k}`)} selected={cat === k} onPress={() => setCat(k)} />
        ))}
      </ScrollView>
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
