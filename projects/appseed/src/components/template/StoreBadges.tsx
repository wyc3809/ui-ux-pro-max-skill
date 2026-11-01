import { Linking, Platform, View } from "react-native";
import { BrandIcon } from "@/components/ui/Icon";
import { PressableScale } from "@/components/ui/PressableScale";
import { Txt } from "@/components/ui/Txt";
import { useT } from "@/i18n";
import type { StoreLinks } from "@/lib/storeLinks";
import { useTheme } from "@/theme/ThemeProvider";
import { gap, radius } from "@/theme/tokens";

/**
 * "Download on the App Store" / "Get it on Google Play" for listings whose app is live (§39). Links were reduced
 * to the store's own canonical URL when saved (lib/storeLinks.ts), so these can only open the real store.
 */
export function StoreBadges({ links }: { links?: StoreLinks }) {
  const { c } = useTheme();
  const t = useT();
  const items = [
    links?.appStore && { key: "appStore" as const, url: links.appStore, label: t("media.getOnAppStore") },
    links?.googlePlay && { key: "googlePlay" as const, url: links.googlePlay, label: t("media.getOnGooglePlay") },
  ].filter(Boolean) as { key: "appStore" | "googlePlay"; url: string; label: string }[];
  if (!items.length) return null;
  const open = (url: string) => (Platform.OS === "web" ? window.open(url, "_blank", "noopener") : Linking.openURL(url).catch(() => {}));
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: gap.sm }}>
      {items.map((it) => (
        <PressableScale key={it.key} onPress={() => open(it.url)} accessibilityRole="link" accessibilityLabel={it.label} style={{ flexDirection: "row", alignItems: "center", gap: gap.sm, minHeight: 44, paddingHorizontal: gap.lg, borderRadius: radius.control, backgroundColor: c.fg }}>
          <BrandIcon brand={it.key} size={18} color={c.bg} />
          <Txt variant="bodyStrong" style={{ color: c.bg }}>
            {it.label}
          </Txt>
        </PressableScale>
      ))}
    </View>
  );
}
