import { View } from "react-native";
import { Tag } from "@/components/ui/Chip";

export function StackChips({ stack }: { stack: string[] }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {stack.map((s, i) => (
        <Tag key={s} label={s} index={i} />
      ))}
    </View>
  );
}
