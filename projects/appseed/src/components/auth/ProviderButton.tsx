import { View } from "react-native";
import Animated from "react-native-reanimated";
import { BrandIcon } from "@/components/ui/Icon";
import { PressableScale } from "@/components/ui/PressableScale";
import { Spinner } from "@/components/ui/Spinner";
import { Txt } from "@/components/ui/Txt";
import { popIn, slideInAt } from "@/theme/animations";
import { useTheme } from "@/theme/ThemeProvider";
import { hit, radius } from "@/theme/tokens";

type Props = { provider: "apple" | "google"; label: string; loading: boolean; disabled: boolean; onPress: () => void; index: number };

/**
 * Sign in with Apple follows Apple's HIG: solid black in light mode, white in dark, Apple logo left
 * of the label, same size as the other options. Logos are font glyphs, not SVG.
 */
export function ProviderButton({ provider, label, loading, disabled, onPress, index }: Props) {
  const { c, isDark } = useTheme();
  const apple = provider === "apple";
  const bg = apple ? (isDark ? "#ffffff" : "#000000") : c.bgElevated;
  const fg = apple ? (isDark ? "#000000" : "#ffffff") : c.fg;
  return (
    <Animated.View entering={slideInAt(index, 70)}>
      <PressableScale
        onPress={onPress}
        disabled={disabled}
        hapticKind="tap"
        accessibilityLabel={label}
        accessibilityState={{ busy: loading, disabled }}
        scaleTo={0.98}
        style={{ height: hit + 6, borderRadius: radius.control + 2, backgroundColor: bg, borderWidth: apple ? 0 : 1.5, borderColor: c.border, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, opacity: disabled && !loading ? 0.5 : 1 }}
      >
        {loading ? (
          <Spinner color={fg} />
        ) : (
          <>
            <Animated.View entering={popIn(index + 1, 80)}>
              <BrandIcon brand={apple ? "apple" : "google"} size={20} color={fg} />
            </Animated.View>
            <Txt variant="bodyStrong" style={{ color: fg, fontSize: 16 }}>
              {label}
            </Txt>
          </>
        )}
        {/* Keeps the label optically centred against the icon. */}
        {!loading && <View style={{ width: 10 }} />}
      </PressableScale>
    </Animated.View>
  );
}
