import { View } from "react-native";
import Animated from "react-native-reanimated";
import { growDown, popIn } from "@/theme/animations";
import type { StoryStep as Step } from "@/api/types";
import { Icon } from "@/components/ui/Icon";
import { Txt } from "@/components/ui/Txt";
import { useT } from "@/i18n";
import { useTheme } from "@/theme/ThemeProvider";
import { radius } from "@/theme/tokens";
import { PromptBlock } from "./PromptBlock";

/** One build-story step: numbered timeline dot + line on the left, content on the right (§7). */
export function StoryStep({ step, n, last, longform }: { step: Step; n: number; last?: boolean; longform?: boolean }) {
  const { c } = useTheme();
  const t = useT();
  return (
    <View style={{ flexDirection: "row", gap: 14 }}>
      <View style={{ alignItems: "center", width: 28 }}>
        <Animated.View entering={popIn(0)} style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c.accentSoft, alignItems: "center", justifyContent: "center" }}>
          <Txt variant="caption" tone="accent" tabular style={{ fontFamily: "DMSans_800ExtraBold" }}>
            {n}
          </Txt>
        </Animated.View>
        {!last && <Animated.View entering={growDown(180)} style={{ flex: 1, width: 2, borderRadius: 1, backgroundColor: c.border, marginTop: 6, transformOrigin: "top" }} />}
      </View>
      <View style={{ flex: 1, gap: 10, paddingBottom: last ? 0 : 28 }}>
        <Txt variant="eyebrow" tone="fgSubtle">
          {t("template.step", { n })}
        </Txt>
        <Txt variant="section" style={{ fontSize: longform ? 19 : 16, marginTop: -4 }}>
          {step.title}
        </Txt>
        <Txt variant={longform ? "longform" : "body"} tone={longform ? "fg" : "fgMuted"}>
          {step.body}
        </Txt>
        {step.prompt && <PromptBlock tool={step.prompt.tool} text={step.prompt.text} />}
        {step.pitfall && (
          <View style={{ flexDirection: "row", gap: 10, padding: 12, borderRadius: radius.inset, backgroundColor: c.warnSoft }}>
            <Icon name="warning" size={17} color={c.warn} active motion="wiggle" trigger={0} enterDelay={200} style={{ marginTop: 1 }} />
            <View style={{ flex: 1, gap: 2 }}>
              <Txt variant="caption" tone="warn" style={{ fontFamily: "DMSans_700Bold" }}>
                {t("template.pitfall")}
              </Txt>
              <Txt tone="fg">{step.pitfall}</Txt>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
