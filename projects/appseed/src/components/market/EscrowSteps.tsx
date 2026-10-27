import { View } from "react-native";
import Animated from "react-native-reanimated";
import { Txt } from "@/components/ui/Txt";
import { growDown, popIn, slideInAt } from "@/theme/animations";
import { useTheme } from "@/theme/ThemeProvider";
import { font } from "@/theme/tokens";

/** Numbered escrow timeline: dots pop in one by one and the connector draws downward. Order is real information. */
export function EscrowSteps({ steps, active = -1 }: { steps: string[]; active?: number }) {
  const { c } = useTheme();
  return (
    <View>
      {steps.map((label, i) => {
        const done = i <= active;
        return (
          <View key={label} style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ alignItems: "center", width: 26 }}>
              <Animated.View entering={popIn(i, 110)} style={{ width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: done ? c.accent : c.accentSoft }}>
                <Txt variant="caption" tabular style={{ fontFamily: font.bold, color: done ? c.accentFg : c.accent }}>
                  {i + 1}
                </Txt>
              </Animated.View>
              {i < steps.length - 1 && <Animated.View entering={growDown(i * 110 + 80)} style={{ width: 2, flex: 1, minHeight: 18, backgroundColor: c.border, marginVertical: 4, transformOrigin: "top" }} />}
            </View>
            <Animated.View entering={slideInAt(i, 110)} style={{ flex: 1, paddingTop: 4, paddingBottom: 16 }}>
              <Txt>{label}</Txt>
            </Animated.View>
          </View>
        );
      })}
    </View>
  );
}
