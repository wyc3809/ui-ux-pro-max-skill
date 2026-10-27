import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Animated, { LinearTransition, ReduceMotion, ZoomIn } from "react-native-reanimated";
import { Icon } from "@/components/ui/Icon";
import { PressableScale } from "@/components/ui/PressableScale";
import { toast } from "@/components/ui/Toast";
import { Txt } from "@/components/ui/Txt";
import { useT } from "@/i18n";
import { useTheme } from "@/theme/ThemeProvider";
import { motion, radius, font } from "@/theme/tokens";

const MAX_LINES = 12;

/** Mono prompt with copy (success haptic). Long-press anywhere also copies (§11.10). Folds beyond 12 lines. */
export function PromptBlock({ tool, text }: { tool: string; text: string }) {
  const { c } = useTheme();
  const t = useT();
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const lines = text.split("\n");
  const long = lines.length > MAX_LINES;
  const shown = long && !expanded ? lines.slice(0, MAX_LINES).join("\n") : text;
  const copy = async () => {
    await Clipboard.setStringAsync(text).catch(() => {});
    setCopied(true);
    toast(t("common.copied"));
    setTimeout(() => setCopied(false), 1600);
  };
  return (
    <Animated.View layout={LinearTransition.duration(motion.rowIn.duration).easing(motion.rowIn.easing).reduceMotion(ReduceMotion.System)} style={{ backgroundColor: c.bgCode, borderRadius: radius.inset, overflow: "hidden", borderWidth: 1, borderColor: c.border }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingLeft: 16, paddingRight: 8, paddingTop: 8 }}>
        <Txt variant="eyebrow" tone="fgSubtle" style={{ flex: 1 }}>
          {tool === "Claude Code" ? "PROMPT · CLAUDE CODE" : `PROMPT · ${tool}`}
        </Txt>
        <PressableScale onPress={copy} accessibilityLabel={t("common.copy")} style={{ height: 36, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10 }}>
          <Animated.View key={copied ? "y" : "n"} entering={ZoomIn.duration(180)}>
            {copied ? <Icon name="checkCircle" size={16} color={c.live} active /> : <Icon name="copy" size={15} color={c.fgMuted} />}
          </Animated.View>
          <Txt variant="caption" tone={copied ? "live" : "fgMuted"} style={{ fontFamily: font.semibold }}>
            {copied ? t("common.copied") : t("common.copy")}
          </Txt>
        </PressableScale>
      </View>
      <Pressable onLongPress={copy} delayLongPress={350}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16, paddingTop: 2 }}>
          <Txt variant="code" selectable>
            {shown}
          </Txt>
        </ScrollView>
      </Pressable>
      {long && (
        <PressableScale onPress={() => setExpanded((e) => !e)} style={{ height: 40, alignItems: "center", justifyContent: "center", backgroundColor: c.bgMuted }}>
          <Txt variant="caption" tone="accent" style={{ fontFamily: font.semibold }}>
            {expanded ? t("common.collapse") : t("common.expand")}
          </Txt>
        </PressableScale>
      )}
    </Animated.View>
  );
}
