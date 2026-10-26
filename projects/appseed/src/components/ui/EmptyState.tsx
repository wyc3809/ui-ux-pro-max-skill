import type { LucideIcon } from "lucide-react-native";
import { View } from "react-native";
import Animated from "react-native-reanimated";
import { enterAt } from "@/theme/animations";
import { useTheme } from "@/theme/ThemeProvider";
import { Button } from "./Button";
import { Txt } from "./Txt";

type Props = { icon: LucideIcon; title: string; body: string; action?: { label: string; onPress: () => void } };

/** Never a dead end: every empty / error state offers the next step (§1). */
export function EmptyState({ icon: Icon, title, body, action }: Props) {
  const { c } = useTheme();
  return (
    <Animated.View entering={enterAt(0)} style={{ alignItems: "center", paddingVertical: 48, paddingHorizontal: 32, gap: 10 }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: c.accentSoft, alignItems: "center", justifyContent: "center", marginBottom: 6 }}>
        <Icon size={28} color={c.accent} strokeWidth={2} />
      </View>
      <Txt variant="section" style={{ textAlign: "center" }}>
        {title}
      </Txt>
      <Txt tone="fgMuted" style={{ textAlign: "center" }}>
        {body}
      </Txt>
      {action ? <Button label={action.label} onPress={action.onPress} variant="secondary" style={{ marginTop: 8 }} /> : null}
    </Animated.View>
  );
}
