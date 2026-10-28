import type { Platform } from "@/api/types";
import { ReadinessList } from "@/components/market/Transfer";
import { Field, Group, Note } from "@/components/studio/FormFields";
import { OwnershipAttest } from "@/components/studio/OwnershipAttest";
import { ListingWizard } from "@/components/studio/ListingWizard";
import { SourcePicker } from "@/components/studio/SourcePicker";
import { Chip } from "@/components/ui/Chip";
import { ListRow, RowDivider } from "@/components/ui/ListRow";
import { Card } from "@/components/ui/Card";
import { Switch } from "@/components/ui/Switch";
import { toast } from "@/components/ui/Toast";
import { Txt } from "@/components/ui/Txt";
import { View } from "react-native";
import { useT } from "@/i18n";
import { escrowFee, revenueMultiple } from "@/lib/buyout";
import { missingBuyoutFields, type BuyoutDraft } from "@/lib/listing";
import { transferReadiness, verifyOptions } from "@/lib/transfer";
import { formatPrice } from "@/lib/price";
import { useFormDraft } from "@/store/formDrafts";
import { Reveal } from "@/components/ui/Reveal";


const INCLUDED = ["source", "design", "appStore", "play", "domain", "subscribers", "social", "handover"] as const;
const PLATFORMS: Platform[] = ["iOS", "Android", "Web"];
const EMPTY: BuyoutDraft = {
  step: 0,
  name: "",
  tagline: "",
  platforms: [],
  monthlyRevenue: "",
  mau: "",
  verifyVia: [],
  facts: { released: false, inReview: false, testflightOn: false, signInWithApple: false, playAppSigning: true },
  source: null,
  included: [],
  reason: "",
  asking: "",
  attest: false,
};
const toggle = <T,>(list: T[], x: T) => (list.includes(x) ? list.filter((y) => y !== x) : [...list, x]);

export default function NewBuyout() {
  const t = useT();
  const [d, patch, reset] = useFormDraft("buyout", EMPTY);
  const asking = Number(d.asking) || 0;
  const multiple = revenueMultiple(asking, Number(d.monthlyRevenue) || 0);
  return (
    <ListingWizard
      title={t("listing.buyout")}
      steps={[t("form.buyoutS1"), t("form.buyoutS2"), t("form.buyoutTransfer"), t("source.title"), t("form.buyoutS3"), t("form.buyoutS4")]}
      step={d.step}
      setStep={(step) => patch({ step })}
      missing={(s) => missingBuyoutFields(d, s)}
      submitLabel={t("upload.submit")}
      onSubmit={() => {
        reset();
        toast(t("form.listed"));
      }}
    >
      {d.step === 0 && (
        <>
          <Field label={t("form.appName")} value={d.name} onChangeText={(name) => patch({ name })} />
          <Field label={t("upload.tagline")} value={d.tagline} onChangeText={(tagline) => patch({ tagline })} />
          <Field label={t("form.reason")} value={d.reason} onChangeText={(reason) => patch({ reason })} multiline />
          <Group label={t("transfer.platforms")}>
            {PLATFORMS.map((p) => (
              <Chip key={p} label={p} selected={d.platforms.includes(p)} onPress={() => patch({ platforms: toggle(d.platforms, p) })} />
            ))}
          </Group>
        </>
      )}
      {d.step === 1 && (
        <>
          <Field label={t("form.monthlyRevenue")} value={d.monthlyRevenue} onChangeText={(monthlyRevenue) => patch({ monthlyRevenue })} keyboardType="number-pad" />
          <Field label={t("form.mau")} value={d.mau} onChangeText={(mau) => patch({ mau })} keyboardType="number-pad" />
          <Group label={t("transfer.verifyTitle")}>
            {/* The stack is only known after the source scan, so RevenueCat and Stripe are always offered. */}
            {verifyOptions(d.platforms, ["RevenueCat", "Stripe"]).map((v) => (
              <Chip key={v} label={t(`transfer.${v}`)} selected={d.verifyVia.includes(v)} onPress={() => patch({ verifyVia: toggle(d.verifyVia, v) })} />
            ))}
          </Group>
          <Note text={Number(d.monthlyRevenue) > 0 && d.verifyVia.length === 0 ? t("transfer.verifyNeeded") : t("transfer.verifyHint")} />
        </>
      )}
      {d.step === 2 && (
        <>
          <Card padded={false}>
            {(
              [
                ["released", "factReleased"],
                ["inReview", "factInReview"],
                ...(d.platforms.includes("iOS") ? ([["testflightOn", "factTestflight"], ["signInWithApple", "factSiwa"]] as const) : []),
                ...(d.platforms.includes("Android") ? ([["playAppSigning", "factPlaySigning"]] as const) : []),
              ] as const
            ).map(([key, label], i) => (
              <View key={key}>
                {i > 0 && <RowDivider />}
                <ListRow title={t(`transfer.${label}`)} trailing={<Switch label={t(`transfer.${label}`)} value={d.facts[key]} onValueChange={(v) => patch({ facts: { ...d.facts, [key]: v } })} />} />
              </View>
            ))}
          </Card>
          <ReadinessList issues={transferReadiness({ ...d.facts, platforms: d.platforms })} />
          <Note text={t("buyout.escrowNote")} />
        </>
      )}
      {d.step === 3 && <SourcePicker value={d.source} onChange={(source) => patch({ source })} />}
      {d.step === 4 && (
        <Group label={t("form.includedItems")}>
          {INCLUDED.map((item) => (
            <Chip key={item} label={t(`included.${item}`)} selected={d.included.includes(item)} onPress={() => patch({ included: d.included.includes(item) ? d.included.filter((x) => x !== item) : [...d.included, item] })} />
          ))}
        </Group>
      )}
      {d.step === 5 && (
        <>
          <Field label={t("form.asking")} value={d.asking} onChangeText={(v) => patch({ asking: v })} keyboardType="number-pad" />
          {asking > 0 && (
            <Reveal style={{ gap: 4 }}>
              <Txt tone="fgMuted">{multiple == null ? t("buyout.preRevenue") : t("buyout.multiple", { x: multiple })}</Txt>
              <Txt variant="caption" tone="fgSubtle">
                {t("buyout.escrowFee")} {formatPrice(escrowFee(asking), "HKD", "")}
              </Txt>
            </Reveal>
          )}
          <Note text={t("buyout.escrowNote")} />
          <OwnershipAttest value={d.attest} onChange={(attest) => patch({ attest })} />
        </>
      )}
    </ListingWizard>
  );
}
