import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, View } from "react-native";
import { usePrompts, useTemplates } from "@/api/queries";
import type { Template } from "@/api/types";
import { CategoryLink, CategoryTile } from "@/components/market/Category";
import { LaunchBoard } from "@/components/market/LaunchBoard";
import { LargeTitleScreen } from "@/components/shell/LargeTitleScreen";
import { Cover } from "@/components/template/Cover";
import { EmptyState } from "@/components/ui/EmptyState";
import { HeaderButton } from "@/components/ui/HeaderButton";
import { RowDivider } from "@/components/ui/ListRow";
import { PressableScale } from "@/components/ui/PressableScale";
import { PriceTag } from "@/components/ui/PriceTag";
import { Reveal } from "@/components/ui/Reveal";
import { Section } from "@/components/ui/Section";
import { Txt } from "@/components/ui/Txt";
import { useT } from "@/i18n";
import { appleCategoryOf, inCategory, isCategory, isVibe, topCharts, vibeChildren, type CategoryKey } from "@/lib/categories";
import { useTheme } from "@/theme/ThemeProvider";
import { font, gap, nested, radius, space } from "@/theme/tokens";

/**
 * One category, the App Store way (docs/DESIGN.md §40): its own launch leaderboard (same ranking, only this
 * category's launches), then top paid and top free templates by sales, then top prompts. A vibe coding category
 * links up to its App Store category; an App Store category lists the vibe categories inside it.
 */
export default function CategoryScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const t = useT();
  const back = <HeaderButton icon="chevronLeft" motion="nudge" label={t("a11y.backBtn")} onPress={() => (router.canGoBack() ? router.back() : router.replace("/categories"))} />;
  if (!isCategory(key)) {
    return (
      <LargeTitleScreen title={t("categories.title")} left={back} bottomInset={gap.xxl}>
        <EmptyState icon="grid" title={t("categories.notFound")} body={t("search.emptyBody")} action={{ label: t("categories.more"), onPress: () => router.replace("/categories") }} />
      </LargeTitleScreen>
    );
  }
  return (
    <LargeTitleScreen title={t(`category.${key}`)} left={back} bottomInset={gap.xxl}>
      <View style={{ gap: gap.xxl }}>
        <Header k={key} />
        {/* A single category has far fewer launches than the whole board, so its page opens on the month. */}
        <LaunchBoard key={key} category={key} eyebrow={t("categories.board")} index={1} initialPeriod="month" />
        <Charts k={key} />
      </View>
    </LargeTitleScreen>
  );
}

function Header({ k }: { k: CategoryKey }) {
  const t = useT();
  const children = isVibe(k) ? [] : vibeChildren(k);
  return (
    <Reveal style={{ gap: gap.md }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: gap.md, paddingHorizontal: space.gutter }}>
        <CategoryTile k={k} size={48} active />
        <View style={{ flex: 1, gap: gap.xs, alignItems: "flex-start" }}>
          <Txt variant="caption" tone="fgMuted">
            {isVibe(k) ? t("categories.vibe") : t("categories.apple")}
          </Txt>
          {isVibe(k) && (
            <PressableScale onPress={() => router.push(`/category/${appleCategoryOf(k)}`)} hapticKind="selection" accessibilityRole="link" hitSlop={gap.sm}>
              <Txt variant="caption" tone="accent" style={{ fontFamily: font.semibold }}>
                {t("categories.parent", { name: t(`category.${appleCategoryOf(k)}`) })}
              </Txt>
            </PressableScale>
          )}
        </View>
      </View>
      {children.length > 0 && (
        <View style={{ gap: gap.sm }}>
          <Txt variant="eyebrow" tone="fgSubtle" style={{ paddingHorizontal: space.gutter }}>
            {t("categories.children")}
          </Txt>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: gap.sm, paddingHorizontal: space.gutter }}>
            {children.map((v) => (
              <CategoryLink key={v} k={v} />
            ))}
          </ScrollView>
        </View>
      )}
    </Reveal>
  );
}

function Charts({ k }: { k: CategoryKey }) {
  const t = useT();
  const { data: templates } = useTemplates();
  const { data: prompts } = usePrompts();
  const { paid, free } = topCharts(templates ?? [], k);
  const topPrompts = (prompts ?? []).filter((p) => inCategory(p, k)).sort((a, b) => b.sales - a.sales).slice(0, 10);
  return (
    <>
      <Chart title={t("categories.topPaid")} index={4} items={paid.map((x) => ({ slug: x.slug, href: `/template/${x.slug}`, name: x.name, sub: x.tagline, price: x.price, art: x }))} />
      <Chart title={t("categories.topFree")} index={5} items={free.map((x) => ({ slug: x.slug, href: `/template/${x.slug}`, name: x.name, sub: x.tagline, price: x.price, art: x }))} />
      <Chart title={t("categories.topPrompts")} index={6} items={topPrompts.map((p) => ({ slug: p.slug, href: `/prompt/${p.slug}`, name: p.title, sub: p.summary, price: p.price, art: p }))} />
    </>
  );
}

type ChartItem = { slug: string; href: `/${string}`; name: string; sub: string; price: number; art: { cover: Template["cover"]; media?: Template["media"] } };

/** A numbered top chart, like the App Store's Top Paid / Top Free lists. Hidden when the category has none. */
function Chart({ title, items, index }: { title: string; items: ChartItem[]; index: number }) {
  const { c, card } = useTheme();
  if (items.length === 0) return null;
  return (
    <Section title={title} index={index}>
      <View style={[{ marginHorizontal: space.gutter, backgroundColor: c.bgElevated, borderRadius: radius.card, padding: gap.xs }, card]}>
        {items.map((x, i) => (
          <View key={x.slug}>
            {i > 0 && <RowDivider />}
            <PressableScale onPress={() => router.push(x.href)} scaleTo={0.985} accessibilityLabel={`${i + 1}. ${x.name}`} style={{ flexDirection: "row", alignItems: "center", gap: gap.md, padding: gap.sm, borderRadius: nested(radius.card, gap.xs) }}>
              <Txt variant="section" tone={i < 3 ? "accent" : "fgSubtle"} tabular style={{ width: 24, textAlign: "center", fontFamily: font.bold }}>
                {i + 1}
              </Txt>
              <Cover t={x.art} style={{ width: 48, aspectRatio: 1 }} rounded={radius.control} />
              <View style={{ flex: 1, gap: gap.xxs }}>
                <Txt variant="bodyStrong" numberOfLines={1}>
                  {x.name}
                </Txt>
                <Txt variant="caption" tone="fgMuted" numberOfLines={1}>
                  {x.sub}
                </Txt>
              </View>
              <PriceTag amount={x.price} />
            </PressableScale>
          </View>
        ))}
      </View>
    </Section>
  );
}
