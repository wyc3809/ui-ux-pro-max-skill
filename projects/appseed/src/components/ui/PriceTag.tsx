import { useT } from "@/i18n";
import { formatPrice } from "@/lib/price";
import { StatusBadge } from "./StatusBadge";
import { Txt, type TxtVariant } from "./Txt";

/** Price in the primary text colour (not brand) so it never reads like an ad. Owned replaces price. */
export function PriceTag({ amount, owned, variant = "price" }: { amount: number; owned?: boolean; variant?: TxtVariant }) {
  const t = useT();
  if (owned) return <StatusBadge status="purchased" />;
  return (
    <Txt variant={variant} tone="price" tabular style={variant !== "price" ? { fontFamily: "DMSans_800ExtraBold" } : undefined}>
      {formatPrice(amount, "HKD", t("common.free"))}
    </Txt>
  );
}
