import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";
import { useBuyouts, useOffers, usePromptPurchases, usePrompts, usePurchases, useTemplates } from "@/api/queries";
import type { BuyoutListing, Offer, PromptListing, Template } from "@/api/types";
import { BuyoutCard, PromptRow, TonePill } from "@/components/market/Cards";
import { LargeTitleScreen } from "@/components/shell/LargeTitleScreen";
import { TabScene } from "@/components/shell/TabScene";
import { TemplateRow } from "@/components/template/TemplateCard";
import { DirectionalSwap } from "@/components/ui/DirectionalSwap";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon, type IconName } from "@/components/ui/Icon";
import { PressableScale } from "@/components/ui/PressableScale";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Skeleton } from "@/components/ui/Skeleton";
import { Txt } from "@/components/ui/Txt";
import { useT } from "@/i18n";
import { shouldAnimateItems } from "@/lib/motion";
import { formatPrice } from "@/lib/price";
import { useAuthGate } from "@/store/authGate";
import { useFavorites } from "@/store/favorites";
import { useSession } from "@/store/session";
import { reorder, rowIn, rowOut } from "@/theme/animations";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space, font } from "@/theme/tokens";

type Seg = "owned" | "prompts" | "offers" | "saved";
const SEGS: Seg[] = ["owned", "prompts", "offers", "saved"];

type Item =
  | { kind: "template"; key: string; t: Template }
  | { kind: "prompt"; key: string; p: PromptListing }
  | { kind: "buyout"; key: string; b: BuyoutListing; offer?: Offer };

export default function LibraryScreen() {
  const t = useT();
  const { c } = useTheme();
  const [seg, setSeg] = useState<Seg>("owned");
  const templates = useTemplates().data;
  const prompts = usePrompts().data;
  const buyouts = useBuyouts().data;
  const purchases = usePurchases();
  const promptPurchases = usePromptPurchases().data;
  const offers = useOffers().data;
  const saved = useFavorites((s) => s.slugs);
  const user = useSession((s) => s.user);
  const openAuth = useAuthGate((s) => s.request);
  const refetch = () => Promise.all([purchases.refetch()]);

  const tpl = (slug: string): Item | null => {
    const x = templates?.find((y) => y.slug === slug);
    return x ? { kind: "template", key: slug, t: x } : null;
  };
  const pr = (slug: string): Item | null => {
    const x = prompts?.find((y) => y.slug === slug);
    return x ? { kind: "prompt", key: `prompt:${slug}`, p: x } : null;
  };
  const bo = (slug: string, offer?: Offer): Item | null => {
    const x = buyouts?.find((y) => y.slug === slug);
    return x ? { kind: "buyout", key: `buyout:${slug}`, b: x, offer } : null;
  };
  // Favourites are namespaced: plain slug = template, "prompt:" / "buyout:" prefixes for the other markets.
  const fromSaved = (k: string) => (k.startsWith("prompt:") ? pr(k.slice(7)) : k.startsWith("buyout:") ? bo(k.slice(7)) : tpl(k));
  const items: Item[] = (
    seg === "owned" ? (purchases.data ?? []).map(tpl) : seg === "prompts" ? (promptPurchases ?? []).map(pr) : seg === "offers" ? (offers ?? []).map((o) => bo(o.slug, o)) : saved.map(fromSaved)
  ).filter((x): x is Item => x != null);

  // Per-row enter/exit only for small changes (e.g. one unsave); first load and bulk syncs appear at once (§8).
  const prevCount = useRef<number | null>(null);
  const animateRows = prevCount.current != null && shouldAnimateItems(Math.abs(items.length - prevCount.current), false);
  useEffect(() => {
    prevCount.current = items.length;
  });

  const empty = {
    owned: { icon: "package", title: t("library.emptyOwnedTitle"), body: t("library.emptyOwnedBody") },
    prompts: { icon: "terminal", title: t("mine.emptyPromptsTitle"), body: t("mine.emptyPromptsBody") },
    offers: { icon: "hand", title: t("mine.emptyOffersTitle"), body: t("mine.emptyOffersBody") },
    saved: { icon: "bookmark", title: t("library.emptySavedTitle"), body: t("library.emptySavedBody") },
  } as const;

  return (
    <TabScene index={1}>
      <LargeTitleScreen title={t("library.title")} onRefresh={refetch}>
        <View style={{ paddingHorizontal: space.gutter, paddingBottom: 16 }}>
          <SegmentedControl
            value={seg}
            onChange={(v) => {
              prevCount.current = null;
              setSeg(v);
            }}
            options={[
              { value: "owned", label: t("library.owned") },
              { value: "prompts", label: t("mine.prompts") },
              { value: "offers", label: t("mine.offers") },
              { value: "saved", label: t("library.saved") },
            ]}
          />
        </View>
        <DirectionalSwap value={seg} order={SEGS}>
          {!user ? (
            <EmptyState icon="user" title={t("auth.title")} body={t("me.signIn")} action={{ label: t("auth.title"), onPress: () => openAuth(null) }} />
          ) : purchases.isLoading ? (
            <View style={{ paddingHorizontal: space.gutter, gap: 10 }}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} height={92} radius={radius.row} />
              ))}
            </View>
          ) : items.length === 0 ? (
            <EmptyState icon={empty[seg].icon} title={empty[seg].title} body={empty[seg].body} action={{ label: t("library.browse"), onPress: () => router.navigate("/") }} />
          ) : (
            <View style={{ gap: 10 }}>
              {items.map((x) => (
                <Animated.View key={x.key} entering={animateRows ? rowIn : undefined} exiting={rowOut} layout={reorder} style={{ gap: 6 }}>
                  {x.kind === "template" && (
                    <>
                      <TemplateRow t={x.t} trailing={seg === "owned" && x.t.versions.length > 1 ? <UpdateBadge /> : undefined} />
                      {seg === "owned" && (
                        <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: space.gutter }}>
                          <MiniAction icon="laptop" label={t("cta.send")} onPress={() => router.push(`/template/${x.t.slug}`)} />
                          <MiniAction icon="book" label={t("template.story")} onPress={() => router.push(`/template/${x.t.slug}/story`)} />
                        </View>
                      )}
                    </>
                  )}
                  {x.kind === "prompt" && <PromptRow p={x.p} />}
                  {x.kind === "buyout" && (
                    <>
                      <BuyoutCard b={x.b} />
                      {x.offer && (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: space.gutter, paddingHorizontal: 12, height: 40, borderRadius: radius.control, backgroundColor: c.pendingSoft }}>
                          <Icon name="hand" size={15} color={c.pending} active />
                          <Txt variant="bodyStrong" tabular style={{ flex: 1 }}>
                            {formatPrice(x.offer.amount, "HKD", "")}
                          </Txt>
                          <TonePill label={t(x.offer.status === "sent" ? "mine.offerSent" : x.offer.status === "countered" ? "mine.offerCountered" : "mine.offerAccepted")} tone={x.offer.status === "accepted" ? "live" : x.offer.status === "countered" ? "warn" : "pending"} />
                        </View>
                      )}
                    </>
                  )}
                </Animated.View>
              ))}
            </View>
          )}
        </DirectionalSwap>
      </LargeTitleScreen>
    </TabScene>
  );
}

function UpdateBadge() {
  const { c } = useTheme();
  const t = useT();
  return (
    <View style={{ backgroundColor: c.pendingSoft, borderRadius: 999, paddingHorizontal: 8, height: 22, justifyContent: "center" }}>
      <Txt style={{ fontSize: 12, lineHeight: 16, fontFamily: font.semibold, color: c.pending }}>{t("library.hasUpdate")}</Txt>
    </View>
  );
}

function MiniAction({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const { c } = useTheme();
  const [taps, setTaps] = useState(0);
  return (
    <PressableScale
      onPress={() => {
        setTaps((n) => n + 1);
        onPress();
      }}
      hapticKind="selection" style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 40, borderRadius: radius.control, backgroundColor: c.bgMuted }}>
      <Icon name={icon} size={16} color={c.fg} motion="bounce" trigger={taps} />
      <Txt variant="caption" style={{ fontFamily: font.semibold }}>
        {label}
      </Txt>
    </PressableScale>
  );
}
