import { View } from "react-native";
import Animated from "react-native-reanimated";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { toast } from "@/components/ui/Toast";
import { Txt } from "@/components/ui/Txt";
import { useT } from "@/i18n";
import { useBlocks } from "@/store/blocks";
import { rowOut, reorder } from "@/theme/animations";
import { gap } from "@/theme/tokens";

/** Me › Blocked people: everyone the viewer blocked, each with an unblock button. */
export function BlockedSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const { handles, unblock } = useBlocks();
  return (
    <Sheet open={open} onClose={onClose} title={t("moderation.blockedList")}>
      {handles.length === 0 ? (
        <Txt tone="fgMuted">{t("moderation.blockedEmpty")}</Txt>
      ) : (
        handles.map((h) => (
          <Animated.View key={h} exiting={rowOut} layout={reorder} style={{ flexDirection: "row", alignItems: "center", gap: gap.md, minHeight: 48 }}>
            <Txt variant="bodyStrong" style={{ flex: 1 }}>
              @{h}
            </Txt>
            <View>
              <Button
                label={t("moderation.unblock")}
                variant="secondary"
                onPress={() => {
                  unblock(h);
                  toast(t("moderation.unblocked", { handle: h }));
                }}
              />
            </View>
          </Animated.View>
        ))
      )}
    </Sheet>
  );
}
