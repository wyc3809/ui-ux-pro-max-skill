import { Field, Group, Note } from "@/components/studio/FormFields";
import { ListingWizard } from "@/components/studio/ListingWizard";
import { SourcePicker } from "@/components/studio/SourcePicker";
import { Chip } from "@/components/ui/Chip";
import { toast } from "@/components/ui/Toast";
import { Txt } from "@/components/ui/Txt";
import { useT } from "@/i18n";
import { escrowFee, revenueMultiple } from "@/lib/buyout";
import { missingBuyoutFields, type BuyoutDraft } from "@/lib/listing";
import { formatPrice } from "@/lib/price";
import { useFormDraft } from "@/store/formDrafts";
import { Reveal } from "@/components/ui/Reveal";


const INCLUDED = ["source", "design", "appStore", "play", "domain", "subscribers", "social", "handover"] as const;
const EMPTY: BuyoutDraft = { step: 0, name: "", tagline: "", monthlyRevenue: "", mau: "", source: null, included: [], reason: "", asking: "" };

export default function NewBuyout() {
  const t = useT();
  const [d, patch, reset] = useFormDraft("buyout", EMPTY);
  const asking = Number(d.asking) || 0;
  const multiple = revenueMultiple(asking, Number(d.monthlyRevenue) || 0);
  return (
    <ListingWizard
      title={t("listing.buyout")}
      steps={[t("form.buyoutS1"), t("form.buyoutS2"), t("source.title"), t("form.buyoutS3"), t("form.buyoutS4")]}
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
        </>
      )}
      {d.step === 1 && (
        <>
          <Field label={t("form.monthlyRevenue")} value={d.monthlyRevenue} onChangeText={(monthlyRevenue) => patch({ monthlyRevenue })} keyboardType="number-pad" />
          <Field label={t("form.mau")} value={d.mau} onChangeText={(mau) => patch({ mau })} keyboardType="number-pad" />
          <Note text={t("form.proofHint")} />
        </>
      )}
      {d.step === 2 && <SourcePicker value={d.source} onChange={(source) => patch({ source })} />}
      {d.step === 3 && (
        <Group label={t("form.includedItems")}>
          {INCLUDED.map((item) => (
            <Chip key={item} label={t(`included.${item}`)} selected={d.included.includes(item)} onPress={() => patch({ included: d.included.includes(item) ? d.included.filter((x) => x !== item) : [...d.included, item] })} />
          ))}
        </Group>
      )}
      {d.step === 4 && (
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
        </>
      )}
    </ListingWizard>
  );
}
