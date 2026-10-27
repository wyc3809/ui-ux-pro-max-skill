import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import { findCreator } from "@/api/mockServer";
import { useBuyout, useMakeOffer, useOffers } from "@/api/queries";
import type { BuyoutListing } from "@/api/types";
import { CommentsSection } from "@/components/engage/CommentsSection";
import { EngagementPanel } from "@/components/engage/EngagementPanel";
import { useJumpTo } from "@/components/engage/useJumpTo";
import { TonePill } from "@/components/market/Cards";
import { EscrowSteps } from "@/components/market/EscrowSteps";
import { SoldStamp } from "@/components/market/UpvoteButton";
import { DetailScaffold } from "@/components/shell/DetailScaffold";
import { Field } from "@/components/studio/FormFields";
import { SalesChart } from "@/components/studio/SalesChart";
import { Cover } from "@/components/template/Cover";
import { FavoriteButton } from "@/components/template/FavoriteButton";
import { StackChips } from "@/components/template/StackChips";
import { BottomBar } from "@/components/ui/BottomBar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { NumberRoll } from "@/components/ui/NumberRoll";
import { PressableScale } from "@/components/ui/PressableScale";
import { Section } from "@/components/ui/Section";
import { Sheet } from "@/components/ui/Sheet";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/components/ui/Toast";
import { Txt } from "@/components/ui/Txt";
import { useT } from "@/i18n";
import { requireAuth } from "@/store/authGate";
import { buyoutTone, ESCROW_STEPS, escrowFee, MIN_OFFER_RATIO, offerStep, revenueMultiple, validateOffer } from "@/lib/buyout";
import { haptic } from "@/lib/haptic";
import { formatPrice } from "@/lib/price";
import { slideInAt } from "@/theme/animations";
import { useTheme } from "@/theme/ThemeProvider";
import { gap, nested, radius } from "@/theme/tokens";
import { Reveal } from "@/components/ui/Reveal";
import { HandoverList, VerifiedLine } from "@/components/market/Transfer";
import { handoverItems } from "@/lib/transfer";
import { ZoomTarget } from "@/components/ui/ZoomLink";

const STEP_KEYS = { agree: "buyout.stepAgree", deposit: "buyout.stepDeposit", transfer: "buyout.stepTransfer", verify: "buyout.stepVerify", release: "buyout.stepRelease" } as const;
const hk = (n: number) => formatPrice(n, "HKD", "HK$0");
/** Names the backend and payment services from the stack for the checklist copy. */
const services = (stack: string[]) => ({
  backend: stack.filter((s) => /supabase|firebase|edge functions/i.test(s)).join("、"),
  payments: stack.filter((s) => /stripe|revenuecat/i.test(s)).join("、"),
});

export default function BuyoutScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: b, isLoading } = useBuyout(slug);
  const { data: offers } = useOffers();
  const { c } = useTheme();
  const t = useT();
  const [sheet, setSheet] = useState<"offer" | "buy" | null>(null);
  const myOffer = offers?.find((o) => o.slug === slug);
  const jumpTo = useJumpTo();

  if (!isLoading && !b) {
    return (
      <View style={{ flex: 1, justifyContent: "center", backgroundColor: c.bg }}>
        <EmptyState icon="closeCircle" title={t("search.emptyTitle")} body={t("search.emptyBody")} action={{ label: t("library.browse"), onPress: () => router.replace("/") }} />
      </View>
    );
  }

  const sold = b?.status === "sold";
  return (
    <DetailScaffold
      scrollRef={jumpTo.ref}
      title={b?.name}
      right={b ? <FavoriteButton slug={`buyout:${b.slug}`} onSurface /> : undefined}
      bottom={
        b ? (
          <BottomBar>
            <View style={{ flexShrink: 0 }}>
              <Txt variant="caption" tone="fgSubtle">
                {t("buyout.asking")}
              </Txt>
              <Txt variant="price" tabular numberOfLines={1} style={{ fontSize: 16 }}>
                {hk(b.asking)}
              </Txt>
            </View>
            {sold ? (
              <Button label={t("buyout.sold")} disabled style={{ flex: 1 }} />
            ) : (
              <>
                <Button label={t("buyout.makeOffer")} variant="secondary" onPress={() => requireAuth("auth.reasonOffer", () => setSheet("offer"))} style={{ flex: 1, paddingHorizontal: 8 }} />
                <Button label={t("buyout.buyNow")} onPress={() => requireAuth("auth.reasonOffer", () => setSheet("buy"))} style={{ flex: 1.15, paddingHorizontal: 8 }} />
              </>
            )}
          </BottomBar>
        ) : undefined
      }
    >
      {!b ? (
        <Skeleton height={320} radius={radius.hero} />
      ) : (
        <>
          <Reveal kind="card">
            <Card style={{ gap: 12, padding: 12, borderRadius: radius.hero, overflow: "hidden" }}>
              <ZoomTarget>
                <Cover t={b} rounded={nested(radius.hero, 12)} />
              </ZoomTarget>
              <View style={{ paddingHorizontal: 8, gap: 8 }}>
                <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                  <TonePill label={t(`buyout.${b.status}`)} tone={buyoutTone(b.status)} />
                  {b.monthlyRevenue > 0 && <VerifiedLine sources={b.verifiedVia} />}
                </View>
                <Txt variant="heroTitle" accessibilityRole="header">
                  {b.name}
                </Txt>
                <Txt variant="heroLede" tone="fgMuted">
                  {b.tagline}
                </Txt>
                <Txt variant="caption" tone="fgSubtle">
                  {findCreator(b.seller)?.name} · {t("buyout.age", { n: b.ageMonths })} · {b.platforms.join(" · ")}
                </Txt>
              </View>
              {sold && <SoldStamp label={t("buyout.sold")} />}
            </Card>
          </Reveal>

          <EngagementPanel kind="buyout" slug={b.slug} title={b.name} extra={{ icon: "hand", label: t("engage.offers"), value: b.offers + (myOffer ? 1 : 0) }} onComments={jumpTo.jump} />

          {myOffer && (
            <Reveal index={1} style={{ flexDirection: "row", gap: 12, alignItems: "center", padding: 16, borderRadius: radius.inset, backgroundColor: c.pendingSoft }}>
              <Icon name="hand" size={18} color={c.pending} active motion="wiggle" />
              <Txt style={{ flex: 1 }}>
                {t("mine.offers")} {hk(myOffer.amount)} · {t("mine.offerSent")}
              </Txt>
            </Reveal>
          )}

          <Section index={1} inset={false}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              <MetricTile label={t("buyout.monthlyRevenue")} value={b.monthlyRevenue} prefix="HK$" empty={b.monthlyRevenue === 0 ? t("buyout.preRevenue") : undefined} />
              <MetricTile label={t("buyout.mau")} value={b.monthlyActive} />
              <MetricTile label={t("buyout.downloads")} value={b.downloads} />
              <MetricTile label={t("buyout.asking")} value={b.asking} prefix="HK$" note={(() => {
                const m = revenueMultiple(b.asking, b.monthlyRevenue);
                return m == null ? t("buyout.preRevenue") : t("buyout.multiple", { x: m });
              })()} />
            </View>
          </Section>

          {b.monthlyRevenue > 0 && (
            <Section title={t("buyout.revenue12")} index={2} inset={false}>
              <Card>
                <SalesChart data={b.revenueSeries} label={t("buyout.revenue12")} />
              </Card>
            </Section>
          )}

          <Section title={t("buyout.included")} index={2} inset={false}>
            <Card style={{ gap: 12 }}>
              {b.included.map((item, i) => (
                <Animated.View key={item} entering={slideInAt(i)} style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                  <Icon name="checkCircle" size={18} color={c.live} active enterDelay={i * 80} />
                  <Txt style={{ flex: 1 }}>{item}</Txt>
                </Animated.View>
              ))}
              <View style={{ paddingTop: 8 }}>
                <StackChips stack={b.stack} />
              </View>
            </Card>
          </Section>

          <Section title={t("transfer.title")} index={2} inset={false}>
            <Card style={{ gap: gap.lg }}>
              <Txt variant="caption" tone="fgMuted">
                {t("transfer.intro")}
              </Txt>
              <HandoverList items={handoverItems({ platforms: b.platforms, stack: b.stack, ...b.transfer })} services={services(b.stack)} />
            </Card>
          </Section>

          <Section title={t("buyout.reason")} index={2} inset={false}>
            <Card>
              <Txt tone="fgMuted">{b.reason}</Txt>
            </Card>
          </Section>

          <Section title={t("buyout.escrowTitle")} index={2} inset={false}>
            <Card style={{ gap: 12 }}>
              <EscrowSteps steps={ESCROW_STEPS.map((s) => t(STEP_KEYS[s]))} />
              <Txt variant="caption" tone="fgSubtle">
                {t("buyout.escrowNote")}
              </Txt>
            </Card>
          </Section>

          <View onLayout={jumpTo.onLayout}>
            <CommentsSection kind="buyout" slug={b.slug} />
          </View>

          <OfferSheet b={b} open={sheet === "offer"} onClose={() => setSheet(null)} />
          <BuyNowSheet b={b} open={sheet === "buy"} onClose={() => setSheet(null)} />
        </>
      )}
    </DetailScaffold>
  );
}

function MetricTile({ label, value, prefix = "", empty, note }: { label: string; value: number; prefix?: string; empty?: string; note?: string }) {
  const { c, card } = useTheme();
  return (
    <View style={[{ flexBasis: "47%", flexGrow: 1, padding: 16, borderRadius: radius.row, backgroundColor: c.bgElevated, gap: 4 }, card]}>
      <Txt variant="caption" tone="fgSubtle">
        {label}
      </Txt>
      {empty ? <Txt variant="price">{empty}</Txt> : <NumberRoll value={value} prefix={prefix} variant="price" />}
      {note ? (
        <Txt variant="caption" tone="fgMuted">
          {note}
        </Txt>
      ) : null}
    </View>
  );
}

/**
 * Offer: a big rolling amount with − / + steppers and quick ratios. An invalid amount shakes the
 * figure and warns; the minimum is half the asking price.
 */
function OfferSheet({ b, open, onClose }: { b: BuyoutListing; open: boolean; onClose: () => void }) {
  const { c } = useTheme();
  const t = useT();
  const make = useMakeOffer();
  const step = offerStep(b.asking);
  const min = Math.ceil(b.asking * MIN_OFFER_RATIO);
  const [amount, setAmount] = useState(Math.round((b.asking * 0.85) / step) * step);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const shake = useSharedValue(0);
  const a = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  useEffect(() => {
    if (open) setError(null);
  }, [open]);

  const nudge = (d: number) => {
    haptic("selection");
    setError(null);
    setAmount((v) => Math.max(step, v + d));
  };
  const send = () => {
    const err = validateOffer(amount, b.asking, b.status);
    if (err) {
      haptic("warning");
      const d = { duration: 50, reduceMotion: ReduceMotion.System };
      shake.value = withSequence(withTiming(-10, d), withTiming(10, d), withTiming(-6, d), withTiming(6, d), withTiming(0, d));
      setError(t(`buyout.${err}`, { min: hk(min) }));
      return;
    }
    make.mutate(
      { slug: b.slug, amount, message },
      {
        onSuccess: () => {
          onClose();
          toast(t("buyout.offerSent"));
        },
      },
    );
  };

  return (
    <Sheet open={open} onClose={onClose} title={t("buyout.makeOffer")} footer={<Button label={t("buyout.sendOffer")} onPress={send} loading={make.isPending} />}>
      <Txt variant="caption" tone="fgSubtle">
        {t("buyout.offerAmount")} · {t("buyout.asking")} {hk(b.asking)}
      </Txt>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Stepper icon="minus" label="−" onPress={() => nudge(-step)} />
        <Animated.View style={[{ flex: 1, alignItems: "center" }, a]}>
          <NumberRoll value={amount} prefix="HK$" variant="largeTitle" />
        </Animated.View>
        <Stepper icon="plus" label="+" onPress={() => nudge(step)} />
      </View>
      <View style={{ flexDirection: "row", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
        {[0.7, 0.85, 1].map((r) => {
          const v = Math.round((b.asking * r) / step) * step;
          return <Chip key={r} label={`${Math.round(r * 100)}%`} selected={amount === v} onPress={() => (setError(null), setAmount(v))} />;
        })}
      </View>
      {error ? (
        <Reveal style={{ flexDirection: "row", gap: 8, alignItems: "center", padding: 12, borderRadius: radius.control, backgroundColor: c.warnSoft }}>
          <Icon name="warning" size={16} color={c.warn} active motion="wiggle" />
          <Txt tone="warn" style={{ flex: 1 }}>
            {error}
          </Txt>
        </Reveal>
      ) : (
        <Txt variant="caption" tone="fgSubtle" style={{ textAlign: "center" }}>
          {t("buyout.minOffer", { min: hk(min) })}
        </Txt>
      )}
      <Field label={t("buyout.offerMessage")} value={message} onChangeText={setMessage} multiline inSheet />
    </Sheet>
  );
}

function Stepper({ icon, label, onPress }: { icon: "plus" | "minus"; label: string; onPress: () => void }) {
  const { c } = useTheme();
  const [n, setN] = useState(0);
  return (
    <PressableScale
      onPress={() => {
        setN((x) => x + 1);
        onPress();
      }}
      accessibilityLabel={label}
      scaleTo={0.9}
      style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: c.bgMuted, alignItems: "center", justifyContent: "center" }}
    >
      <Icon name={icon} size={22} color={c.fg} motion="pop" trigger={n} />
    </PressableScale>
  );
}

/** Buy now: price + escrow fee breakdown and the steps, then hand-off to the web escrow flow. */
function BuyNowSheet({ b, open, onClose }: { b: BuyoutListing; open: boolean; onClose: () => void }) {
  const { c } = useTheme();
  const t = useT();
  const fee = escrowFee(b.asking);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t("buyout.buyNow")}
      footer={
        <Button
          label={t("buyout.continueWeb")}
          icon={<Icon name="globe" size={18} color={c.accentFg} />}
          onPress={() => {
            onClose();
            toast(t("buyout.continued"));
          }}
        />
      }
    >
      <Txt variant="section">{b.name}</Txt>
      <View style={{ gap: 8, padding: 16, borderRadius: radius.inset, backgroundColor: c.bgMuted }}>
        <Row label={t("buyout.asking")} value={hk(b.asking)} />
        <Row label={t("buyout.escrowFee")} value={hk(fee)} />
        <View style={{ height: 1, backgroundColor: c.border }} />
        <Row label={t("checkout.total")} value={hk(b.asking + fee)} strong />
      </View>
      <EscrowSteps steps={ESCROW_STEPS.map((s) => t(STEP_KEYS[s]))} />
      <Txt variant="caption" tone="fgSubtle">
        {t("buyout.escrowNote")}
      </Txt>
    </Sheet>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <Txt tone={strong ? "fg" : "fgMuted"} variant={strong ? "bodyStrong" : "body"}>
        {label}
      </Txt>
      <Txt variant={strong ? "price" : "bodyStrong"} tabular>
        {value}
      </Txt>
    </View>
  );
}
