import { router } from "expo-router";
import { View } from "react-native";
import type { Listing } from "@/api/types";
import { findTemplate } from "@/api/mockServer";
import { PressableScale } from "@/components/ui/PressableScale";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Txt } from "@/components/ui/Txt";
import { Cover } from "@/components/template/Cover";
import { useT } from "@/i18n";
import { formatPrice } from "@/lib/price";
import { space } from "@/theme/tokens";

export function ListingRow({ l }: { l: Listing }) {
  const t = useT();
  const tpl = findTemplate(l.slug);
  if (!tpl) return null;
  return (
    <PressableScale onPress={() => router.push(`/template/${l.slug}`)} scaleTo={0.985} accessibilityLabel={tpl.name} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: space.rowPadX, paddingVertical: space.rowPadY }}>
      <Cover t={tpl} style={{ width: 64 }} rounded={8} />
      <View style={{ flex: 1, gap: 4 }}>
        <Txt variant="bodyStrong" numberOfLines={1}>
          {tpl.name}
        </Txt>
        <StatusBadge status={l.status} />
      </View>
      <View style={{ alignItems: "flex-end", gap: 2 }}>
        <Txt variant="bodyStrong" tabular>
          {formatPrice(l.monthRevenue, "HKD", "HK$0")}
        </Txt>
        <Txt variant="caption" tone="fgSubtle" tabular>
          {t("studio.monthSales", { n: l.monthSales })}
        </Txt>
      </View>
    </PressableScale>
  );
}
