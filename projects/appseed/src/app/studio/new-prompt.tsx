import { View } from "react-native";
import { Field, Group, Note } from "@/components/studio/FormFields";
import { ListingWizard } from "@/components/studio/ListingWizard";
import { Chip, Tag } from "@/components/ui/Chip";
import { toast } from "@/components/ui/Toast";
import { Txt } from "@/components/ui/Txt";
import { useT } from "@/i18n";
import { missingPromptFields, promptDraftVariables, type PromptDraft } from "@/lib/listing";
import { formatPrice } from "@/lib/price";
import { PROMPT_TIERS, splitPreview } from "@/lib/prompt";
import { useFormDraft } from "@/store/formDrafts";

import { useTheme } from "@/theme/ThemeProvider";
import { radius, font } from "@/theme/tokens";
import { Reveal } from "@/components/ui/Reveal";

const TOOLS = ["Claude Code", "Claude", "Cursor", "v0", "Windsurf"];
const EMPTY: PromptDraft = { step: 0, title: "", summary: "", tool: null, text: "", previewLines: 2, tier: null };

export default function NewPrompt() {
  const { c } = useTheme();
  const t = useT();
  const [d, patch, reset] = useFormDraft("prompt", EMPTY);
  const vars = promptDraftVariables(d);
  const { visible, lockedLines } = splitPreview(d.text.trim(), d.previewLines);
  return (
    <ListingWizard
      title={t("listing.prompt")}
      steps={[t("form.promptS1"), t("form.promptS2")]}
      step={d.step}
      setStep={(step) => patch({ step })}
      missing={(s) => missingPromptFields(d, s)}
      submitLabel={t("upload.submit")}
      onSubmit={() => {
        reset();
        toast(t("form.listed"));
      }}
    >
      {d.step === 0 && (
        <>
          <Field label={t("form.promptTitle")} value={d.title} onChangeText={(title) => patch({ title })} />
          <Field label={t("upload.tagline")} value={d.summary} onChangeText={(summary) => patch({ summary })} />
          <Group label={t("form.promptTool")}>
            {TOOLS.map((tool) => (
              <Chip key={tool} label={tool} selected={d.tool === tool} onPress={() => patch({ tool })} />
            ))}
          </Group>
          <Field label={t("form.promptText")} hint={t("form.promptTextHint")} value={d.text} onChangeText={(text) => patch({ text })} multiline autoCapitalize="none" keyboardType="ascii-capable" />
          {vars.length > 0 && (
            <Reveal style={{ gap: 8 }}>
              <Txt variant="caption" tone="fgMuted">
                {t("form.detectedVars", { n: vars.length })}
              </Txt>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {vars.map((v, i) => (
                  <Tag key={v} label={`{{${v}}}`} index={i} />
                ))}
              </View>
            </Reveal>
          )}
        </>
      )}
      {d.step === 1 && (
        <>
          <Group label={t("form.previewLines")}>
            {[1, 2, 3, 4].map((n) => (
              <Chip key={n} label={String(n)} selected={d.previewLines === n} onPress={() => patch({ previewLines: n })} />
            ))}
          </Group>
          {/* Live preview of exactly what a non-buyer will see. */}
          <View style={{ backgroundColor: c.bgCode, borderRadius: radius.inset, padding: 16, gap: 8, borderWidth: 1, borderColor: c.border }}>
            <Txt variant="eyebrow" tone="fgSubtle">
              {t("promptPage.preview")}
            </Txt>
            <Txt variant="code">{visible}</Txt>
            {lockedLines > 0 && (
              <Txt variant="caption" tone="accent" style={{ fontFamily: font.semibold }}>
                {t("promptPage.locked", { n: lockedLines })}
              </Txt>
            )}
          </View>
          <Group label={t("upload.tier")}>
            {PROMPT_TIERS.map((p) => (
              <Chip key={p} label={formatPrice(p, "HKD", t("common.free"))} selected={d.tier === p} onPress={() => patch({ tier: p })} />
            ))}
          </Group>
          <Note text={t("license.shared")} />
        </>
      )}
    </ListingWizard>
  );
}
