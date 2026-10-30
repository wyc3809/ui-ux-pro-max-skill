import { View } from "react-native";

import { useTheme } from "@/theme/ThemeProvider";
import { Button } from "./Button";
import { Icon, type IconName } from "./Icon";
import { Txt } from "./Txt";
import { Reveal } from "./Reveal";

type Action = { label: string; onPress: () => void; loading?: boolean };
type Props = { icon: IconName; title: string; body: string; action?: Action; secondaryAction?: Action };

/** Never a dead end: every empty / error state offers the next step (§1). */
export function EmptyState({ icon, title, body, action, secondaryAction }: Props) {
  const { c } = useTheme();
  return (
    <Reveal style={{ alignItems: "center", paddingVertical: 48, paddingHorizontal: 32, gap: 12 }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: c.accentSoft, alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
        <Icon name={icon} size={28} color={c.accent} loop="breathe" enterDelay={160} />
      </View>
      <Txt variant="section" style={{ textAlign: "center" }}>
        {title}
      </Txt>
      <Txt tone="fgMuted" style={{ textAlign: "center" }}>
        {body}
      </Txt>
      {action ? <Button label={action.label} onPress={action.onPress} loading={action.loading} variant="secondary" style={{ marginTop: 8 }} /> : null}
      {secondaryAction ? <Button label={secondaryAction.label} onPress={secondaryAction.onPress} loading={secondaryAction.loading} variant="ghost" /> : null}
    </Reveal>
  );
}
