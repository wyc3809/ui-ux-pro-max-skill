import { useState } from "react";
import { View } from "react-native";
import { Icon } from "@/components/ui/Icon";
import { PressableScale } from "@/components/ui/PressableScale";
import { Reveal } from "@/components/ui/Reveal";
import { Txt } from "@/components/ui/Txt";
import { useT, type TKey } from "@/i18n";
import { buyoutCosts, FEES, pct, splitSale } from "@/lib/fees";
import { useTheme } from "@/theme/ThemeProvider";
import { gap, radius } from "@/theme/tokens";

const money = (n: number) => (Number.isInteger(n) ? n.toLocaleString("en-US") : n.toFixed(2));
const RULES: TKey[] = ["terms.fee1", "terms.fee2", "terms.fee3", "terms.fee4", "terms.fee5", "terms.fee6", "terms.fee7", "terms.fee8", "terms.fee9", "terms.fee10"];

/**
 * 收費與結算 in the terms (§31): every fee, who pays it and when, filled in from lib/fees.ts so the wording
 * always matches what is charged. Collapsed under a clear heading; `open` expands it (deep links from the
 * studio and the buyout sheet).
 */
export function FeesSection({ open: initial = false }: { open?: boolean }) {
  const { c } = useTheme();
  const t = useT();
  const [open, setOpen] = useState(initial);
  const vars = {
    platform: pct(FEES.platformRate),
    store: pct(FEES.storeRate),
    storeLarge: pct(FEES.storeRateLarge),
    card: pct(FEES.cardRate),
    cardFixed: FEES.cardFixed,
    intl: pct(FEES.cardIntlExtra),
    rc: pct(FEES.revenueCatRate),
    hold: FEES.holdDays,
    min: FEES.payoutMinimum,
    payout: pct(FEES.payoutRate),
    payoutFixed: FEES.payoutFixed,
    chargeback: FEES.chargebackFee,
    escrow: pct(FEES.escrowRateFrom),
    commission: pct(FEES.buyoutCommission),
    commissionMin: FEES.buyoutCommissionMinimum,
    notice: FEES.noticeDays,
  };
  const ios = splitSale(158, "ios");
  const web = splitSale(158, "web");
  const buyout = buyoutCosts(168000);

  return (
    <View style={{ gap: gap.sm }}>
      <Txt variant="bodyStrong">{t("terms.feesTitle")}</Txt>
      <Txt tone="fgMuted">{t("terms.feesIntro")}</Txt>
      <PressableScale onPress={() => setOpen((o) => !o)} accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={open ? t("terms.feesHide") : t("terms.feesShow")} style={{ flexDirection: "row", alignItems: "center", gap: gap.xs, minHeight: 44 }}>
        <Txt variant="bodyStrong" tone="accent">
          {open ? t("terms.feesHide") : t("terms.feesShow")}
        </Txt>
        <Icon name="chevronDown" size={16} color={c.accent} enter={false} style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }} />
      </PressableScale>
      {open && (
        <Reveal style={{ gap: gap.md }}>
          {RULES.map((k) => (
            <Txt key={k} tone="fgMuted">
              {t(k, vars)}
            </Txt>
          ))}
          <View style={{ gap: gap.sm, padding: gap.lg, borderRadius: radius.inset, backgroundColor: c.bgMuted }}>
            <Txt variant="bodyStrong">{t("terms.feesExample")}</Txt>
            <Txt tone="fgMuted">{t("terms.feesExampleIos", { store: money(ios.channelFee), platform: money(ios.platform), seller: money(ios.seller) })}</Txt>
            <Txt tone="fgMuted">{t("terms.feesExampleWeb", { card: money(web.channelFee), platform: money(web.platform), seller: money(web.seller) })}</Txt>
            <Txt tone="fgMuted">{t("terms.feesExampleBuyout", { escrow: money(buyout.escrowFee), commission: money(buyout.commission), seller: money(buyout.sellerReceives) })}</Txt>
          </View>
        </Reveal>
      )}
    </View>
  );
}
