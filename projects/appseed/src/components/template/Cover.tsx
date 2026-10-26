import { LinearGradient } from "expo-linear-gradient";
import { Building2, Bus, ChefHat, Grid3x3, Receipt, Sprout, Ticket, Wallet, type LucideIcon } from "lucide-react-native";
import { View, type ViewStyle } from "react-native";
import type { CoverIcon, Template } from "@/api/types";
import { useTheme } from "@/theme/ThemeProvider";
import { radius } from "@/theme/tokens";

const icons: Record<CoverIcon, LucideIcon> = { wallet: Wallet, building: Building2, chef: ChefHat, grid: Grid3x3, ticket: Ticket, sprout: Sprout, bus: Bus, receipt: Receipt };

/**
 * Placeholder artwork for a template until real screenshots are uploaded: the creator's
 * gradient with a stylised phone frame. Media always gets a 1px border (§4).
 * Creator-supplied gradients are content, not UI chrome, so they are exempt from tokens.
 */
export function Cover({ t, style, screen = 0, rounded = radius.media }: { t: Template; style?: ViewStyle; screen?: number; rounded?: number }) {
  const { c } = useTheme();
  const Icon = icons[t.cover.icon];
  const angle = screen % 2 === 0 ? { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } } : { start: { x: 1, y: 0 }, end: { x: 0, y: 1 } };
  return (
    <View style={[{ aspectRatio: 16 / 10, borderRadius: rounded, overflow: "hidden", borderWidth: 1, borderColor: c.border }, style]}>
      <LinearGradient colors={[t.cover.from, t.cover.to]} {...angle} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end" }}>
        <View style={{ position: "absolute", top: "18%", left: "8%", opacity: 0.95 }}>
          <Icon size={34} color="#ffffff" strokeWidth={2} />
        </View>
        <View style={{ width: "38%", height: "78%", borderTopLeftRadius: 18, borderTopRightRadius: 18, backgroundColor: "rgba(255,255,255,0.92)", padding: 10, gap: 6, transform: [{ translateX: 34 }] }}>
          <View style={{ height: 8, width: "55%", borderRadius: 4, backgroundColor: t.cover.from, opacity: 0.85 }} />
          <View style={{ height: 30, borderRadius: 8, backgroundColor: t.cover.to, opacity: 0.35 + (screen % 3) * 0.15 }} />
          {[0.9, 0.7, 0.8].map((w, i) => (
            <View key={i} style={{ height: 6, width: `${w * 100}%`, borderRadius: 3, backgroundColor: "rgba(15,20,18,0.12)" }} />
          ))}
        </View>
      </LinearGradient>
    </View>
  );
}
