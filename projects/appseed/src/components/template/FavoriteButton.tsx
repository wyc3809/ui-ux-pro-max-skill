import { Icon } from "@/components/ui/Icon";
import { PressableScale } from "@/components/ui/PressableScale";
import { useT } from "@/i18n";
import { haptic } from "@/lib/haptic";
import { useFavorites } from "@/store/favorites";
import { useTheme } from "@/theme/ThemeProvider";

/** Heart morphs outline → filled while popping 1 → 1.3 → 1 (§8 收藏); un-saving deflates back to outline. */
export function FavoriteButton({ slug, size = 40, onSurface = false }: { slug: string; size?: number; onSurface?: boolean }) {
  const { c, soft } = useTheme();
  const t = useT();
  const on = useFavorites((s) => s.slugs.includes(slug));
  const toggle = useFavorites((s) => s.toggle);
  return (
    <PressableScale
      accessibilityLabel={on ? t("template.unfavorite") : t("template.favorite")}
      accessibilityState={{ selected: on }}
      scaleTo={0.9}
      onPress={() => {
        haptic("tap");
        toggle(slug);
      }}
      style={[{ width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center", backgroundColor: onSurface ? c.bgElevated : c.bgMuted }, onSurface && soft]}
    >
      <Icon name="heart" size={size * 0.5} color={c.fg} activeColor={c.danger} active={on} motion="pop" />
    </PressableScale>
  );
}
