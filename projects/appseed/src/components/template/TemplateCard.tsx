import { View } from "react-native";
import type { Template } from "@/api/types";
import { useOwned } from "@/api/queries";
import { findCreator } from "@/api/mockServer";
import { ZoomLink, ZoomSource } from "@/components/ui/ZoomLink";
import { PriceTag } from "@/components/ui/PriceTag";
import { RatingStars } from "@/components/ui/RatingStars";
import { Txt } from "@/components/ui/Txt";
import { highlight } from "@/lib/search";
import { useTheme } from "@/theme/ThemeProvider";
import { font, gap, nested, radius, space } from "@/theme/tokens";
import { Cover } from "./Cover";

/** Grid / carousel card: 16:10 cover then name, creator, rating, price. The cover zooms into the detail page. */
export function TemplateCard({ t, width }: { t: Template; width?: number }) {
  const { c, card } = useTheme();
  const owned = useOwned(t.slug);
  return (
    <ZoomLink href={`/template/${t.slug}`} accessibilityLabel={t.name} style={[{ width, backgroundColor: c.bgElevated, borderRadius: radius.card, padding: gap.sm, gap: gap.sm }, card]}>
      <ZoomSource>
        <Cover t={t} rounded={nested(radius.card, gap.sm)} />
      </ZoomSource>
      <View style={{ paddingHorizontal: gap.sm, paddingBottom: gap.sm, gap: gap.xs }}>
        <Txt variant="bodyStrong" numberOfLines={2}>
          {t.name}
        </Txt>
        <Txt variant="caption" tone="fgSubtle" numberOfLines={1}>
          {findCreator(t.creator)?.name}
        </Txt>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: gap.xs }}>
          <RatingStars value={t.rating} count={t.reviewCount} compact />
          <PriceTag amount={t.price} owned={owned} variant="bodyStrong" />
        </View>
      </View>
    </ZoomLink>
  );
}

/** List version used in search results and library; highlights query hits in accent bold (§5). */
export function TemplateRow({ t, query = "", trailing, onOpen }: { t: Template; query?: string; trailing?: React.ReactNode; onOpen?: () => void }) {
  const { c, card } = useTheme();
  const owned = useOwned(t.slug);
  return (
    <ZoomLink
      href={`/template/${t.slug}`}
      onOpen={onOpen}
      accessibilityLabel={t.name}
      style={[{ flexDirection: "row", gap: gap.md, padding: gap.sm, backgroundColor: c.bgElevated, borderRadius: radius.row, marginHorizontal: space.gutter }, card]}
    >
      <ZoomSource>
        <Cover t={t} style={{ width: 104 }} rounded={nested(radius.row, gap.sm)} />
      </ZoomSource>
      <View style={{ flex: 1, gap: gap.xs, justifyContent: "center" }}>
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
    </ZoomLink>
  );
}
