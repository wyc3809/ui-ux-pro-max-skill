import { View } from "react-native";
import { Tag } from "@/components/ui/Chip";

export function StackChips({ stack }: { stack: string[] }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
      {stack.map((s) => (
        <Tag key={s} label={s} />
      ))}
    </View>
  );
}
