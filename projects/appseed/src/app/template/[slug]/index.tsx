import { BlurView } from "expo-blur";
import * as Clipboard from "expo-clipboard";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Platform, Share, View } from "react-native";
import Animated, { Extrapolation, interpolate, ReduceMotion, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { findCreator } from "@/api/mockServer";
import { useOwned, usePurchase, useTemplate } from "@/api/queries";
import type { Template } from "@/api/types";
import { countFiles, FileTree } from "@/components/template/FileTree";
import { FavoriteButton } from "@/components/template/FavoriteButton";
import { MediaCarousel } from "@/components/template/MediaCarousel";
import { ReviewRow } from "@/components/template/ReviewRow";
import { StackChips } from "@/components/template/StackChips";
import { StoryStep } from "@/components/template/StoryStep";
import { VersionTimeline } from "@/components/template/VersionTimeline";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { HeaderButton } from "@/components/ui/HeaderButton";
import { Icon } from "@/components/ui/Icon";
import { ListRow, RowDivider } from "@/components/ui/ListRow";
import { PressableScale } from "@/components/ui/PressableScale";
import { RatingStars } from "@/components/ui/RatingStars";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Sheet } from "@/components/ui/Sheet";
import { Skeleton } from "@/components/ui/Skeleton";
import { StickyCTA, type CtaPhase } from "@/components/ui/StickyCTA";
import { toast } from "@/components/ui/Toast";
import { Txt } from "@/components/ui/Txt";
import { useT } from "@/i18n";
import { formatBytes, formatCount, formatDate } from "@/lib/format";
import { haptic } from "@/lib/haptic";
import { tabEnterOffset } from "@/lib/motion";
import { formatPrice } from "@/lib/price";
import { enterAt, popIn, slideInAt } from "@/theme/animations";
import { useTheme } from "@/theme/ThemeProvider";
import { motion, radius, space } from "@/theme/tokens";

type Seg = "overview" | "story" | "files" | "reviews" | "versions";
const SEGS: Seg[] = ["overview", "story", "files", "reviews", "versions"];

export default function TemplateScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: tpl, isLoading } = useTemplate(slug);
  const { c } = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const owned = useOwned(slug);
  const purchase = usePurchase();
  const [seg, setSeg] = useState<Seg>("overview");
  const [transient, setTransient] = useState<"processing" | "success" | null>(null);
  const [sheet, setSheet] = useState<"checkout" | "send" | "license" | null>(null);

  const y = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    y.value = e.contentOffset.y;
  });
  const headerBg = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [120, 200], [0, 1], Extrapolation.CLAMP) }));

  const phase: CtaPhase = transient ?? (owned ? "send" : "buy");

  const buy = () => {
    setSheet(null);
    setTransient("processing");
    purchase.mutate(slug, {
      onSuccess: () => {
        haptic("success");
        setTransient("success");
        // Hold the green "purchased" moment, then settle into "send to computer".
        setTimeout(() => setTransient(null), 1500);
      },
      onError: () => {
        setTransient(null);
        toast(t("checkout.failedNoCharge"), "warning");
      },
    });
  };

  if (!isLoading && !tpl) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, justifyContent: "center" }}>
        <EmptyState icon="closeCircle" title={t("search.emptyTitle")} body={t("search.emptyBody")} action={{ label: t("library.browse"), onPress: () => router.replace("/") }} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + 56, paddingBottom: 64 + insets.bottom + 32 }}>
        {tpl ? (
          <>
            <Animated.View entering={enterAt(0)} style={{ paddingHorizontal: space.gutter }}>
              <Hero t={tpl} />
            </Animated.View>
            <Animated.View entering={enterAt(1)} style={{ paddingHorizontal: space.gutter, paddingTop: 20, paddingBottom: 16 }}>
              <SegmentedControl value={seg} onChange={setSeg} options={SEGS.map((s) => ({ value: s, label: t(`template.${s}`) }))} />
            </Animated.View>
            <Animated.View entering={enterAt(2)} style={{ paddingHorizontal: space.gutter }}>
              <SegmentBody seg={seg}>
                {seg === "overview" && <Overview t={tpl} onLicense={() => setSheet("license")} />}
                {seg === "story" && <StoryPreview t={tpl} owned={owned} />}
                {seg === "files" && <Files t={tpl} />}
                {seg === "reviews" && <Reviews t={tpl} />}
                {seg === "versions" && (
                  <Card>
                    <VersionTimeline versions={tpl.versions} />
                  </Card>
                )}
              </SegmentBody>
              <Footer t={tpl} />
            </Animated.View>
          </>
        ) : (
          <HeroSkeleton />
        )}
      </Animated.ScrollView>

      {/* Floating header: buttons always visible, a solid bar + title fade in once the hero scrolls away. */}
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, paddingTop: insets.top }}>
        <Animated.View style={[{ position: "absolute", inset: 0, backgroundColor: c.bg, borderBottomWidth: 1, borderBottomColor: c.border }, headerBg]} />
        <View style={{ height: 52, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: space.gutter }}>
          <HeaderButton icon="chevronLeft" motion="nudge" label={t("a11y.backBtn")} onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} />
          <Animated.View style={[{ flex: 1 }, headerBg]}>
            <Txt variant="section" numberOfLines={1} style={{ textAlign: "center" }}>
              {tpl?.name}
            </Txt>
          </Animated.View>
          <HeaderButton icon="share" motion="bounce" label="Share" onPress={() => tpl && Share.share({ message: `${tpl.name} https://appseed.app/t/${tpl.slug}` })} />
          {tpl && <FavoriteButton slug={tpl.slug} onSurface />}
        </View>
      </View>

      {tpl && <StickyCTA phase={phase} price={tpl.price} onBuy={() => (tpl.price === 0 ? buy() : setSheet("checkout"))} onSend={() => setSheet("send")} />}

      {tpl && (
        <>
          <CheckoutSheet t={tpl} open={sheet === "checkout"} onClose={() => setSheet(null)} onConfirm={buy} onLicense={() => setSheet("license")} />
          <SendSheet t={tpl} open={sheet === "send"} onClose={() => setSheet(null)} />
          <LicenseSheet t={tpl} open={sheet === "license"} onClose={() => setSheet(null)} />
        </>
      )}
    </View>
  );
}

/** Segment content slides 18px from the side of the newly selected tab and fades in (same rule as tab switching). */
function SegmentBody({ seg, children }: { seg: Seg; children: React.ReactNode }) {
  const [prev, setPrev] = useState(seg);
  const x = useSharedValue(0);
  const o = useSharedValue(1);
  useEffect(() => {
    if (prev === seg) return;
    const cfg = { duration: motion.tab.duration, easing: motion.tab.easing, reduceMotion: ReduceMotion.System };
    x.value = tabEnterOffset(SEGS.indexOf(prev), SEGS.indexOf(seg), motion.tab.offset);
    o.value = 0;
    x.value = withTiming(0, cfg);
    o.value = withTiming(1, cfg);
    setPrev(seg);
  }, [seg, prev, x, o]);
  const a = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateX: x.value }] }));
  return <Animated.View style={a}>{children}</Animated.View>;
}

function Hero({ t: tpl }: { t: Template }) {
  const { c, card } = useTheme();
  const t = useT();
  const creator = findCreator(tpl.creator);
  return (
    <View style={[{ backgroundColor: c.bgElevated, borderRadius: radius.hero, padding: 12, gap: 14 }, card]}>
      <MediaCarousel t={tpl} />
      <View style={{ paddingHorizontal: 6, gap: 6 }}>
        <Txt variant="heroTitle" numberOfLines={2} accessibilityRole="header">
          {tpl.name}
        </Txt>
        <Txt variant="heroLede" tone="fgMuted" numberOfLines={2}>
          {tpl.tagline}
        </Txt>
      </View>
      {creator && (
        <PressableScale onPress={() => router.push(`/creator/${creator.handle}`)} scaleTo={0.98} accessibilityLabel={t("template.by", { name: creator.name })} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 6, minHeight: 44 }}>
          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c.accentSoft, alignItems: "center", justifyContent: "center" }}>
            <Txt tone="accent" style={{ fontFamily: "DMSans_800ExtraBold" }}>
              {creator.name[0]}
            </Txt>
          </View>
          <Txt variant="bodyStrong" style={{ flex: 1 }}>
            {creator.name}
          </Txt>
          {creator.founding && (
            <View style={{ backgroundColor: c.accentSoft, borderRadius: 999, paddingHorizontal: 8, height: 22, justifyContent: "center" }}>
              <Txt style={{ fontSize: 11, fontFamily: "DMSans_700Bold", color: c.accent }}>{t("creator.founding")}</Txt>
            </View>
          )}
        </PressableScale>
      )}
      <View style={{ paddingHorizontal: 6 }}>
        <StackChips stack={tpl.stack} />
      </View>
      <View style={{ flexDirection: "row", paddingHorizontal: 6, paddingBottom: 6, gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <RatingStars value={tpl.rating} count={tpl.reviewCount} />
        <Txt variant="caption" tone="fgSubtle" tabular>
          {t("common.sales")} {formatCount(tpl.sales)}
        </Txt>
        <Txt variant="caption" tone="fgSubtle">
          {t("common.updated")} {formatDate(tpl.updatedAt, t.locale)}
        </Txt>
      </View>
    </View>
  );
}

function Overview({ t: tpl, onLicense }: { t: Template; onLicense: () => void }) {
  const t = useT();
  return (
    <View style={{ gap: 14 }}>
      <Card style={{ gap: 10 }}>
        <Txt variant="section">{t("template.features")}</Txt>
        {tpl.features.map((f, i) => (
          <Bullet key={f} text={f} index={i} />
        ))}
      </Card>
      <Card style={{ gap: 8 }}>
        <Txt variant="section">{t("template.forWho")}</Txt>
        <Txt tone="fgMuted">{tpl.forWho}</Txt>
      </Card>
      <Card style={{ gap: 10 }}>
        <Txt variant="section">{t("template.requirements")}</Txt>
        {tpl.requirements.map((f, i) => (
          <Bullet key={f} text={f} index={i} />
        ))}
      </Card>
      <Card padded={false}>
        <ListRow title={t("template.testedOn")} value={tpl.platforms.join(" · ")} />
        <RowDivider />
        <ListRow icon="scale" title={t("template.license")} detail={t(`license.${tpl.license}`)} onPress={onLicense} />
      </Card>
    </View>
  );
}

function Bullet({ text, index }: { text: string; index: number }) {
  const { c } = useTheme();
  return (
    <Animated.View entering={slideInAt(index)} style={{ flexDirection: "row", gap: 10 }}>
      <Animated.View entering={popIn(index, 60)} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.accent, marginTop: 7 }} />
      <Txt style={{ flex: 1 }}>{text}</Txt>
    </Animated.View>
  );
}

/** First N steps free; the next one is shown blurred behind a lock so the buyer sees what they'd unlock (§10.3). */
function StoryPreview({ t: tpl, owned }: { t: Template; owned: boolean }) {
  const { c, isDark } = useTheme();
  const t = useT();
  const free = owned ? tpl.story.length : tpl.freePreviewSteps;
  const locked = tpl.story.length - free;
  return (
    <Card style={{ gap: 4 }}>
      {tpl.story.slice(0, free).map((s, i) => (
        <StoryStep key={i} step={s} n={i + 1} last={i === free - 1 && locked === 0} />
      ))}
      {locked > 0 && tpl.story[free] && (
        <View style={{ borderRadius: radius.inset, overflow: "hidden", marginTop: 4 }}>
          <View style={{ opacity: 0.6 }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
            <StoryStep step={{ ...tpl.story[free], prompt: undefined }} n={free + 1} last />
          </View>
          <BlurView intensity={Platform.OS === "ios" ? 22 : 40} tint={isDark ? "dark" : "light"} style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: Platform.OS === "android" ? c.bgElevated : undefined }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.accentSoft, alignItems: "center", justifyContent: "center" }}>
              <Icon name="lock" size={19} color={c.accent} active loop="breathe" />
            </View>
            <Txt variant="bodyStrong">{t("template.unlockAll", { n: tpl.story.length })}</Txt>
          </BlurView>
        </View>
      )}
      <Button label={t("template.readStory")} variant="secondary" icon={<Icon name="book" size={18} color={c.fg} />} onPress={() => router.push(`/template/${tpl.slug}/story`)} style={{ marginTop: 12 }} />
    </Card>
  );
}

function Files({ t: tpl }: { t: Template }) {
  const t = useT();
  const { files, bytes } = countFiles(tpl.files);
  return (
    <View style={{ gap: 14 }}>
      <Txt variant="caption" tone="fgSubtle" tabular>
        {t("template.totalFiles", { n: files, size: formatBytes(bytes) })}
      </Txt>
      <FileTree nodes={tpl.files} />
      <Card style={{ gap: 8 }}>
        <Txt variant="eyebrow" tone="fgSubtle">
          README.md
        </Txt>
        <Txt variant="code">{tpl.readme}</Txt>
      </Card>
    </View>
  );
}

function Reviews({ t: tpl }: { t: Template }) {
  const { c } = useTheme();
  const t = useT();
  const dist = [5, 4, 3, 2, 1].map((s) => tpl.reviews.filter((r) => Math.round(r.rating) === s).length);
  const max = Math.max(1, ...dist);
  return (
    <Card style={{ gap: 4 }}>
      <View style={{ flexDirection: "row", gap: 20, alignItems: "center", paddingBottom: 8 }}>
        <View style={{ alignItems: "center" }}>
          <Txt variant="largeTitle" tabular>
            {tpl.rating.toFixed(1)}
          </Txt>
          <Txt variant="caption" tone="fgSubtle">
            {t("template.reviewCount", { n: tpl.reviewCount })}
          </Txt>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          {dist.map((n, i) => (
            <DistBar key={i} label={String(5 - i)} frac={n / max} delay={i * 60} />
          ))}
        </View>
      </View>
      <View style={{ height: 1, backgroundColor: c.border }} />
      {tpl.reviews.map((r) => (
        <ReviewRow key={r.id} r={r} />
      ))}
      <Txt variant="caption" tone="fgSubtle" style={{ textAlign: "center", paddingTop: 8 }}>
        {t("template.onlyBuyers")}
      </Txt>
    </Card>
  );
}

function DistBar({ label, frac, delay }: { label: string; frac: number; delay: number }) {
  const { c } = useTheme();
  const p = useSharedValue(0);
  useEffect(() => {
    const id = setTimeout(() => {
      p.value = withTiming(frac, { duration: 520, easing: motion.rowIn.easing, reduceMotion: ReduceMotion.System });
    }, delay);
    return () => clearTimeout(id);
  }, [frac, delay, p]);
  const a = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Txt variant="caption" tone="fgSubtle" tabular style={{ width: 10 }}>
        {label}
      </Txt>
      <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: c.bgMuted, overflow: "hidden" }}>
        <Animated.View style={[{ height: 6, borderRadius: 3, backgroundColor: c.rating }, a]} />
      </View>
    </View>
  );
}

function Footer({ t: tpl }: { t: Template }) {
  const { c } = useTheme();
  const t = useT();
  const [reports, setReports] = useState(0);
  return (
    <View style={{ alignItems: "center", gap: 10, paddingVertical: 28 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Icon name="shield" size={15} color={c.live} active />
        <Txt variant="caption" tone="fgSubtle">
          {t("template.footer", { date: formatDate(tpl.updatedAt, t.locale) })}
        </Txt>
      </View>
      <PressableScale
        onPress={() => {
          setReports((n) => n + 1);
          toast(t("common.done"));
        }}
        style={{ flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44 }}
      >
        <Icon name="flag" size={14} color={c.fgSubtle} motion="wiggle" trigger={reports} />
        <Txt variant="caption" tone="fgSubtle" style={{ textDecorationLine: "underline" }}>
          {t("template.report")}
        </Txt>
      </PressableScale>
    </View>
  );
}

function CheckoutSheet({ t: tpl, open, onClose, onConfirm, onLicense }: { t: Template; open: boolean; onClose: () => void; onConfirm: () => void; onLicense: () => void }) {
  const t = useT();
  const price = formatPrice(tpl.price, "HKD", t("common.free"));
  return (
    <Sheet open={open} onClose={onClose} title={t("checkout.title")} footer={<Button label={t("checkout.pay", { price })} onPress={onConfirm} />}>
      <Txt variant="section">{tpl.name}</Txt>
      <Card padded={false} style={{ shadowOpacity: 0, elevation: 0 }}>
        <ListRow title={t("checkout.license")} detail={t(`license.${tpl.license}`)} onPress={onLicense} />
        <RowDivider />
        <ListRow title={t("checkout.method")} value={t("checkout.methodValue")} />
        <RowDivider />
        <ListRow title={t("checkout.total")} trailing={<Txt variant="price">{price}</Txt>} />
      </Card>
      <Txt variant="caption" tone="fgSubtle">
        {t("checkout.refund")}
      </Txt>
    </Sheet>
  );
}

function SendSheet({ t: tpl, open, onClose }: { t: Template; open: boolean; onClose: () => void }) {
  const t = useT();
  const done = (msg: string) => {
    onClose();
    toast(msg);
  };
  return (
    <Sheet open={open} onClose={onClose} title={t("send.title")}>
      <Txt tone="fgMuted">{t("send.body")}</Txt>
      <Card padded={false} style={{ shadowOpacity: 0, elevation: 0 }}>
        <ListRow icon="mail" title={t("send.email")} detail={t("send.emailHint")} onPress={() => done(t("send.sent"))} />
        <RowDivider />
        <ListRow icon="git" title={t("send.github")} detail={t("send.githubHint")} onPress={() => done(t("common.done"))} />
        <RowDivider />
        <ListRow
          icon="link"
          title={t("send.link")}
          detail={t("send.linkHint")}
          onPress={async () => {
            await Clipboard.setStringAsync(`https://appseed.app/t/${tpl.slug}/download`).catch(() => {});
            done(t("common.copied"));
          }}
        />
      </Card>
    </Sheet>
  );
}

function LicenseSheet({ t: tpl, open, onClose }: { t: Template; open: boolean; onClose: () => void }) {
  const { c } = useTheme();
  const t = useT();
  return (
    <Sheet open={open} onClose={onClose} title={t("template.license")} footer={<Button label={t("common.close")} variant="secondary" onPress={onClose} />}>
      {(["personal", "commercial", "extended"] as const).map((k) => (
        <View key={k} style={{ padding: 14, borderRadius: radius.inset, gap: 4, backgroundColor: k === tpl.license ? c.accentSoft : c.bgMuted }}>
          <Txt variant="bodyStrong" tone={k === tpl.license ? "accent" : "fg"}>
            {t(`license.${k}`)}
          </Txt>
          <Txt tone="fgMuted">{t(`license.${k}Body`)}</Txt>
        </View>
      ))}
      <Txt variant="caption" tone="fgSubtle">
        {t("license.shared")}
      </Txt>
    </Sheet>
  );
}

function HeroSkeleton() {
  const { c, card } = useTheme();
  return (
    <View style={{ paddingHorizontal: space.gutter, gap: 20 }}>
      <View style={[{ backgroundColor: c.bgElevated, borderRadius: radius.hero, padding: 12, gap: 14 }, card]}>
        <Skeleton height={210} radius={radius.media} />
        <Skeleton width="70%" height={24} />
        <Skeleton width="90%" height={16} />
        <Skeleton width="40%" height={16} />
      </View>
      <Skeleton height={42} radius={radius.control} />
    </View>
  );
}
