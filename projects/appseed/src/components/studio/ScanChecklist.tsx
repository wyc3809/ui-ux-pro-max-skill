import { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import type { ScanReport } from "@/api/types";
import { Icon } from "@/components/ui/Icon";
import { Txt } from "@/components/ui/Txt";
import { useT, type TKey } from "@/i18n";
import type { CheckId } from "@/lib/sourceScan";
import { slideInAt } from "@/theme/animations";
import { useTheme } from "@/theme/ThemeProvider";
import { radius } from "@/theme/tokens";

const ORDER: CheckId[] = ["readme", "runSteps", "secrets", "size", "lockfile", "license", "framework"];
const FIX: Partial<Record<CheckId, TKey>> = { secrets: "source.fixSecrets", readme: "source.fixReadme", runSteps: "source.fixRunSteps", size: "source.fixSize" };
const STAGGER = 180;

/**
 * While scanning, every check breathes as pending and an indeterminate bar sweeps.
 * When the report lands, checks resolve one after another into pass / warn / fail.
 */
export function ScanChecklist({ report }: { report: ScanReport | null }) {
  const { c } = useTheme();
  const t = useT();
  const [revealed, setRevealed] = useState(report ? ORDER.length : 0);

  useEffect(() => {
    if (!report) {
      setRevealed(0);
      return;
    }
    let n = 0;
    setRevealed(0);
    const id = setInterval(() => {
      n += 1;
      setRevealed(n);
      if (n >= ORDER.length) clearInterval(id);
    }, STAGGER);
    return () => clearInterval(id);
  }, [report]);

  return (
    <View style={{ gap: 12 }}>
      {!report && <SweepBar />}
      {ORDER.map((id, i) => {
        const check = report && i < revealed ? report.checks.find((x) => x.id === id) : undefined;
        const tone = !check ? c.fgSubtle : check.status === "pass" ? c.live : check.status === "warn" ? c.warn : c.danger;
        return (
          <Animated.View key={id} entering={slideInAt(i, 50)} style={{ gap: 4 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              {!check ? (
                <Icon name="clock" size={18} color={c.fgSubtle} loop="breathe" enter={false} />
              ) : (
                <Icon key={check.status} name={check.status === "pass" ? "checkCircle" : check.status === "warn" ? "alert" : "closeCircle"} size={18} color={tone} active motion={check.status === "fail" ? "wiggle" : "pop"} trigger={check.status} />
              )}
              <Txt style={{ flex: 1 }} tone={check?.status === "fail" ? "danger" : "fg"}>
                {t(`source.${id}`)}
              </Txt>
              {check?.detail && check.status === "pass" ? (
                <Txt variant="caption" tone="fgSubtle">
                  {check.detail}
                </Txt>
              ) : null}
            </View>
            {check?.status === "fail" && (
              <Animated.View entering={slideInAt(0)} style={{ marginLeft: 32, padding: 12, borderRadius: radius.control, backgroundColor: c.dangerSoft, gap: 4 }}>
                {check.detail ? (
                  <Txt variant="code" tone="danger">
                    {check.detail}
                  </Txt>
                ) : null}
                {FIX[id] ? <Txt variant="caption">{t(FIX[id]!)}</Txt> : null}
              </Animated.View>
            )}
          </Animated.View>
        );
      })}
    </View>
  );
}

/** Indeterminate progress: a short bar sliding across while the server scans. */
function SweepBar() {
  const { c } = useTheme();
  const x = useSharedValue(0);
  useEffect(() => {
    x.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad), reduceMotion: ReduceMotion.System }), -1, true);
  }, [x]);
  const a = useAnimatedStyle(() => ({ left: `${x.value * 70}%` }));
  return (
    <View style={{ height: 4, borderRadius: 2, backgroundColor: c.bgMuted, overflow: "hidden", marginBottom: 4 }}>
      <Animated.View style={[{ position: "absolute", top: 0, bottom: 0, width: "30%", borderRadius: 2, backgroundColor: c.accent }, a]} />
    </View>
  );
}
