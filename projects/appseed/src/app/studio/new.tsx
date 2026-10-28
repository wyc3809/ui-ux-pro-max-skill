import { router } from "expo-router";
import { ScrollView, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState } from "react";
import type { CategoryKey } from "@/api/types";
import { Field, Group, Note } from "@/components/studio/FormFields";
import { SourcePicker } from "@/components/studio/SourcePicker";
import { OwnershipAttest } from "@/components/studio/OwnershipAttest";
import { UploadStepper } from "@/components/studio/UploadStepper";
import { Chip } from "@/components/ui/Chip";
import { HeaderButton } from "@/components/ui/HeaderButton";
import { Icon } from "@/components/ui/Icon";
import { PressableScale } from "@/components/ui/PressableScale";
import { toast } from "@/components/ui/Toast";
import { Txt } from "@/components/ui/Txt";
import { useT } from "@/i18n";
import { haptic } from "@/lib/haptic";
import { LICENSES } from "@/lib/license";
import { formatPrice, PRICE_TIERS } from "@/lib/price";
import { missingFields, UPLOAD_STEPS } from "@/lib/upload";
import { useUploadDraft } from "@/store/uploadDraft";
import { reorder, rowIn, rowOut } from "@/theme/animations";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space } from "@/theme/tokens";

const CATS: CategoryKey[] = ["tools", "finance", "ai", "games", "hk", "merchant"];

export default function UploadWizard() {
  const { c } = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const { draft: d, patch, reset } = useUploadDraft();
  const [shake, setShake] = useState(0);
  const step = d.step;

  const next = () => {
    if (missingFields(d, step).length > 0) {
      haptic("warning");
      setShake((s) => s + 1);
      toast(t("upload.missing"), "warning");
      return;
    }
    if (step < UPLOAD_STEPS - 1) {
      haptic("selection");
      patch({ step: step + 1 });
    } else {
      toast(t("upload.submitted"));
      reset();
      router.back();
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space.gutter, paddingBottom: 12 }}>
        <Txt variant="section">{t("upload.title")}</Txt>
        <HeaderButton icon="close" motion="spin" label={t("common.close")} onPress={() => router.back()} />
      </View>
      <UploadStepper
        step={step}
        total={UPLOAD_STEPS}
        titles={[t("upload.s1"), t("upload.s2"), t("upload.s3"), t("upload.s4"), t("upload.s5")]}
        onBack={() => patch({ step: Math.max(0, step - 1) })}
        onNext={next}
        nextLabel={step === UPLOAD_STEPS - 1 ? t("upload.submit") : t("common.next")}
        shakeKey={shake}
      >
        <ScrollView keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: 24, gap: 16 }}>
          {step === 0 && (
            <>
              <Field label={t("upload.name")} value={d.name} onChangeText={(name) => patch({ name })} />
              <Field label={t("upload.tagline")} value={d.tagline} onChangeText={(tagline) => patch({ tagline })} />
              <Group label={t("upload.category")}>
                {CATS.map((k) => (
                  <Chip key={k} label={t(`category.${k}`)} selected={d.category === k} onPress={() => patch({ category: k })} />
                ))}
              </Group>
              <Group label={t("upload.platforms")}>
                {["iOS", "Android", "Web"].map((p) => (
                  <Chip key={p} label={p} selected={d.platforms.includes(p)} onPress={() => patch({ platforms: d.platforms.includes(p) ? d.platforms.filter((x) => x !== p) : [...d.platforms, p] })} />
                ))}
              </Group>
            </>
          )}
          {step === 1 && (
            <>
              <SourcePicker value={d.source} onChange={(source) => patch({ source })} onStack={(stack) => patch({ stack })} />
              {!d.source && <Note text={t("upload.readmeRule")} />}
            </>
          )}
          {step === 2 && (
            <Group label={t("upload.screenshots")}>
              {Array.from({ length: d.screenshots }, (_, i) => (
                <Animated.View key={i} entering={rowIn} exiting={rowOut} style={{ width: 72, aspectRatio: 9 / 19.5, borderRadius: 12, backgroundColor: c.accentSoft, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center" }}>
                  <Txt tone="accent" variant="caption">
                    {i + 1}
                  </Txt>
                </Animated.View>
              ))}
              {d.screenshots < 8 && (
                <PressableScale onPress={() => patch({ screenshots: d.screenshots + 1 })} hapticKind="tap" accessibilityLabel={t("upload.addShot")} style={{ width: 72, aspectRatio: 9 / 19.5, borderRadius: 12, borderWidth: 1.5, borderStyle: "dashed", borderColor: c.fgSubtle, alignItems: "center", justifyContent: "center" }}>
                  <Icon name="image" size={20} color={c.fgSubtle} motion="bounce" trigger={d.screenshots} />
                </PressableScale>
              )}
            </Group>
          )}
          {step === 3 && (
            <>
              {d.storySteps.map((s, i) => (
                <Animated.View key={i} entering={rowIn} exiting={rowOut} layout={reorder} style={{ gap: 12, padding: 16, borderRadius: radius.card, backgroundColor: c.bgElevated, borderWidth: 1, borderColor: c.border }}>
                  <Txt variant="eyebrow" tone="fgSubtle">
                    {t("template.step", { n: i + 1 })}
                  </Txt>
                  <Field label={t("upload.stepTitle")} value={s.title} onChangeText={(title) => patch({ storySteps: d.storySteps.map((x, j) => (j === i ? { ...x, title } : x)) })} />
                  <Field label={t("upload.stepBody")} value={s.body} multiline onChangeText={(body) => patch({ storySteps: d.storySteps.map((x, j) => (j === i ? { ...x, body } : x)) })} />
                </Animated.View>
              ))}
              <PressableScale onPress={() => patch({ storySteps: [...d.storySteps, { title: "", body: "" }] })} hapticKind="tap" style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 48, borderRadius: radius.control, backgroundColor: c.bgMuted }}>
                <Icon name="plus" size={18} color={c.fg} motion="spin" trigger={d.storySteps.length} />
                <Txt variant="bodyStrong">{t("upload.addStep")}</Txt>
              </PressableScale>
              <Group label={t("upload.freePreview")}>
                {[1, 2, 3].map((n) => (
                  <Chip key={n} label={String(n)} selected={d.freePreviewSteps === n} onPress={() => patch({ freePreviewSteps: n })} />
                ))}
              </Group>
            </>
          )}
          {step === 4 && (
            <>
              <Group label={t("upload.tier")}>
                {PRICE_TIERS.map((p) => (
                  <Chip key={p} label={formatPrice(p, "HKD", t("common.free"))} selected={d.tier === p} onPress={() => patch({ tier: p })} />
                ))}
              </Group>
              <Group label={t("template.license")}>
                {LICENSES.map((l) => (
                  <Chip key={l} label={t(`license.${l}`)} selected={d.license === l} onPress={() => patch({ license: l })} />
                ))}
              </Group>
              <OwnershipAttest value={d.originalityConfirmed} onChange={(v) => patch({ originalityConfirmed: v })} />
            </>
          )}
        </ScrollView>
      </UploadStepper>
    </View>
  );
}
