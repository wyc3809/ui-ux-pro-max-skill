import { useEffect, useState } from "react";
import { View } from "react-native";
import { useReport } from "@/api/queries";
import { Field } from "@/components/studio/FormFields";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { ListRow } from "@/components/ui/ListRow";
import { Card } from "@/components/ui/Card";
import { Sheet } from "@/components/ui/Sheet";
import { toast } from "@/components/ui/Toast";
import { Txt } from "@/components/ui/Txt";
import { useT, type TKey } from "@/i18n";
import { haptic } from "@/lib/haptic";
import { REPORT_REASONS, validateReport, type ReportReason, type ReportTarget } from "@/lib/moderation";
import { requireAuth } from "@/store/authGate";
import { useBlocks } from "@/store/blocks";
import { useSession } from "@/store/session";
import { useTheme } from "@/theme/ThemeProvider";
import { gap } from "@/theme/tokens";

const ERR: Record<"reason" | "detail" | "contact", TKey> = { reason: "moderation.errReason", detail: "moderation.errDetail", contact: "moderation.errContact" };

/**
 * Report (with a reason, and contact details for IP claims) or block the person behind any post, comment,
 * listing or profile (§30, App Review 1.2). Reporting needs an account so reports can be followed up;
 * blocking someone you cannot see again is offered right under the report.
 */
function ModerationSheet({ target, onClose }: { target: ReportTarget | null; onClose: () => void }) {
  const { c } = useTheme();
  const t = useT();
  const report = useReport();
  const block = useBlocks((s) => s.block);
  const me = useSession((s) => s.user);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [detail, setDetail] = useState("");
  const [contact, setContact] = useState("");
  const [tried, setTried] = useState(false);

  useEffect(() => {
    if (target) {
      setReason(null);
      setDetail("");
      setContact(me?.email ?? "");
      setTried(false);
    }
  }, [target, me]);

  const error = validateReport(reason, detail, contact);
  const own = target && me && target.handle === me.handle;
  const submit = () => {
    setTried(true);
    if (!target || error) {
      haptic("warning");
      return;
    }
    report.mutate(
      { target, reason: reason!, detail, contact },
      {
        onSuccess: () => {
          haptic("success");
          toast(t("moderation.sent"));
          onClose();
        },
      },
    );
  };

  return (
    <Sheet
      open={!!target}
      onClose={onClose}
      title={t("moderation.title")}
      footer={
        <View style={{ gap: gap.sm }}>
          {tried && error && (
            <Txt variant="caption" tone="danger">
              {t(ERR[error])}
            </Txt>
          )}
          <Button label={t("moderation.send")} variant="danger" loading={report.isPending} onPress={submit} />
        </View>
      }
    >
      <Txt variant="bodyStrong">{t("moderation.reportTitle")}</Txt>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: gap.sm }}>
        {REPORT_REASONS.map((r) => (
          <Chip key={r} label={t(`moderation.reasons.${r}`)} selected={reason === r} onPress={() => setReason(r)} />
        ))}
      </View>
      {(reason === "ip" || reason === "other") && (
        <Field inSheet label={reason === "ip" ? t("moderation.detailIp") : t("moderation.detail")} value={detail} onChangeText={setDetail} multiline />
      )}
      {reason === "ip" && (
        <>
          <Field inSheet label={t("moderation.contactEmail")} value={contact} onChangeText={setContact} autoCapitalize="none" keyboardType="email-address" />
          <Txt variant="caption" tone="fgSubtle">
            {t("moderation.ipNote")}
          </Txt>
        </>
      )}
      {target && !own && (
        <Card padded={false}>
          <ListRow
            icon="userX"
            danger
            title={t("moderation.block", { handle: target.handle })}
            detail={t("moderation.blockBody")}
            onPress={() => {
              block(target.handle);
              haptic("success");
              toast(t("moderation.blocked", { handle: target.handle }));
              onClose();
            }}
          />
        </Card>
      )}
      <View style={{ flexDirection: "row", gap: gap.sm, alignItems: "center" }}>
        <Icon name="shield" size={14} color={c.fgSubtle} enter={false} />
        <Txt variant="caption" tone="fgSubtle" style={{ flex: 1 }}>
          {t("moderation.sent")}
        </Txt>
      </View>
    </Sheet>
  );
}

/** One sheet per screen: `ask(target)` opens it (after sign-in), `sheet` goes at the end of the screen. */
export function useModeration() {
  const [target, setTarget] = useState<ReportTarget | null>(null);
  return {
    ask: (tg: ReportTarget) => requireAuth("discuss.reasonPost", () => setTarget(tg)),
    sheet: <ModerationSheet target={target} onClose={() => setTarget(null)} />,
  };
}
