import { useState } from "react";
import { View } from "react-native";
import { api } from "@/api/backend";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { PressableScale } from "@/components/ui/PressableScale";
import { Sheet } from "@/components/ui/Sheet";
import { toast } from "@/components/ui/Toast";
import { Txt } from "@/components/ui/Txt";
import { useT } from "@/i18n";
import { haptic } from "@/lib/haptic";
import { useAuthGate } from "@/store/authGate";
import { useSession } from "@/store/session";
import { useTheme } from "@/theme/ThemeProvider";
import { gap } from "@/theme/tokens";
import { TermsBody } from "./TermsBody";

/**
 * Shown when the terms changed since the person accepted them (TERMS_VERSION): they agree again before
 * publishing anything, then the post, comment or profile save they started carries on.
 */
export function TermsGateSheet() {
  const { c } = useTheme();
  const t = useT();
  const { termsOpen, closeTerms, finishTerms } = useAuthGate();
  const user = useSession((s) => s.user);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);

  const accept = async () => {
    if (!user || !agreed) return;
    setBusy(true);
    try {
      // Update the stored account without signIn(), which would refetch every query mid-action.
      useSession.setState({ user: await api.acceptTerms(user.id) });
      haptic("success");
      setAgreed(false);
      finishTerms();
    } catch {
      toast(t("common.tryAgain"), "warning");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={termsOpen} onClose={closeTerms} title={t("terms.updatedTitle")} footer={<Button label={t("terms.accept")} disabled={!agreed} loading={busy} onPress={accept} />}>
      <Txt tone="fgMuted">{t("terms.updatedBody")}</Txt>
      <TermsBody />
      <PressableScale onPress={() => setAgreed((a) => !a)} accessibilityRole="checkbox" accessibilityState={{ checked: agreed }} accessibilityLabel={t("terms.agree")} scaleTo={0.99}>
        <View style={{ flexDirection: "row", gap: gap.md, alignItems: "flex-start" }}>
          <Icon name="checkCircle" size={22} color={agreed ? c.accent : c.fgSubtle} active={agreed} motion="pop" />
          <Txt variant="caption" tone="fgMuted" style={{ flex: 1 }}>
            {t("terms.agree")}
          </Txt>
        </View>
      </PressableScale>
    </Sheet>
  );
}
