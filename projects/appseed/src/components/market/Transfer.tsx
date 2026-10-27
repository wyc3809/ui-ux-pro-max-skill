import { View } from "react-native";
import Animated from "react-native-reanimated";
import { BrandIcon, Icon, type IconName } from "@/components/ui/Icon";
import { PressableScale } from "@/components/ui/PressableScale";
import { Txt } from "@/components/ui/Txt";
import { useT, type TKey } from "@/i18n";
import { haptic } from "@/lib/haptic";
import type { HandoverKey, ReadinessIssue, VerifySource } from "@/lib/transfer";
import { slideInAt } from "@/theme/animations";
import { useTheme } from "@/theme/ThemeProvider";
import { gap, radius } from "@/theme/tokens";

/** Product names are the same in every language. */
export const SOURCE_NAME: Record<VerifySource, string> = { appStoreConnect: "App Store Connect", playConsole: "Play Console", revenueCat: "RevenueCat", stripe: "Stripe" };

const ITEM_ICON: Record<HandoverKey, { icon?: IconName; brand?: "apple" | "google" }> = {
  appStore: { brand: "apple" },
  googlePlay: { brand: "google" },
  siwaMigration: { icon: "people" },
  signingKey: { icon: "lock" },
  source: { icon: "code" },
  backend: { icon: "layers" },
  payments: { icon: "cash" },
  domain: { icon: "globe" },
  social: { icon: "chat" },
  secrets: { icon: "shield" },
};

/** "Verified with read access to App Store Connect, RevenueCat", or the unverified state. */
export function VerifiedLine({ sources }: { sources: VerifySource[] }) {
  const { c } = useTheme();
  const t = useT();
  const ok = sources.length > 0;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: gap.xs, flexShrink: 1 }}>
      <Icon name={ok ? "shield" : "info"} size={14} color={ok ? c.live : c.fgSubtle} active={ok} enter={false} />
      <Txt variant="caption" tone={ok ? "live" : "fgSubtle"} numberOfLines={2} style={{ flexShrink: 1 }}>
        {ok ? t("buyout.verifiedVia", { sources: sources.map((s) => SOURCE_NAME[s]).join("、") }) : t("buyout.unverified")}
      </Txt>
    </View>
  );
}

/**
 * The hand-over checklist. Read-only on a listing (what the buyer will receive); with `confirmed` and
 * `onToggle` it becomes the buyer's checklist, and escrow releases only when every row is ticked.
 */
export function HandoverList({ items, services, confirmed, onToggle }: { items: HandoverKey[]; services: { backend: string; payments: string }; confirmed?: HandoverKey[]; onToggle?: (k: HandoverKey) => void }) {
  const { c } = useTheme();
  const t = useT();
  return (
    <View style={{ gap: gap.lg }}>
      {items.map((k, i) => {
        const done = confirmed?.includes(k) ?? false;
        const meta = ITEM_ICON[k];
        const body = t(`transfer.${k}Body` as TKey, { services: k === "backend" ? services.backend : services.payments });
        const row = (
          <View style={{ flexDirection: "row", gap: gap.md, alignItems: "flex-start" }}>
            <View style={{ width: 32, height: 32, borderRadius: radius.control, backgroundColor: done ? c.liveSoft : c.bgMuted, alignItems: "center", justifyContent: "center" }}>
              {meta.brand ? <BrandIcon brand={meta.brand} size={16} color={c.fg} /> : <Icon name={meta.icon!} size={16} color={c.fg} enterDelay={i * 60} />}
            </View>
            <View style={{ flex: 1, gap: gap.xxs }}>
              <Txt variant="bodyStrong">{t(`transfer.${k}` as TKey)}</Txt>
              <Txt variant="caption" tone="fgMuted">
                {body}
              </Txt>
            </View>
            {onToggle && <Icon name="checkCircle" size={22} color={done ? c.live : c.fgSubtle} active={done} motion="pop" />}
          </View>
        );
        return (
          <Animated.View key={k} entering={slideInAt(i)}>
            {onToggle ? (
              <PressableScale
                onPress={() => {
                  haptic("selection");
                  onToggle(k);
                }}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: done }}
                accessibilityLabel={t(`transfer.${k}` as TKey)}
              >
                {row}
              </PressableScale>
            ) : (
              row
            )}
          </Animated.View>
        );
      })}
    </View>
  );
}

const ISSUE_TEXT: Record<ReadinessIssue["key"], TKey> = {
  notReleased: "transfer.notReleased",
  inReview: "transfer.inReview",
  testflightOn: "transfer.testflightOn",
  siwaMigration: "transfer.siwaMigrationWarn",
  signingKey: "transfer.signingKeyWarn",
  webOnly: "transfer.webOnly",
};

/** Readiness result: blockers in red, warnings in amber, or a green all clear. */
export function ReadinessList({ issues }: { issues: ReadinessIssue[] }) {
  const { c } = useTheme();
  const t = useT();
  if (issues.length === 0) {
    return (
      <View style={{ flexDirection: "row", gap: gap.sm, alignItems: "center", padding: gap.md, borderRadius: radius.control, backgroundColor: c.liveSoft }}>
        <Icon name="checkCircle" size={18} color={c.live} active />
        <Txt tone="live" style={{ flex: 1 }}>
          {t("transfer.allClear")}
        </Txt>
      </View>
    );
  }
  return (
    <View style={{ gap: gap.sm }}>
      {issues.map((i) => {
        const block = i.level === "block";
        return (
          <View key={i.key} style={{ flexDirection: "row", gap: gap.sm, alignItems: "center", padding: gap.md, borderRadius: radius.control, backgroundColor: block ? c.dangerSoft : c.warnSoft }}>
            <Icon name={block ? "closeCircle" : "warning"} size={18} color={block ? c.danger : c.warn} active motion="wiggle" />
            <Txt tone={block ? "danger" : "warn"} style={{ flex: 1 }}>
              {t(ISSUE_TEXT[i.key])}
            </Txt>
          </View>
        );
      })}
    </View>
  );
}
