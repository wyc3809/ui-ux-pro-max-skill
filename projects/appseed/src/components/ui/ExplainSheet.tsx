import { View } from "react-native";
import Animated from "react-native-reanimated";
import { useT } from "@/i18n";
import { slideInAt } from "@/theme/animations";
import { useTheme } from "@/theme/ThemeProvider";
import { gap, radius } from "@/theme/tokens";
import { Button } from "./Button";
import { Icon, type IconName } from "./Icon";
import { Sheet } from "./Sheet";
import { Txt } from "./Txt";

/** Plain-language explanation of an algorithm, one numbered point per rule, so ranking is never a black box. */
export function ExplainSheet({ open, onClose, title, points }: { open: boolean; onClose: () => void; title: string; points: { icon: IconName; text: string }[] }) {
  const { c } = useTheme();
  const t = useT();
  return (
    <Sheet open={open} onClose={onClose} title={title} footer={<Button label={t("common.done")} variant="secondary" onPress={onClose} />}>
      <View style={{ gap: gap.lg }}>
        {points.map((p, i) => (
          <Animated.View key={i} entering={slideInAt(i)} style={{ flexDirection: "row", gap: gap.md, alignItems: "flex-start" }}>
            <View style={{ width: 32, height: 32, borderRadius: radius.control, backgroundColor: c.accentSoft, alignItems: "center", justifyContent: "center" }}>
              <Icon name={p.icon} size={16} color={c.accent} enterDelay={i * 60} />
            </View>
            <Txt style={{ flex: 1 }}>{p.text}</Txt>
          </Animated.View>
        ))}
      </View>
    </Sheet>
  );
}
