import { forwardRef } from "react";
import { Platform, TextInput, View, type TextInputInstance, type TextStyle } from "react-native";
import Animated, { ZoomIn, ZoomOut } from "react-native-reanimated";
import { useTheme } from "@/theme/ThemeProvider";
import { font, radius } from "@/theme/tokens";
import { Icon } from "./Icon";
import { PressableScale } from "./PressableScale";
import { Txt } from "./Txt";

/** The field shell already shows focus; drop the browser's default outline on web. */
export const noOutline = (Platform.OS === "web" ? { outlineStyle: "none" } : {}) as TextStyle;

const shell = { height: 46, borderRadius: radius.control + 2, flexDirection: "row" as const, alignItems: "center" as const, gap: 10, paddingHorizontal: 14 };

/** Tap target on Explore that opens the full-screen search. */
export function SearchBarButton({ placeholder, onPress, label }: { placeholder: string; onPress: () => void; label: string }) {
  const { c, card } = useTheme();
  return (
    <PressableScale onPress={onPress} accessibilityLabel={label} hapticKind="tap" scaleTo={0.98} style={[shell, { backgroundColor: c.bgElevated }, card]}>
      <Icon name="search" size={18} color={c.fgSubtle} />
      <Txt tone="fgSubtle" style={{ fontSize: 16, lineHeight: 24 }}>
        {placeholder}
      </Txt>
    </PressableScale>
  );
}

type InputProps = { value: string; onChangeText: (s: string) => void; placeholder: string; onSubmit?: () => void };

export const SearchInput = forwardRef<TextInputInstance, InputProps>(function SearchInput({ value, onChangeText, placeholder, onSubmit }, ref) {
  const { c } = useTheme();
  return (
    <View style={[shell, { backgroundColor: c.bgMuted, flex: 1 }]}>
      {/* The glass tilts while typing and settles when the field is cleared. */}
      <Icon name="search" size={18} color={value ? c.accent : c.fgSubtle} motion="wiggle" trigger={value.length > 0} enter={false} />
      <TextInput
        ref={ref}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.fgSubtle}
        returnKeyType="search"
        onSubmitEditing={onSubmit}
        autoCorrect={false}
        maxFontSizeMultiplier={1.4}
        style={[{ flex: 1, height: "100%", color: c.fg, fontFamily: font.medium, fontSize: 16 }, noOutline]}
      />
      {value.length > 0 && (
        <Animated.View entering={ZoomIn.duration(160)} exiting={ZoomOut.duration(120)}>
          <PressableScale onPress={() => onChangeText("")} accessibilityLabel="clear" hitSlop={12} style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: c.fgSubtle, alignItems: "center", justifyContent: "center" }}>
            <Icon name="close" size={14} color={c.bgElevated} enter={false} />
          </PressableScale>
        </Animated.View>
      )}
    </View>
  );
});
