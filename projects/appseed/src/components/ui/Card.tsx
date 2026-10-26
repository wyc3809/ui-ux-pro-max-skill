import { View, type ViewProps } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space } from "@/theme/tokens";

export function Card({ style, padded = true, ...rest }: ViewProps & { padded?: boolean }) {
  const { c, card } = useTheme();
  return <View {...rest} style={[{ backgroundColor: c.bgElevated, borderRadius: radius.card, padding: padded ? space.cardPad : 0 }, card, style]} />;
}
