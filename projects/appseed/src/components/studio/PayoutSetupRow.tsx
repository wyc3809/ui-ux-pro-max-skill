import { useQueryClient } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { Platform, View } from "react-native";
import { api } from "@/api/backend";
import { useConnectStatus } from "@/api/queries";
import { Icon } from "@/components/ui/Icon";
import { PressableScale } from "@/components/ui/PressableScale";
import { Spinner } from "@/components/ui/Spinner";
import { toast } from "@/components/ui/Toast";
import { Txt } from "@/components/ui/Txt";
import { useT } from "@/i18n";
import { haptic } from "@/lib/haptic";
import { useTheme } from "@/theme/ThemeProvider";
import { gap } from "@/theme/tokens";

/**
 * Payout account state in the studio (§32): set up → finish setup → connected. Stripe hosts every page that
 * asks for identity or bank details; AppSeed only opens it and re-reads the state afterwards.
 */
export function PayoutSetupRow() {
  const { c } = useTheme();
  const t = useT();
  const qc = useQueryClient();
  const { data } = useConnectStatus();
  const [busy, setBusy] = useState(false);
  const state = data?.state ?? "none";

  const open = async () => {
    setBusy(true);
    try {
      const { url } = state === "ready" ? await api.payoutDashboard() : await api.startPayoutSetup();
      if (!url) toast(t("studio.payoutDemo"));
      else if (Platform.OS === "web") window.location.assign(url);
      else await WebBrowser.openBrowserAsync(url);
      haptic("success");
    } catch {
      toast(t("common.tryAgain"), "warning");
    } finally {
      setBusy(false);
      qc.invalidateQueries({ queryKey: ["connect"] });
    }
  };

  const title = state === "ready" ? t("studio.payoutReady") : state === "pending" ? t("studio.payoutContinue") : t("studio.payoutSetup");
  const body = state === "ready" ? t("studio.payoutManage") : state === "pending" ? t("studio.payoutContinueBody") : t("studio.payoutSetupBody");
  return (
    <PressableScale onPress={busy ? undefined : open} accessibilityRole="button" accessibilityLabel={title} scaleTo={0.98} style={{ flexDirection: "row", alignItems: "center", gap: gap.md, minHeight: 44 }}>
      <Icon name={state === "ready" ? "checkCircle" : "wallet"} size={20} color={state === "ready" ? c.live : c.accent} enter={false} />
      <View style={{ flex: 1, gap: gap.xxs }}>
        <Txt variant="bodyStrong" tone={state === "ready" ? "fg" : "accent"}>
          {title}
        </Txt>
        <Txt variant="caption" tone="fgSubtle">
          {body}
        </Txt>
      </View>
      {busy ? <Spinner color={c.fgMuted} /> : <Icon name="chevronRight" size={18} color={c.fgSubtle} enter={false} />}
    </PressableScale>
  );
}
