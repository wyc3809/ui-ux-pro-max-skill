import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { Icon } from "@/components/ui/Icon";
import { NumberRoll } from "@/components/ui/NumberRoll";
import { PressableScale } from "@/components/ui/PressableScale";
import { useT } from "@/i18n";
import { haptic } from "@/lib/haptic";
import { useTheme } from "@/theme/ThemeProvider";
import { radius } from "@/theme/tokens";

const RM = ReduceMotion.System;
const PARTICLES = 8;

/**
 * Upvote: the arrow morphs to filled and bounces up, the count rolls to its new value, and a
 * ring of particles bursts outward. Un-voting just deflates back to outline.
 */
export function UpvoteButton({ count, voted, onToggle, name, size = "md" }: { count: number; voted: boolean; onToggle: () => void; name: string; size?: "md" | "lg" }) {
  const { c } = useTheme();
  const t = useT();
  const [burst, setBurst] = useState(0);
  const lg = size === "lg";
  return (
    <PressableScale
      onPress={() => {
        haptic(voted ? "selection" : "success");
        if (!voted) setBurst((n) => n + 1);
        onToggle();
      }}
      scaleTo={0.92}
      accessibilityLabel={t("a11y.upvote", { name, n: count })}
      accessibilityState={{ selected: voted }}
      style={{
        minWidth: lg ? 120 : 56,
        height: lg ? 48 : 56,
        borderRadius: lg ? radius.control + 2 : radius.inset,
        borderWidth: 1.5,
        borderColor: voted ? c.accent : c.border,
        backgroundColor: voted ? c.accentSoft : c.bgElevated,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: lg ? "row" : "column",
        gap: lg ? 8 : 0,
        paddingHorizontal: lg ? 16 : 6,
      }}
    >
      <View style={{ alignItems: "center", justifyContent: "center" }}>
        <Burst key={burst} active={burst > 0} color={c.accent} />
        <Icon name="upvote" size={lg ? 22 : 20} color={c.fgMuted} activeColor={c.accent} active={voted} motion="bounce" />
      </View>
      <NumberRoll value={count} variant="bodyStrong" />
    </PressableScale>
  );
}

function Burst({ active, color }: { active: boolean; color: string }) {
  if (!active) return null;
  return (
    <View pointerEvents="none" style={{ position: "absolute", width: 0, height: 0 }}>
      {Array.from({ length: PARTICLES }, (_, i) => (
        <Particle key={i} angle={(i / PARTICLES) * Math.PI * 2} color={color} />
      ))}
    </View>
  );
}

function Particle({ angle, color }: { angle: number; color: string }) {
  const p = useSharedValue(0);
  const first = useRef(true);
  useEffect(() => {
    if (!first.current) return;
    first.current = false;
    p.value = withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic), reduceMotion: RM });
  }, [p]);
  const a = useAnimatedStyle(() => ({
    opacity: 1 - p.value,
    transform: [{ translateX: Math.cos(angle) * 22 * p.value }, { translateY: Math.sin(angle) * 22 * p.value }, { scale: 1 - p.value * 0.6 }],
  }));
  return <Animated.View style={[{ position: "absolute", left: -3, top: -3, width: 6, height: 6, borderRadius: 3, backgroundColor: color }, a]} />;
}

/** "已售出" stamp that slams in from 2× with a little rotation overshoot. */
export function SoldStamp({ label }: { label: string }) {
  const { c } = useTheme();
  const s = useSharedValue(2.2);
  const o = useSharedValue(0);
  const r = useSharedValue(-24);
  useEffect(() => {
    s.value = withDelay(250, withSpring(1, { damping: 9, stiffness: 220, reduceMotion: RM }));
    o.value = withDelay(250, withTiming(1, { duration: 140, reduceMotion: RM }));
    r.value = withDelay(250, withSequence(withTiming(-8, { duration: 200, reduceMotion: RM }), withSpring(-12, { damping: 8, reduceMotion: RM })));
  }, [s, o, r]);
  const a = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ scale: s.value }, { rotate: `${r.value}deg` }] }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", top: 14, right: 14, borderWidth: 3, borderColor: c.danger, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: c.bgElevated }, a]}>
      <Animated.Text style={{ color: c.danger, fontFamily: "DMSans_800ExtraBold", fontSize: 16, letterSpacing: 2 }}>{label}</Animated.Text>
    </Animated.View>
  );
}
