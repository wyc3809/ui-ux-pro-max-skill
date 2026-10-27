import { router } from "expo-router";
import { View } from "react-native";
import Animated from "react-native-reanimated";
import { findCreator } from "@/api/mockServer";
import { useOwnsPrompt, useVote } from "@/api/queries";
import type { BuyoutListing, Launch, PromptListing } from "@/api/types";
import { Cover } from "@/components/template/Cover";
import { Tag } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { PressableScale } from "@/components/ui/PressableScale";
import { PriceTag } from "@/components/ui/PriceTag";
import { RatingStars } from "@/components/ui/RatingStars";
import { Txt } from "@/components/ui/Txt";
import { useT } from "@/i18n";
import { buyoutTone, revenueMultiple } from "@/lib/buyout";
import { formatCount } from "@/lib/format";
import { formatPrice } from "@/lib/price";
import { highlight } from "@/lib/search";
import { toneColors } from "@/lib/status";
import { popIn } from "@/theme/animations";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space, font } from "@/theme/tokens";
import { SoldStamp, UpvoteButton } from "./UpvoteButton";

/** Text with query hits in accent bold (§5). */
function Hl({ text, query, variant = "bodyStrong" as const }: { text: string; query: string; variant?: "bodyStrong" }) {
  return (
    <Txt variant={variant} numberOfLines={1} style={{ fontFamily: font.semibold }}>
      {highlight(text, query).map((s, i) => (
        <Txt key={i} variant={variant} tone={s.hit ? "accent" : "fg"} style={{ fontFamily: s.hit ? font.bold : font.semibold }}>
          {s.text}
        </Txt>
      ))}
    </Txt>
  );
}

export function TonePill({ label, tone }: { label: string; tone: "live" | "pending" | "ended" | "warn" | "danger" }) {
  const { c } = useTheme();
  const { fg, bg } = toneColors(tone, c);
  return (
    <Animated.View entering={popIn(0)} accessible accessibilityLabel={label} style={{ alignSelf: "flex-start", paddingHorizontal: 9, height: 22, justifyContent: "center", borderRadius: radius.chip, backgroundColor: bg }}>
      <Txt style={{ fontSize: 12, lineHeight: 16, fontFamily: font.semibold, color: fg }}>{label}</Txt>
    </Animated.View>
  );
}

/** Grid card for a prompt: gradient tile, tool, rating and price. */
export function PromptCard({ p, width }: { p: PromptListing; width?: number }) {
  const { c, card } = useTheme();
  const owned = useOwnsPrompt(p.slug);
  return (
    <PressableScale onPress={() => router.push(`/prompt/${p.slug}`)} accessibilityLabel={p.title} style={[{ width, backgroundColor: c.bgElevated, borderRadius: radius.card, padding: 10, gap: 10 }, card]}>
      <Cover t={p} style={{ aspectRatio: 16 / 9 }} />
      <View style={{ paddingHorizontal: 4, paddingBottom: 4, gap: 6 }}>
        <Txt variant="bodyStrong" numberOfLines={2}>
          {p.title}
        </Txt>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Icon name="terminal" size={13} color={c.fgSubtle} enter={false} />
          <Txt variant="caption" tone="fgSubtle" numberOfLines={1}>
            {p.tool}
          </Txt>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
          <RatingStars value={p.rating} count={p.reviewCount} compact />
          <PriceTag amount={p.price} owned={owned} variant="bodyStrong" />
        </View>
      </View>
    </PressableScale>
  );
}

export function PromptRow({ p, query = "" }: { p: PromptListing; query?: string }) {
  const { c, card } = useTheme();
  const owned = useOwnsPrompt(p.slug);
  return (
    <PressableScale onPress={() => router.push(`/prompt/${p.slug}`)} scaleTo={0.98} accessibilityLabel={p.title} style={[{ flexDirection: "row", gap: 12, padding: 10, backgroundColor: c.bgElevated, borderRadius: radius.row, marginHorizontal: space.gutter }, card]}>
      <Cover t={p} style={{ width: 88, aspectRatio: 1 }} rounded={12} />
      <View style={{ flex: 1, gap: 4, justifyContent: "center" }}>
        <Hl text={p.title} query={query} />
        <Txt variant="caption" tone="fgSubtle" numberOfLines={1}>
          Prompt · {p.tool}
        </Txt>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <RatingStars value={p.rating} count={p.reviewCount} compact />
          <PriceTag amount={p.price} owned={owned} variant="bodyStrong" />
        </View>
      </View>
    </PressableScale>
  );
}

/** Buyout listing: the numbers a buyer screens on first (revenue, users, multiple), asking price and status. */
export function BuyoutCard({ b, query = "" }: { b: BuyoutListing; query?: string }) {
  const { c, card } = useTheme();
  const t = useT();
  const multiple = revenueMultiple(b.asking, b.monthlyRevenue);
  return (
    <PressableScale onPress={() => router.push(`/buyout/${b.slug}`)} scaleTo={0.98} accessibilityLabel={b.name} style={[{ backgroundColor: c.bgElevated, borderRadius: radius.card, padding: 12, gap: 12, marginHorizontal: space.gutter, opacity: b.status === "sold" ? 0.82 : 1 }, card]}>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <Cover t={b} style={{ width: 72, aspectRatio: 1 }} rounded={14} />
        <View style={{ flex: 1, gap: 4 }}>
          <Hl text={b.name} query={query} />
          <Txt variant="caption" tone="fgMuted" numberOfLines={2}>
            {b.tagline}
          </Txt>
          <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
            <TonePill label={t(`buyout.${b.status}`)} tone={buyoutTone(b.status)} />
            {b.verified && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                <Icon name="shield" size={13} color={c.live} active enter={false} />
                <Txt variant="caption" tone="live">
                  {t("buyout.verified")}
                </Txt>
              </View>
            )}
          </View>
        </View>
      </View>
      <View style={{ flexDirection: "row", borderRadius: radius.inset, backgroundColor: c.bgMuted, paddingVertical: 10 }}>
        <Metric label={t("buyout.monthlyRevenue")} value={b.monthlyRevenue > 0 ? formatPrice(b.monthlyRevenue, "HKD", "") : t("buyout.preRevenue")} />
        <Metric label={t("buyout.mau")} value={formatCount(b.monthlyActive)} />
        <Metric label={t("buyout.asking")} value={formatPrice(b.asking, "HKD", "")} strong />
      </View>
      {multiple != null && (
        <Txt variant="caption" tone="fgSubtle">
          {t("buyout.multiple", { x: multiple })} · {t("buyout.offers", { n: b.offers })}
        </Txt>
      )}
      {b.status === "sold" && <SoldStamp label={t("buyout.sold")} />}
    </PressableScale>
  );
}

function Metric({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={{ flex: 1, alignItems: "center", gap: 2 }}>
      <Txt variant={strong ? "price" : "bodyStrong"} tabular style={strong ? { fontSize: 16 } : undefined}>
        {value}
      </Txt>
      <Txt variant="caption" tone="fgSubtle" numberOfLines={1}>
        {label}
      </Txt>
    </View>
  );
}

/** Launch board row: rank, cover, name (+ sponsored disclosure), built-with line, upvote. */
export function LaunchRow({ l, rank, query = "" }: { l: Launch & { voted?: boolean }; rank?: number; query?: string }) {
  const { c, card } = useTheme();
  const t = useT();
  const vote = useVote();
  const maker = findCreator(l.maker);
  return (
    <PressableScale onPress={() => router.push(`/launch/${l.slug}`)} scaleTo={0.98} accessibilityLabel={l.name} style={[{ flexDirection: "row", alignItems: "center", gap: 12, padding: 10, backgroundColor: c.bgElevated, borderRadius: radius.row, marginHorizontal: space.gutter }, card]}>
      {l.boosted ? (
        <View style={{ width: 20, alignItems: "center" }}>
          <Icon name="megaphone" size={15} color={c.fgSubtle} enter={false} />
        </View>
      ) : rank == null ? null : (
        <Txt variant="section" tone={rank <= 3 ? "accent" : "fgSubtle"} tabular style={{ width: 20, textAlign: "center", fontFamily: font.bold }}>
          {rank}
        </Txt>
      )}
      <Cover t={l} style={{ width: 56, aspectRatio: 1 }} rounded={14} />
      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={{ flexShrink: 1 }}>
            <Hl text={l.name} query={query} />
          </View>
          {l.boosted && <Tag label={t("launch.sponsored")} />}
        </View>
        <Txt variant="caption" tone="fgMuted" numberOfLines={1}>
          {l.tagline}
        </Txt>
        <Txt variant="caption" tone="fgSubtle" numberOfLines={1}>
          {maker?.name} · {t("launch.buildDays", { n: l.buildDays })} · {l.aiTools.join(" + ")}
        </Txt>
      </View>
      <UpvoteButton count={l.upvotes} voted={!!l.voted} name={l.name} onToggle={() => vote.mutate(l.slug)} />
    </PressableScale>
  );
}
