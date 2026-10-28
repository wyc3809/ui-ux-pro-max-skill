import { router } from "expo-router";
import { Linking, View } from "react-native";
import Animated from "react-native-reanimated";
import { findCreator } from "@/api/mockServer";
import { useCreator } from "@/api/queries";
import type { Creator } from "@/api/types";
import { Card } from "@/components/ui/Card";
import { BrandIcon, Icon } from "@/components/ui/Icon";
import { PressableScale } from "@/components/ui/PressableScale";
import { Txt } from "@/components/ui/Txt";
import { useT } from "@/i18n";
import { haptic } from "@/lib/haptic";
import { useModeration } from "@/components/moderation/ModerationSheet";
import { linkList, socialLabel, socialUrl, type Social } from "@/lib/socialLinks";
import { popIn } from "@/theme/animations";
import { useTheme } from "@/theme/ThemeProvider";
import { font, gap, radius } from "@/theme/tokens";

/** Product names are the same in every language; the website label comes from i18n. */
export const SOCIAL_NAME: Record<Exclude<Social, "website">, string> = { x: "X", instagram: "Instagram", github: "GitHub", threads: "Threads", linkedin: "LinkedIn", youtube: "YouTube" };

export function SocialIcon({ kind, size = 16, color }: { kind: Social; size?: number; color: string }) {
  return kind === "website" ? <Icon name="globe" size={size} color={color} enter={false} /> : <BrandIcon brand={kind} size={size} color={color} />;
}

/**
 * One chip per link: brand mark + handle, or round 44pt icon buttons when `compact` (listing cards).
 * URLs are built from the stored handle, never taken as typed.
 */
export function SocialLinksRow({ c: creator, center, compact }: { c: Creator; center?: boolean; compact?: boolean }) {
  const { c } = useTheme();
  const t = useT();
  const links = linkList(creator.links);
  if (!links.length) return null;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: gap.sm, justifyContent: center ? "center" : "flex-start" }}>
      {links.map((l, i) => {
        const site = l.kind === "website" ? t("creator.website") : SOCIAL_NAME[l.kind];
        return (
          <Animated.View key={l.kind} entering={popIn(i)}>
            <PressableScale
              onPress={() => {
                haptic("tap");
                Linking.openURL(socialUrl(l.kind, l.value));
              }}
              accessibilityRole="link"
              accessibilityLabel={`${t("creator.open", { site })} ${socialLabel(l.kind, l.value)}`}
              scaleTo={0.92}
              style={
                compact
                  ? { width: 44, height: 44, borderRadius: radius.chip, backgroundColor: c.bgMuted, alignItems: "center", justifyContent: "center" }
                  : { flexDirection: "row", alignItems: "center", gap: gap.xs, height: 36, paddingHorizontal: gap.md, borderRadius: radius.chip, backgroundColor: c.bgMuted }
              }
            >
              <SocialIcon kind={l.kind} size={compact ? 20 : 16} color={c.fg} />
              {!compact && (
                <Txt variant="caption" style={{ fontFamily: font.semibold }}>
                  {socialLabel(l.kind, l.value)}
                </Txt>
              )}
            </PressableScale>
          </Animated.View>
        );
      })}
    </View>
  );
}

/**
 * "About the creator" card under every listing (§29): avatar, name, founding badge, bio, listing count and
 * their social links, so makers can send buyers to X, Instagram, GitHub and the rest.
 */
/** `listing` ("kind:slug") adds a quiet "Report this listing" row, the takedown entry for IP claims. */
export function CreatorCard({ handle, listing }: { handle: string; listing?: string }) {
  const { c } = useTheme();
  const t = useT();
  const { data } = useCreator(handle);
  const moderation = useModeration();
  const creator = data?.creator ?? findCreator(handle);
  if (!creator) return null;
  return (
    <View style={{ gap: gap.md }}>
      <Txt variant="section">{t("creator.about")}</Txt>
      <Card style={{ gap: gap.lg }}>
        <PressableScale onPress={() => router.push(`/creator/${creator.handle}` as never)} accessibilityLabel={`${creator.name} ${t("creator.viewProfile")}`} scaleTo={0.99} style={{ flexDirection: "row", alignItems: "center", gap: gap.md }}>
          <View style={{ width: 48, height: 48, borderRadius: radius.chip, backgroundColor: c.accentSoft, alignItems: "center", justifyContent: "center" }}>
            <Txt variant="section" tone="accent" style={{ fontFamily: font.bold }}>
              {creator.name.slice(0, 1).toUpperCase()}
            </Txt>
          </View>
          <View style={{ flex: 1, gap: gap.xxs }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: gap.sm }}>
              <Txt variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
                {creator.name}
              </Txt>
              {creator.founding && <Icon name="checkCircle" size={14} color={c.accent} active enter={false} />}
            </View>
            <Txt variant="caption" tone="fgSubtle" numberOfLines={1}>
              @{creator.handle}
              {data ? ` · ${t("creator.works", { n: data.templates.length })}` : ""}
            </Txt>
          </View>
          <Icon name="chevronRight" size={16} color={c.fgSubtle} motion="nudge" />
        </PressableScale>
        {creator.bio ? <Txt tone="fgMuted">{creator.bio}</Txt> : null}
        <SocialLinksRow c={creator} compact />
      </Card>
      {listing && (
        <PressableScale onPress={() => moderation.ask({ kind: "listing", id: listing, handle: creator.handle })} accessibilityLabel={t("moderation.reportListing")} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: gap.xs, minHeight: 44 }}>
          <Icon name="flag" size={14} color={c.fgSubtle} enter={false} />
          <Txt variant="caption" tone="fgSubtle">
            {t("moderation.reportListing")}
          </Txt>
        </PressableScale>
      )}
      {moderation.sheet}
    </View>
  );
}
