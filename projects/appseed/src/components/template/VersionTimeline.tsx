import { View } from "react-native";
import Animated from "react-native-reanimated";
import { growDown, popIn, slideInAt } from "@/theme/animations";
import type { Version } from "@/api/types";
import { Txt } from "@/components/ui/Txt";
import { useT } from "@/i18n";
import { formatDate } from "@/lib/format";
import { useTheme } from "@/theme/ThemeProvider";

export function VersionTimeline({ versions }: { versions: Version[] }) {
  const { c } = useTheme();
  const t = useT();
  return (
    <View>
      {versions.map((v, i) => (
        <View key={v.version} style={{ flexDirection: "row", gap: 14 }}>
          <View style={{ alignItems: "center", width: 12 }}>
            <Animated.View entering={popIn(i, 120)} style={{ width: 12, height: 12, borderRadius: 6, marginTop: 4, backgroundColor: i === 0 ? c.accent : c.bgElevated, borderWidth: 2, borderColor: i === 0 ? c.accent : c.fgSubtle }} />
            {i < versions.length - 1 && <Animated.View entering={growDown(i * 120 + 80)} style={{ flex: 1, width: 2, backgroundColor: c.border, marginVertical: 4, transformOrigin: "top" }} />}
          </View>
          <Animated.View entering={slideInAt(i, 120)} style={{ flex: 1, paddingBottom: 20, gap: 4 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Txt variant="bodyStrong" tabular style={{ fontFamily: "JetBrainsMono_700Bold", fontSize: 13 }}>
                v{v.version}
              </Txt>
              {i === 0 && (
                <View style={{ backgroundColor: c.accentSoft, borderRadius: 999, paddingHorizontal: 8, height: 20, justifyContent: "center" }}>
                  <Txt style={{ fontSize: 11, fontFamily: "DMSans_700Bold", color: c.accent }}>{t("common.latest")}</Txt>
                </View>
              )}
              <Txt variant="caption" tone="fgSubtle" style={{ marginLeft: "auto" }}>
                {formatDate(v.date, t.locale)}
              </Txt>
            </View>
            <Txt tone="fgMuted">{v.notes}</Txt>
          </Animated.View>
        </View>
      ))}
    </View>
  );
}
