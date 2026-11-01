import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import Animated from "react-native-reanimated";
import { useLeaderboard, useVote } from "@/api/queries";
import type { Launch } from "@/api/types";
import { LaunchRow } from "@/components/market/Cards";
import { UpvoteButton } from "@/components/market/UpvoteButton";
import { Cover } from "@/components/template/Cover";
import { Chip, Tag } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { ExplainSheet } from "@/components/ui/ExplainSheet";
import { Icon } from "@/components/ui/Icon";
import { PressableScale } from "@/components/ui/PressableScale";
import { Reveal } from "@/components/ui/Reveal";
import { Section } from "@/components/ui/Section";
import { Skeleton } from "@/components/ui/Skeleton";
import { Txt } from "@/components/ui/Txt";
import { useT } from "@/i18n";
import type { Categorized, CategoryKey } from "@/lib/categories";
import { PERIODS, type Period } from "@/lib/ranking";
import { reorder } from "@/theme/animations";
import { useTheme } from "@/theme/ThemeProvider";
import { gap, nested, radius, space } from "@/theme/tokens";

/**
 * 排行榜 for one category, or for everything (docs/DESIGN.md §28, §40). Today, this week or this month, ranked by
 * lib/ranking.ts and explained in a sheet; the top launch gets the hero card, the rest list with rank movement,
 * and the one sponsored slot sits second, labelled and unranked. Every category board uses the same ranking.
 */
export function LaunchBoard({ category = "all", eyebrow, index = 0, initialPeriod = "today" }: { category?: CategoryKey | "all"; eyebrow?: string; index?: number; initialPeriod?: Period }) {
  const t = useT();
  const { c } = useTheme();
  const [period, setPeriod] = useState<Period>(initialPeriod);
  const [how, setHow] = useState(false);
  const { data } = useLeaderboard(period, category);
  const top = data?.board[0];
  const rest = data?.board.slice(1) ?? [];
  const title = { today: t("board.titleToday"), week: t("board.titleWeek"), month: t("board.titleMonth") }[period];
  return (
    <View style={{ gap: gap.xl }}>
      <Reveal index={index} style={{ flexDirection: "row", alignItems: "center", gap: gap.sm, paddingHorizontal: space.gutter }}>
        {PERIODS.map((p) => (
          <Chip key={p} label={t(`board.${p}`)} selected={period === p} onPress={() => setPeriod(p)} />
        ))}
        <View style={{ flex: 1 }} />
        <PressableScale onPress={() => setHow(true)} hitSlop={gap.sm} accessibilityLabel={t("board.how")}>
          <Icon name="info" size={20} color={c.fgSubtle} />
        </PressableScale>
      </Reveal>
      {!data ? (
        <BoardSkeleton />
      ) : !top ? (
        <EmptyState icon="trophy" title={t("board.empty")} body={category === "all" ? t("board.emptyBody") : t("categories.emptyBody")} action={period === "month" ? undefined : { label: t("board.month"), onPress: () => setPeriod("month") }} />
      ) : (
        // Re-keyed per category so switching boards cross-fades instead of reordering one into the other.
        <View key={category} style={{ gap: gap.xl }}>
          <Section eyebrow={eyebrow ?? t("feed.launchesEyebrow")} title={title} index={index + 1}>
            <LaunchHero l={top} period={period} category={category} />
          </Section>
          <Section index={index + 2}>
            <View style={{ gap: gap.md }}>
              {/* Sponsored keeps the second visual slot, directly under the hero, with no rank. */}
              {data.sponsored && <LaunchRow l={data.sponsored} />}
              {rest.map((l) => (
                <Animated.View key={l.slug} layout={reorder}>
                  <LaunchRow l={l} rank={l.rank} movement={l.movement} />
                </Animated.View>
              ))}
            </View>
          </Section>
        </View>
      )}
      <ExplainSheet
        open={how}
        onClose={() => setHow(false)}
        title={t("board.how")}
        points={[
          { icon: "shield", text: t("board.how1") },
          { icon: "people", text: t("board.how2") },
          { icon: "comment", text: t("board.how3") },
          { icon: "timer", text: t("board.how4") },
          { icon: "flag", text: t("board.how5") },
          { icon: "megaphone", text: t("board.how6") },
          { icon: "grid", text: t("board.how7") },
        ]}
      />
    </View>
  );
}

function LaunchHero({ l, period, category }: { l: Launch & { voted: boolean }; period: Period; category: CategoryKey | "all" }) {
  const { c, card } = useTheme();
  const t = useT();
  const vote = useVote();
  const periodLabel = t(`board.${period}`).toLowerCase();
  return (
    <View style={{ paddingHorizontal: space.gutter }}>
      <PressableScale onPress={() => router.push(`/launch/${l.slug}`)} accessibilityLabel={l.name} style={[{ backgroundColor: c.bgElevated, borderRadius: radius.hero, padding: gap.md, gap: gap.md }, card]}>
        <Cover t={l} rounded={nested(radius.hero, gap.md)} />
        <View style={{ paddingHorizontal: gap.xs, gap: gap.xs }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: gap.sm }}>
            <Icon name="trophy" size={16} color={c.rating} active motion="wiggle" trigger={`${category}:${l.slug}`} />
            <Txt variant="eyebrow" tone="fgSubtle">
              {category === "all" ? t("launch.rank", { n: 1, period: periodLabel }) : t("categories.rankIn", { category: t(`category.${category}`), n: 1, period: periodLabel })}
            </Txt>
          </View>
          <Txt variant="heroTitle" style={{ fontSize: 20, lineHeight: 28 }}>
            {l.name}
          </Txt>
          <Txt tone="fgMuted" numberOfLines={2}>
            {l.tagline}
          </Txt>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: gap.xs, gap: gap.md }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: gap.sm, flex: 1 }}>
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

function BoardSkeleton() {
  return (
    <View style={{ gap: gap.md, paddingHorizontal: space.gutter }}>
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} height={84} radius={radius.row} />
      ))}
    </View>
  );
}

/** The most used primary categories in a list, most listings first. */
export function topCategories(items: Categorized[], max = 8): CategoryKey[] {
  const n = new Map<CategoryKey, number>();
  for (const x of items) n.set(x.category as CategoryKey, (n.get(x.category as CategoryKey) ?? 0) + 1);
  return [...n.entries()].sort((a, b) => b[1] - a[1]).slice(0, max).map(([k]) => k);
}

/**
 * Category filter chips over a feed: 全部, the categories that list has most, then 所有類別, which opens the
 * full App Store style category list.
 */
export function CategoryChips({ items, value, onChange }: { items: Categorized[]; value: CategoryKey | "all"; onChange: (k: CategoryKey | "all") => void }) {
  const t = useT();
  const { c } = useTheme();
  const keys = topCategories(items);
  // A category picked from elsewhere stays visible even if it is not among the top ones.
  if (value !== "all" && !keys.includes(value)) keys.unshift(value);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: gap.sm, paddingHorizontal: space.gutter }}>
      <Chip label={t("category.all")} selected={value === "all"} onPress={() => onChange("all")} />
      {keys.map((k) => (
        <Chip key={k} label={t(`category.${k}`)} selected={value === k} onPress={() => onChange(k)} />
      ))}
      <Chip label={t("categories.more")} onPress={() => router.push("/categories")} trailing={<Icon name="chevronRight" size={14} color={c.fgMuted} enter={false} />} />
    </ScrollView>
  );
}
