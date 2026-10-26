import { Switch as RNSwitch } from "react-native";
import { haptic } from "@/lib/haptic";
import { useTheme } from "@/theme/ThemeProvider";

export function Switch({ value, onValueChange, label }: { value: boolean; onValueChange: (v: boolean) => void; label: string }) {
  const { c } = useTheme();
  return (
    <RNSwitch
      accessibilityLabel={label}
      value={value}
      onValueChange={(v) => {
        haptic("selection");
        onValueChange(v);
      }}
      trackColor={{ true: c.accent, false: c.segmentTrack }}
      thumbColor="#ffffff"
      ios_backgroundColor={c.segmentTrack}
    />
  );
}
