import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HeaderButton } from "@/components/ui/HeaderButton";
import { toast } from "@/components/ui/Toast";
import { Txt } from "@/components/ui/Txt";
import { useT } from "@/i18n";
import { haptic } from "@/lib/haptic";
import { useTheme } from "@/theme/ThemeProvider";
import { space } from "@/theme/tokens";
import { UploadStepper } from "./UploadStepper";

type Props = {
  title: string;
  steps: string[];
  step: number;
  setStep: (n: number) => void;
  missing: (step: number) => string[];
  submitLabel: string;
  onSubmit: () => void;
  children: React.ReactNode;
};

/** Modal wizard chrome shared by every listing form: progress, directional step slides, shake on missing fields. */
export function ListingWizard({ title, steps, step, setStep, missing, submitLabel, onSubmit, children }: Props) {
  const { c } = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const [shake, setShake] = useState(0);
  const last = step === steps.length - 1;
  const next = () => {
    if (missing(step).length > 0) {
      haptic("warning");
      setShake((s) => s + 1);
      toast(t("upload.missing"), "warning");
      return;
    }
    if (last) {
      haptic("success");
      onSubmit();
      router.back();
    } else {
      haptic("selection");
      setStep(step + 1);
    }
  };
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space.gutter, paddingBottom: 12 }}>
        <Txt variant="section">{title}</Txt>
        <HeaderButton icon="close" motion="spin" label={t("common.close")} onPress={() => router.back()} />
      </View>
      <UploadStepper step={step} total={steps.length} titles={steps} onBack={() => setStep(Math.max(0, step - 1))} onNext={next} nextLabel={last ? submitLabel : t("common.next")} shakeKey={shake}>
        <ScrollView keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: 24, gap: 16 }}>
          {children}
        </ScrollView>
      </UploadStepper>
    </View>
  );
}
