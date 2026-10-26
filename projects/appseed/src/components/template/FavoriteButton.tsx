import { Heart } from "lucide-react-native";
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { PressableScale } from "@/components/ui/PressableScale";
import { useT } from "@/i18n";
import { haptic } from "@/lib/haptic";
import { useFavorites } from "@/store/favorites";
import { useTheme } from "@/theme/ThemeProvider";
import { motion } from "@/theme/tokens";

/** Heart pops 1 → 1.3 → 1 and fills (§8 收藏). */
export function FavoriteButton({ slug, size = 40, onSurface = false }: { slug: string; size?: number; onSurface?: boolean }) {
  const { c, soft } = useTheme();
  const t = useT();
  const on = useFavorites((s) => s.slugs.includes(slug));
  const toggle = useFavorites((s) => s.toggle);
  const s = useSharedValue(1);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <PressableScale
      accessibilityLabel={on ? t("template.unfavorite") : t("template.favorite")}
      accessibilityState={{ selected: on }}
      scaleTo={0.9}
      onPress={() => {
        haptic("tap");
        const next = toggle(slug);
        if (next) s.value = withSequence(withTiming(1.3, { duration: 120, reduceMotion: ReduceMotion.System }), withSpring(1, { ...motion.pop, reduceMotion: ReduceMotion.System }));
      }}
      style={[{ width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center", backgroundColor: onSurface ? c.bgElevated : c.bgMuted }, onSurface && soft]}
    >
      <Animated.View style={a}>
        <Heart size={size * 0.48} color={on ? c.danger : c.fg} fill={on ? c.danger : "transparent"} strokeWidth={2.2} />
      </Animated.View>
    </PressableScale>
  );
}
