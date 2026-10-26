import { Star, StarHalf } from "lucide-react-native";
import { View } from "react-native";
import { useT } from "@/i18n";
import { isNewListing, starStates } from "@/lib/rating";
import { useTheme } from "@/theme/ThemeProvider";
import { Txt } from "./Txt";

/** Announces "4.5 星，共 23 則評價" instead of relying on the star glyphs (§16). */
export function RatingStars({ value, count, size = 13, compact }: { value: number; count: number; size?: number; compact?: boolean }) {
  const { c } = useTheme();
  const t = useT();
  if (isNewListing(count)) {
    return (
      <View accessible accessibilityLabel={t("a11y.newListing")} style={{ alignSelf: "flex-start", backgroundColor: c.accentSoft, borderRadius: 999, paddingHorizontal: 8, height: 20, justifyContent: "center" }}>
        <Txt style={{ fontSize: 11, fontFamily: "DMSans_700Bold", color: c.accent }}>{t("common.new")}</Txt>
      </View>
    );
  }
  return (
    <View accessible accessibilityLabel={t("a11y.stars", { value, n: count })} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      {compact ? (
        <Star size={size} color={c.rating} fill={c.rating} />
      ) : (
        <View style={{ flexDirection: "row", gap: 1 }}>
          {starStates(value).map((s, i) =>
            s === "half" ? (
              <View key={i} style={{ width: size, height: size }}>
                <Star size={size} color={c.rating} style={{ position: "absolute" }} />
                <StarHalf size={size} color={c.rating} fill={c.rating} style={{ position: "absolute" }} />
              </View>
            ) : (
              <Star key={i} size={size} color={c.rating} fill={s === "full" ? c.rating : "transparent"} />
            ),
          )}
        </View>
      )}
      <Txt variant="caption" tone="fg" tabular style={{ fontFamily: "DMSans_700Bold" }}>
        {value.toFixed(1)}
      </Txt>
      <Txt variant="caption" tone="fgSubtle" tabular>
        ({count})
      </Txt>
    </View>
  );
}
