import { View } from "react-native";
import { Field, Group } from "@/components/studio/FormFields";
import { ListingWizard } from "@/components/studio/ListingWizard";
import { Chip, Tag } from "@/components/ui/Chip";
import { Switch } from "@/components/ui/Switch";
import { toast } from "@/components/ui/Toast";
import { Txt } from "@/components/ui/Txt";
import { useT } from "@/i18n";
import { missingLaunchFields, type LaunchDraft } from "@/lib/listing";
import { useFormDraft } from "@/store/formDrafts";
import { useTheme } from "@/theme/ThemeProvider";
import { radius } from "@/theme/tokens";
import { api } from "@/api/mockServer";
import { OwnershipAttest } from "@/components/studio/OwnershipAttest";
import { BOOST_PRODUCT } from "@/lib/launch";
import { formatPrice } from "@/lib/price";

const TOOLS = ["Claude Code", "Cursor", "v0", "Windsurf", "Bolt", "Lovable"];
const EMPTY: LaunchDraft = { step: 0, name: "", tagline: "", aiTools: [], buildDays: "", link: "", boost: false, attest: false };

export default function NewLaunch() {
  const { c } = useTheme();
  const t = useT();
  const [d, patch, reset] = useFormDraft("launch", EMPTY);
  return (
    <ListingWizard
      title={t("listing.launch")}
      steps={[t("form.launchS1"), t("form.launchS2")]}
      step={d.step}
      setStep={(step) => patch({ step })}
      missing={(s) => missingLaunchFields(d, s)}
      submitLabel={t("form.publish")}
      onSubmit={() => {
        const boost = d.boost;
        reset();
        if (!boost) return toast(t("form.published"));
        // The boost is charged through in-app purchase; the listing publishes either way.
        api.purchaseBoost(BOOST_PRODUCT.id).then(() => toast(t("form.boostPaid")));
      }}
    >
      {d.step === 0 && (
        <>
          <Field label={t("form.appName")} value={d.name} onChangeText={(name) => patch({ name })} />
          <Field label={t("upload.tagline")} value={d.tagline} onChangeText={(tagline) => patch({ tagline })} />
          <Group label={t("form.aiTools")}>
            {TOOLS.map((tool) => (
              <Chip key={tool} label={tool} selected={d.aiTools.includes(tool)} onPress={() => patch({ aiTools: d.aiTools.includes(tool) ? d.aiTools.filter((x) => x !== tool) : [...d.aiTools, tool] })} />
            ))}
          </Group>
          <Field label={t("form.buildDays")} value={d.buildDays} onChangeText={(buildDays) => patch({ buildDays })} keyboardType="number-pad" />
        </>
      )}
      {d.step === 1 && (
        <>
          <Field label={t("form.link")} value={d.link} onChangeText={(link) => patch({ link })} placeholder="https://" autoCapitalize="none" keyboardType="url" />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: radius.inset, backgroundColor: c.bgMuted }}>
            <View style={{ flex: 1, gap: 4 }}>
              <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                <Txt variant="bodyStrong">{t("form.boost")}</Txt>
                {d.boost && <Tag label={t("launch.sponsored")} />}
              </View>
              <Txt variant="caption" tone="fgMuted">
                {t("form.boostBody", { price: formatPrice(BOOST_PRODUCT.price, "HKD", "") })}
              </Txt>
            </View>
            <Switch label={t("form.boost")} value={d.boost} onValueChange={(boost) => patch({ boost })} />
          </View>
          <OwnershipAttest value={d.attest} onChange={(attest) => patch({ attest })} />
        </>
      )}
    </ListingWizard>
  );
}
