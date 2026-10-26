import { Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";
import { space } from "@/theme/tokens";

/** Bottom-pinned action bar shell (64pt + safe area), shared by every purchase / offer bar. */
export function BottomBar({ children }: { children: React.ReactNode }) {
  const { c, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        paddingBottom: insets.bottom,
        paddingHorizontal: space.gutter,
        backgroundColor: c.bgElevated,
        borderTopWidth: Platform.OS === "web" ? 1 : 0.5,
        borderTopColor: c.border,
        shadowColor: "#0f1412",
        shadowOpacity: isDark ? 0 : 0.08,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: -6 },
        elevation: 12,
      }}
    >
      <View style={{ height: 64, flexDirection: "row", alignItems: "center", gap: 12 }}>{children}</View>
    </View>
  );
}
