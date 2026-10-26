import { useState } from "react";
import { TextInput, View, type TextInputProps } from "react-native";
import { noOutline } from "@/components/ui/SearchBar";
import { Txt } from "@/components/ui/Txt";
import { useTheme } from "@/theme/ThemeProvider";
import { font, radius } from "@/theme/tokens";

/** Labelled text input whose border fades to brand colour on focus. Shared by every listing form. */
export function Field({ label, hint, ...rest }: TextInputProps & { label: string; hint?: string }) {
  const { c } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Txt variant="caption" tone="fgMuted" style={{ fontFamily: "DMSans_700Bold" }}>
        {label}
      </Txt>
      <TextInput
        accessibilityLabel={label}
        {...rest}
        onFocus={(e) => {
          setFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          rest.onBlur?.(e);
        }}
        placeholderTextColor={c.fgSubtle}
        maxFontSizeMultiplier={1.4}
        style={{
          minHeight: rest.multiline ? 96 : 48,
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderRadius: radius.control + 2,
          backgroundColor: c.bgMuted,
          borderWidth: 1.5,
          borderColor: focused ? c.accent : "transparent",
          color: c.fg,
          fontFamily: rest.multiline && rest.keyboardType === "ascii-capable" ? font.mono : font.medium,
          fontSize: 15,
          textAlignVertical: rest.multiline ? "top" : "center",
          ...noOutline,
        }}
      />
      {hint ? (
        <Txt variant="caption" tone="fgSubtle">
          {hint}
        </Txt>
      ) : null}
    </View>
  );
}

export function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Txt variant="caption" tone="fgMuted" style={{ fontFamily: "DMSans_700Bold" }}>
        {label}
      </Txt>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{children}</View>
    </View>
  );
}

export function Note({ text }: { text: string }) {
  const { c } = useTheme();
  return (
    <View style={{ padding: 12, borderRadius: radius.inset, backgroundColor: c.pendingSoft }}>
      <Txt tone="fg">{text}</Txt>
    </View>
  );
}
