import * as Clipboard from "expo-clipboard";
import { Check, Copy } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Animated, { LinearTransition, ReduceMotion, ZoomIn } from "react-native-reanimated";
import { PressableScale } from "@/components/ui/PressableScale";
import { toast } from "@/components/ui/Toast";
import { Txt } from "@/components/ui/Txt";
import { useT } from "@/i18n";
import { useTheme } from "@/theme/ThemeProvider";
import { motion, radius } from "@/theme/tokens";

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
      <View style={{ flexDirection: "row", alignItems: "center", paddingLeft: 14, paddingRight: 6, paddingTop: 6 }}>
        <Txt variant="eyebrow" tone="fgSubtle" style={{ flex: 1 }}>
          {tool === "Claude Code" ? "PROMPT · CLAUDE CODE" : `PROMPT · ${tool}`}
        </Txt>
        <PressableScale onPress={copy} accessibilityLabel={t("common.copy")} style={{ height: 36, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 10 }}>
          <Animated.View key={copied ? "y" : "n"} entering={ZoomIn.duration(180)}>
            {copied ? <Check size={15} color={c.live} strokeWidth={2.6} /> : <Copy size={15} color={c.fgMuted} strokeWidth={2.2} />}
          </Animated.View>
          <Txt variant="caption" tone={copied ? "live" : "fgMuted"} style={{ fontFamily: "DMSans_700Bold" }}>
            {copied ? t("common.copied") : t("common.copy")}
          </Txt>
        </PressableScale>
      </View>
      <Pressable onLongPress={copy} delayLongPress={350}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 14, paddingTop: 2 }}>
          <Txt variant="code" selectable>
            {shown}
          </Txt>
        </ScrollView>
      </Pressable>
      {long && (
        <PressableScale onPress={() => setExpanded((e) => !e)} style={{ height: 40, alignItems: "center", justifyContent: "center", borderTopWidth: 1, borderTopColor: c.border }}>
          <Txt variant="caption" tone="accent" style={{ fontFamily: "DMSans_700Bold" }}>
            {expanded ? t("common.collapse") : t("common.expand")}
          </Txt>
        </PressableScale>
      )}
    </Animated.View>
  );
}
