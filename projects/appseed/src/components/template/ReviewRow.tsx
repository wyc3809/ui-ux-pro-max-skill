import { useState } from "react";
import { Pressable, View } from "react-native";
import Animated from "react-native-reanimated";
import type { Review } from "@/api/types";
import { Icon } from "@/components/ui/Icon";
import { RatingStars } from "@/components/ui/RatingStars";
import { Txt } from "@/components/ui/Txt";
import { useT } from "@/i18n";
import { formatDate } from "@/lib/format";
import { reorder } from "@/theme/animations";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, font } from "@/theme/tokens";

export function ReviewRow({ r }: { r: Review }) {
  const { c } = useTheme();
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <Animated.View layout={reorder} style={{ gap: 8, paddingVertical: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c.accentSoft, alignItems: "center", justifyContent: "center" }}>
          <Txt tone="accent" style={{ fontFamily: font.semibold }}>{r.author[0]}</Txt>
        </View>
        <View style={{ flex: 1 }}>
          <Txt variant="bodyStrong">{r.author}</Txt>
          <Txt variant="caption" tone="fgSubtle">
            {formatDate(r.date, t.locale)} · <Txt variant="caption" tone="live">{t("template.verifiedBuyer")}</Txt>
          </Txt>
        </View>
        <RatingStars value={r.rating} count={99} size={11} />
      </View>
      <Pressable onPress={() => setOpen((o) => !o)} accessibilityRole="button" accessibilityState={{ expanded: open }}>
        <Txt numberOfLines={open ? undefined : 4}>{r.body}</Txt>
      </Pressable>
      {r.reply && (
        <View style={{ flexDirection: "row", gap: 8, marginLeft: 12, padding: 12, borderRadius: radius.inset, backgroundColor: c.bgMuted }}>
          <Icon name="reply" size={15} color={c.fgSubtle} enterDelay={120} />
          <View style={{ flex: 1, gap: 2 }}>
            <Txt variant="caption" tone="fgSubtle" style={{ fontFamily: font.semibold }}>
              {t("template.creatorReply")}
            </Txt>
            <Txt>{r.reply}</Txt>
          </View>
        </View>
      )}
    </Animated.View>
  );
}
