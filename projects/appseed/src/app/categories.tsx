import { router } from "expo-router";
import { View } from "react-native";
import { useLaunches, usePrompts, useTemplates } from "@/api/queries";
import { CategoryRow } from "@/components/market/Category";
import { LargeTitleScreen } from "@/components/shell/LargeTitleScreen";
import { HeaderButton } from "@/components/ui/HeaderButton";
import { RowDivider } from "@/components/ui/ListRow";
import { Section } from "@/components/ui/Section";
import { Txt } from "@/components/ui/Txt";
import { useT } from "@/i18n";
import { APPLE_CATEGORIES, categoryCounts, VIBE_CATEGORIES, type CategoryKey } from "@/lib/categories";
import { useTheme } from "@/theme/ThemeProvider";
import { gap, radius, space } from "@/theme/tokens";

/**
 * 類別 (docs/DESIGN.md §40): every category, App Store style. Vibe coding categories first (what people build
 * with AI), then the App Store's own list. Each row shows how many listings it has and opens its leaderboard.
 */
export default function Categories() {
  const t = useT();
  const { data: templates } = useTemplates();
  const { data: prompts } = usePrompts();
  const { data: launches } = useLaunches();
  const counts = categoryCounts([...(templates ?? []), ...(prompts ?? []), ...(launches ?? [])]);
  return (
    <LargeTitleScreen title={t("categories.title")} left={<HeaderButton icon="chevronLeft" motion="nudge" label={t("a11y.backBtn")} onPress={() => router.back()} />} bottomInset={gap.xxl}>
      <View style={{ gap: gap.xxl }}>
        <Group title={t("categories.vibe")} body={t("categories.vibeBody")} keys={VIBE_CATEGORIES} counts={counts} index={0} />
        <Group title={t("categories.apple")} body={t("categories.appleBody")} keys={[...APPLE_CATEGORIES]} counts={counts} index={1} />
      </View>
    </LargeTitleScreen>
  );
}

function Group({ title, body, keys, counts, index }: { title: string; body: string; keys: CategoryKey[]; counts: Partial<Record<CategoryKey, number>>; index: number }) {
  const t = useT();
  const { c, card } = useTheme();
  return (
    <Section title={title} index={index}>
      <Txt variant="caption" tone="fgMuted" style={{ paddingHorizontal: space.gutter, marginTop: -gap.sm }}>
        {body}
      </Txt>
      <View style={[{ marginHorizontal: space.gutter, backgroundColor: c.bgElevated, borderRadius: radius.card, paddingVertical: gap.xs }, card]}>
        {keys.map((k, i) => (
          <View key={k}>
            {i > 0 && <RowDivider />}
            <CategoryRow k={k} value={counts[k] ? (counts[k] === 1 ? t("categories.countOne") : t("categories.count", { n: counts[k] })) : undefined} />
          </View>
        ))}
      </View>
    </Section>
  );
}
