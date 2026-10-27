import { router } from "expo-router";
import { View } from "react-native";
import Animated from "react-native-reanimated";
import { Icon, type IconName } from "@/components/ui/Icon";
import { PressableScale } from "@/components/ui/PressableScale";
import { Sheet } from "@/components/ui/Sheet";
import { Txt } from "@/components/ui/Txt";
import { useT, type TKey } from "@/i18n";
import { slideInAt } from "@/theme/animations";
import { useTheme } from "@/theme/ThemeProvider";
import { radius } from "@/theme/tokens";

const OPTIONS: { icon: IconName; title: TKey; body: TKey; route: string }[] = [
  { icon: "layers", title: "listing.template", body: "listing.templateBody", route: "/studio/new" },
  { icon: "terminal", title: "listing.prompt", body: "listing.promptBody", route: "/studio/new-prompt" },
  { icon: "briefcase", title: "listing.buyout", body: "listing.buyoutBody", route: "/studio/new-buyout" },
  { icon: "rocket", title: "listing.launch", body: "listing.launchBody", route: "/studio/new-launch" },
];

/** "What do you want to list?" — four options slide in one after another. */
export function ListingChooser({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { c } = useTheme();
  const t = useT();
  return (
    <Sheet open={open} onClose={onClose} title={t("listing.choose")}>
      {OPTIONS.map((o, i) => (
        <Animated.View key={o.route} entering={slideInAt(i, 70)}>
          <PressableScale
            onPress={() => {
              onClose();
              router.push(o.route as never);
            }}
            hapticKind="tap"
            accessibilityLabel={t(o.title)}
            scaleTo={0.98}
            style={{ flexDirection: "row", alignItems: "center", gap: 16, padding: 16, borderRadius: radius.row, backgroundColor: c.bgMuted }}
          >
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: c.accentSoft, alignItems: "center", justifyContent: "center" }}>
              <Icon name={o.icon} size={22} color={c.accent} active enterDelay={120 + i * 70} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt variant="bodyStrong">{t(o.title)}</Txt>
              <Txt variant="caption" tone="fgMuted">
                {t(o.body)}
              </Txt>
            </View>
            <Icon name="chevronRight" size={18} color={c.fgSubtle} enter={false} />
          </PressableScale>
        </Animated.View>
      ))}
    </Sheet>
  );
}
