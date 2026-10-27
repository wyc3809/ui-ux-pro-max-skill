import { router } from "expo-router";
import { View } from "react-native";
import type { Template } from "@/api/types";
import { useOwned } from "@/api/queries";
import { findCreator } from "@/api/mockServer";
import { PressableScale } from "@/components/ui/PressableScale";
import { PriceTag } from "@/components/ui/PriceTag";
import { RatingStars } from "@/components/ui/RatingStars";
import { Txt } from "@/components/ui/Txt";
import { highlight } from "@/lib/search";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space, font } from "@/theme/tokens";
import { Cover } from "./Cover";

const open = (slug: string) => router.push(`/template/${slug}`);

/** Grid / carousel card: 16:10 cover then name, creator, rating, price. Scales to 0.97 on press. */
export function TemplateCard({ t, width }: { t: Template; width?: number }) {
  const { c, card } = useTheme();
  const owned = useOwned(t.slug);
  return (
    <PressableScale onPress={() => open(t.slug)} accessibilityLabel={t.name} style={[{ width, backgroundColor: c.bgElevated, borderRadius: radius.card, padding: 10, gap: 10 }, card]}>
      <Cover t={t} />
      <View style={{ paddingHorizontal: 4, paddingBottom: 4, gap: 6 }}>
        <Txt variant="bodyStrong" numberOfLines={2}>
          {t.name}
        </Txt>
        <Txt variant="caption" tone="fgSubtle" numberOfLines={1}>
          {findCreator(t.creator)?.name}
        </Txt>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
          <RatingStars value={t.rating} count={t.reviewCount} compact />
          <PriceTag amount={t.price} owned={owned} variant="bodyStrong" />
        </View>
      </View>
    </PressableScale>
  );
}

/** List version used in search results and library; highlights query hits in accent bold (§5). */
export function TemplateRow({ t, query = "", trailing, onOpen }: { t: Template; query?: string; trailing?: React.ReactNode; onOpen?: () => void }) {
  const { c, card } = useTheme();
  const owned = useOwned(t.slug);
  return (
    <PressableScale
      onPress={() => {
        onOpen?.();
        open(t.slug);
      }}
      accessibilityLabel={t.name}
      scaleTo={0.98}
      style={[{ flexDirection: "row", gap: 12, padding: 10, backgroundColor: c.bgElevated, borderRadius: radius.row, marginHorizontal: space.gutter }, card]}
    >
      <Cover t={t} style={{ width: 104 }} rounded={12} />
      <View style={{ flex: 1, gap: 4, justifyContent: "center" }}>
        <Txt variant="bodyStrong" numberOfLines={1} style={{ fontFamily: font.semibold }}>
          {highlight(t.name, query).map((s, i) => (
            <Txt key={i} variant="bodyStrong" tone={s.hit ? "accent" : "fg"} style={{ fontFamily: s.hit ? font.bold : font.semibold }}>
              {s.text}
            </Txt>
          ))}
        </Txt>
        <Txt variant="caption" tone="fgSubtle" numberOfLines={1}>
          {highlight(t.stack.join(" · "), query).map((s, i) => (
            <Txt key={i} variant="caption" tone={s.hit ? "accent" : "fgSubtle"} style={s.hit ? { fontFamily: font.semibold } : undefined}>
              {s.text}
            </Txt>
          ))}
        </Txt>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <RatingStars value={t.rating} count={t.reviewCount} compact />
          {trailing ?? <PriceTag amount={t.price} owned={owned} variant="bodyStrong" />}
        </View>
      </View>
    </PressableScale>
  );
}
