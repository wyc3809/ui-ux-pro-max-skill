import { Icon } from "@/components/ui/Icon";
import { PressableScale } from "@/components/ui/PressableScale";
import { useT } from "@/i18n";
import { requireAuth } from "@/store/authGate";
import { haptic } from "@/lib/haptic";
import { useFavorites } from "@/store/favorites";
import { useTheme } from "@/theme/ThemeProvider";

/** Bookmark (收藏) morphs outline → filled while popping; un-saving deflates back to outline. Likes use the heart. */
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
        requireAuth("auth.reasonFavorite", () => toggle(slug));
      }}
      style={[{ width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center", backgroundColor: onSurface ? c.bgElevated : c.bgMuted }, onSurface && soft]}
    >
      <Icon name="bookmark" size={size * 0.48} color={c.fg} activeColor={c.accent} active={on} motion="pop" />
    </PressableScale>
  );
}
