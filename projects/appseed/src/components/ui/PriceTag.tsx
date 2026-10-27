import Animated, { FadeInDown, FadeOutUp, ReduceMotion } from "react-native-reanimated";
import { useT } from "@/i18n";
import { startFrom } from "@/theme/animations";
import { formatPrice } from "@/lib/price";
import { StatusBadge } from "./StatusBadge";
import { Txt, type TxtVariant } from "./Txt";
import { font } from "@/theme/tokens";

const swapIn = startFrom(FadeInDown.duration(220), { opacity: 0, transform: [{ translateY: 6 }] }).reduceMotion(ReduceMotion.System);
const swapOut = FadeOutUp.duration(160).reduceMotion(ReduceMotion.System);

/** Price in the primary text colour (not brand) so it never reads like an ad. Owned replaces price. */
export function PriceTag({ amount, owned, variant = "price" }: { amount: number; owned?: boolean; variant?: TxtVariant }) {
  const t = useT();
  // Price and "owned" swap with a short lift so the change after purchase reads as one motion.
  return (
    <Animated.View key={owned ? "owned" : "price"} entering={swapIn} exiting={swapOut}>
      {owned ? (
        <StatusBadge status="purchased" />
      ) : (
        <Txt variant={variant} tone="price" tabular style={variant !== "price" ? { fontFamily: font.bold } : undefined}>
          {formatPrice(amount, "HKD", t("common.free"))}
        </Txt>
      )}
    </Animated.View>
  );
}
