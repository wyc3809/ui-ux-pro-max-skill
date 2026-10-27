import { useEffect, useRef, useState } from "react";
import { Platform, View, type TextInputInstance } from "react-native";
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { SheetTextInput } from "@/components/ui/SheetTextInput";
import { noOutline } from "@/components/ui/SearchBar";
import { Txt } from "@/components/ui/Txt";
import { OTP_LENGTH, sanitizeOtp } from "@/lib/auth";
import { popIn } from "@/theme/animations";
import { useTheme } from "@/theme/ThemeProvider";
import { radius } from "@/theme/tokens";

type Props = { value: string; onChange: (v: string) => void; onComplete: (v: string) => void; error: boolean; errorKey: number; label: string };

/**
 * Six code boxes over one invisible input (so paste and iOS one-time-code autofill work).
 * The active box glows and its caret blinks; digits pop in; a wrong code shakes the row red.
 */
export function OtpInput({ value, onChange, onComplete, error, errorKey, label }: Props) {
  const { c } = useTheme();
  const input = useRef<TextInputInstance>(null);
  const [focused, setFocused] = useState(false);
  const shake = useSharedValue(0);

  useEffect(() => {
    const id = setTimeout(() => input.current?.focus(), 350);
    return () => clearTimeout(id);
  }, []);
  useEffect(() => {
    if (!errorKey) return;
    const d = { duration: 50, reduceMotion: ReduceMotion.System };
    shake.value = withSequence(withTiming(-10, d), withTiming(10, d), withTiming(-7, d), withTiming(7, d), withTiming(0, d));
  }, [errorKey, shake]);

  const row = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));
  return (
    <View>
      <Animated.View style={[{ flexDirection: "row", gap: 8, justifyContent: "center" }, row]}>
        {Array.from({ length: OTP_LENGTH }, (_, i) => {
          const digit = value[i];
          const active = focused && i === Math.min(value.length, OTP_LENGTH - 1);
          return (
            <View
              key={i}
              style={{
                width: 46,
                height: 56,
                borderRadius: radius.control + 2,
                backgroundColor: c.bgMuted,
                borderWidth: 1.5,
                borderColor: error ? c.danger : active ? c.accent : "transparent",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {digit ? (
                <Animated.View key={`${i}-${digit}`} entering={popIn(0)}>
                  <Txt variant="largeTitle" tone={error ? "danger" : "fg"} tabular style={{ fontSize: 24 }}>
                    {digit}
                  </Txt>
                </Animated.View>
              ) : active ? (
                <Caret color={c.accent} />
              ) : null}
            </View>
          );
        })}
      </Animated.View>
      <SheetTextInput
        ref={input as never}
        accessibilityLabel={label}
        value={value}
        onChangeText={(s: string) => {
          const v = sanitizeOtp(s);
          onChange(v);
          if (v.length === OTP_LENGTH) onComplete(v);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete={Platform.OS === "android" ? "sms-otp" : "one-time-code"}
        maxLength={OTP_LENGTH}
        caretHidden
        style={[{ position: "absolute", inset: 0, opacity: 0.02, color: "transparent", fontSize: 1 }, noOutline]}
      />
    </View>
  );
}

function Caret({ color }: { color: string }) {
  const o = useSharedValue(1);
  useEffect(() => {
    o.value = withRepeat(withSequence(withTiming(0, { duration: 450 }), withTiming(1, { duration: 450 })), -1, false, undefined, ReduceMotion.System);
  }, [o]);
  const a = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[{ width: 2, height: 24, borderRadius: 1, backgroundColor: color }, a]} />;
}
