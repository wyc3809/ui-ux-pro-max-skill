import * as Clipboard from "expo-clipboard";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";
import { findCreator } from "@/api/mockServer";
import { useLaunches, useOwnsPrompt, usePrompt, usePurchasePrompt } from "@/api/queries";
import { CommentsSection } from "@/components/engage/CommentsSection";
import { EngagementPanel } from "@/components/engage/EngagementPanel";
import { useJumpTo } from "@/components/engage/useJumpTo";
import { Typewriter } from "@/components/market/Typewriter";
import { DetailScaffold } from "@/components/shell/DetailScaffold";
import { Field } from "@/components/studio/FormFields";
import { Cover } from "@/components/template/Cover";
import { FavoriteButton } from "@/components/template/FavoriteButton";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { PressableScale } from "@/components/ui/PressableScale";
import { RatingStars } from "@/components/ui/RatingStars";
import { Section } from "@/components/ui/Section";
import { Sheet } from "@/components/ui/Sheet";
import { Skeleton } from "@/components/ui/Skeleton";
import { StickyCTA, type CtaPhase } from "@/components/ui/StickyCTA";
import { toast } from "@/components/ui/Toast";
import { Txt } from "@/components/ui/Txt";
import { useT } from "@/i18n";
import { requireAuth } from "@/store/authGate";
import { formatCount } from "@/lib/format";
import { haptic } from "@/lib/haptic";
import { formatPrice } from "@/lib/price";
import { fillPrompt, promptVariables } from "@/lib/prompt";
import { slideInAt } from "@/theme/animations";
import { useTheme } from "@/theme/ThemeProvider";
import { font, nested, radius } from "@/theme/tokens";
import { Reveal } from "@/components/ui/Reveal";
import { ZoomTarget } from "@/components/ui/ZoomLink";
import { CreatorCard } from "@/components/creator/CreatorCard";

/** Prompt detail: free preview, locked remainder that types itself in after purchase, variable filler, copy. */
export default function PromptScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: p, isLoading } = usePrompt(slug);
  const owned = useOwnsPrompt(slug);
  const purchase = usePurchasePrompt();
  const { c } = useTheme();
  const t = useT();
  const [transient, setTransient] = useState<"processing" | "success" | null>(null);
  const [justUnlocked, setJustUnlocked] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const jumpTo = useJumpTo();
  const { data: launches } = useLaunches();

  const unlocked = owned || p?.price === 0;
  const vars = useMemo(() => (p && unlocked ? promptVariables(p.text) : []), [p, unlocked]);
  const phase: CtaPhase = transient ?? (unlocked ? "send" : "buy");
  const copy = async (text: string) => {
    await Clipboard.setStringAsync(text).catch(() => {});
    toast(t("common.copied"));
  };

  const buy = () => {
    setCheckout(false);
    setTransient("processing");
    purchase.mutate(slug, {
      onSuccess: () => {
        haptic("success");
        setTransient("success");
        setJustUnlocked(true);
        setTimeout(() => setTransient(null), 1500);
      },
      onError: () => {
        setTransient(null);
        toast(t("checkout.failedNoCharge"), "warning");
      },
    });
  };

  if (!isLoading && !p) {
    return (
      <View style={{ flex: 1, justifyContent: "center", backgroundColor: c.bg }}>
        <EmptyState icon="closeCircle" title={t("search.emptyTitle")} body={t("search.emptyBody")} action={{ label: t("library.browse"), onPress: () => router.replace("/") }} />
      </View>
    );
  }

  const creator = p ? findCreator(p.creator) : undefined;
  const lines = p?.text.split("\n") ?? [];
  const previewText = lines.slice(0, p?.previewLines ?? 0).join("\n");
  const locked = p ? (p.lineCount ?? lines.length) - p.previewLines : 0;

  return (
    <DetailScaffold
      scrollRef={jumpTo.ref}
      title={p?.title}
      right={p ? <FavoriteButton slug={`prompt:${p.slug}`} onSurface /> : undefined}
      bottom={p ? <StickyCTA phase={phase} price={p.price} onBuy={() => requireAuth("auth.reasonBuy", () => (p.price === 0 ? buy() : setCheckout(true)))} onSend={() => copy(fillPrompt(p.text, values))} owned={{ label: t("promptPage.copyFilled"), icon: "copy" }} /> : undefined}
    >
      {!p ? (
        <Skeleton height={320} radius={radius.hero} />
      ) : (
        <>
          <Reveal kind="card">
            <Card style={{ gap: 12, padding: 12, borderRadius: radius.hero }}>
              <ZoomTarget>
                <Cover t={p} style={{ aspectRatio: 2 }} rounded={nested(radius.hero, 12)} />
              </ZoomTarget>
              <View style={{ paddingHorizontal: 8, gap: 8 }}>
                <Txt variant="eyebrow" tone="fgSubtle">
                  Prompt · {p.tool}
                </Txt>
                <Txt variant="heroTitle" accessibilityRole="header">
                  {p.title}
                </Txt>
                <Txt variant="heroLede" tone="fgMuted">
                  {p.summary}
                </Txt>
              </View>
              {creator && (
                <PressableScale onPress={() => router.push(`/creator/${creator.handle}`)} scaleTo={0.98} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 8, minHeight: 44 }}>
                  <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: c.accentSoft, alignItems: "center", justifyContent: "center" }}>
                    <Txt tone="accent" style={{ fontFamily: font.bold }}>
                      {creator.name[0]}
                    </Txt>
                  </View>
                  <Txt variant="bodyStrong" style={{ flex: 1 }}>
                    {creator.name}
                  </Txt>
                </PressableScale>
              )}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 8 }}>
                {p.tags.map((tag, i) => (
                  <Tag key={tag} label={tag} index={i} />
                ))}
              </View>
              <View style={{ flexDirection: "row", gap: 16, alignItems: "center", paddingHorizontal: 8, paddingBottom: 8 }}>
                <RatingStars value={p.rating} count={p.reviewCount} />
                <Txt variant="caption" tone="fgSubtle" tabular>
                  {t("promptPage.uses", { n: formatCount(p.sales) })}
                </Txt>
              </View>
            </Card>
          </Reveal>

          <EngagementPanel
            kind="prompt"
            slug={p.slug}
            title={p.title}
            extra={{ icon: "remix", label: t("engage.remixes"), value: (launches ?? []).filter((l) => l.relatedPrompt === p.slug).length }}
            onComments={jumpTo.jump}
          />

          <Section title={unlocked ? p.title : t("promptPage.preview")} index={1} inset={false}>
            <View style={{ backgroundColor: c.bgCode, borderRadius: radius.inset, borderWidth: 1, borderColor: c.border, padding: 16, gap: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Txt variant="eyebrow" tone="fgSubtle" style={{ flex: 1 }}>
                  PROMPT · {p.tool}
                </Txt>
                {unlocked && (
                  <PressableScale onPress={() => copy(p.text)} accessibilityLabel={t("common.copy")} style={{ flexDirection: "row", alignItems: "center", gap: 8, height: 32, paddingHorizontal: 8 }}>
                    <Icon name="copy" size={15} color={c.fgMuted} />
                    <Txt variant="caption" tone="fgMuted" style={{ fontFamily: font.semibold }}>
                      {t("common.copy")}
                    </Txt>
                  </PressableScale>
                )}
              </View>
              {unlocked ? <Typewriter text={p.text} from={justUnlocked ? previewText.length : p.text.length} play={justUnlocked} /> : <Txt variant="code">{previewText}</Txt>}
              {!unlocked && locked > 0 && (
                <View style={{ gap: 8, paddingTop: 4 }}>
                  {Array.from({ length: Math.min(locked, 4) }, (_, i) => (
                    <Skeleton key={i} height={12} width={`${92 - i * 14}%`} radius={4} />
                  ))}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 8 }}>
                    <Icon name="lock" size={17} color={c.accent} active loop="breathe" />
                    <Txt variant="bodyStrong" tone="accent">
                      {t("promptPage.locked", { n: locked })}
                    </Txt>
                  </View>
                </View>
              )}
            </View>
          </Section>

          {unlocked && vars.length > 0 && (
            <Section title={t("promptPage.variables")} index={2} inset={false}>
              <Card style={{ gap: 16 }}>
                <Txt tone="fgMuted">{t("promptPage.variablesHint")}</Txt>
                {vars.map((v) => (
                  <Field key={v} label={`{{${v}}}`} value={values[v] ?? ""} onChangeText={(x) => setValues((s) => ({ ...s, [v]: x }))} autoCapitalize="none" />
                ))}
                <Button label={t("promptPage.copyFilled")} variant="secondary" icon={<Icon name="copy" size={17} color={c.fg} />} onPress={() => copy(fillPrompt(p.text, values))} />
              </Card>
            </Section>
          )}

          <Section title={t("promptPage.sample")} index={2} inset={false}>
            <Card style={{ gap: 12 }}>
              {p.sampleOutput.map((s, i) => (
                <Animated.View key={s} entering={slideInAt(i)} style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                  <Icon name="checkCircle" size={17} color={c.live} active enterDelay={i * 80} />
                  <Txt style={{ flex: 1 }}>{s}</Txt>
                </Animated.View>
              ))}
            </Card>
          </Section>

          <CreatorCard handle={p.creator} listing={`prompt:${p.slug}`} />

          <View onLayout={jumpTo.onLayout}>
            <CommentsSection kind="prompt" slug={p.slug} />
          </View>

          <Sheet
            open={checkout}
            onClose={() => setCheckout(false)}
            title={t("checkout.title")}
            footer={<Button label={t("checkout.pay", { price: formatPrice(p.price, "HKD", t("common.free")) })} onPress={buy} />}
          >
            <Txt variant="section">{p.title}</Txt>
            <Txt tone="fgMuted">{t("promptPage.tool")}：{p.tool}</Txt>
            <Txt variant="caption" tone="fgSubtle">
              {t("checkout.refund")}
            </Txt>
          </Sheet>
        </>
      )}
    </DetailScaffold>
  );
}
