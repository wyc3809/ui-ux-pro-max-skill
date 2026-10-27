import { View, type ViewStyle } from "react-native";

import { space } from "@/theme/tokens";
import { Txt } from "./Txt";
import { Reveal } from "./Reveal";

type Props = { title?: string; eyebrow?: string; index?: number; right?: React.ReactNode; children: React.ReactNode; style?: ViewStyle; inset?: boolean };

/** Page section that fades up 10px; the 2nd and 3rd sections stagger by 80ms (§8). */
export function Section({ title, eyebrow, index = 0, right, children, style, inset = true }: Props) {
  return (
    <Reveal index={index} style={[{ gap: 12 }, style]}>
      {(title || eyebrow) && (
        <View style={{ flexDirection: "row", alignItems: "flex-end", paddingHorizontal: inset ? space.gutter : 0 }}>
          <View style={{ flex: 1, gap: 4 }}>
            {eyebrow ? (
              <Txt variant="eyebrow" tone="fgSubtle">
                {eyebrow}
              </Txt>
            ) : null}
            {title ? <Txt variant="section">{title}</Txt> : null}
          </View>
          {right}
        </View>
      )}
      {children}
    </Reveal>
  );
}
