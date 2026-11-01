import { Geist_400Regular, Geist_500Medium, Geist_600SemiBold, Geist_700Bold } from "@expo-google-fonts/geist";
import { GeistMono_400Regular, GeistMono_700Bold } from "@expo-google-fonts/geist-mono";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/api/client";
import { useFonts } from "expo-font";
import { type ErrorBoundaryProps, Stack, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, { ReduceMotion, useAnimatedStyle, useDerivedValue, withTiming } from "react-native-reanimated";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { scheduleOnRN } from "react-native-worklets";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthSheet } from "@/components/auth/AuthSheet";
import { TermsGateSheet } from "@/components/legal/TermsGateSheet";
import { iconFonts } from "@/components/ui/Icon";
import { LaunchMark } from "@/components/shell/LaunchMark";
import { ToastHost } from "@/components/ui/Toast";
import { useUi } from "@/store/ui";
import { ThemeProvider, useTheme } from "@/theme/ThemeProvider";
import { layout, motion, radius } from "@/theme/tokens";
import { installGlobalErrorHandlers, reportError } from "@/lib/errorReport";
import { Button } from "@/components/ui/Button";
import { Txt } from "@/components/ui/Txt";
import { useT } from "@/i18n";

let route = "/";
installGlobalErrorHandlers(() => route);
// The native splash is only the background colour; LaunchMark takes over on the same colour and hides it.
SplashScreen.preventAutoHideAsync().catch(() => {});

/** A screen that crashed: report it (no personal data) and offer a retry instead of a blank app. */
/** Rendered by the router outside RootLayout, so it brings its own ThemeProvider (Txt and Button need it). */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => reportError(error, route), [error]);
  return (
    <ThemeProvider>
      <CrashScreen retry={retry} />
    </ThemeProvider>
  );
}

function CrashScreen({ retry }: { retry: () => void }) {
  const t = useT();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 32, backgroundColor: "#000000" }}>
      <Txt variant="section" style={{ color: "#ffffff", textAlign: "center" }}>{t("common.crashed")}</Txt>
      <Button label={t("common.retry")} onPress={retry} />
    </View>
  );
}


function Shell() {
  const { c, isDark } = useTheme();
  route = usePathname();
  const sheetOpen = useUi((s) => s.sheets > 0);
  // iOS card stack: while a sheet is up the page shrinks, rounds its corners and dims, so the sheet reads as
  // a layer of the same surface rather than a separate window.
  const p = useDerivedValue(() => withTiming(sheetOpen ? 1 : 0, { duration: motion.sheet.duration, easing: motion.sheet.easing, reduceMotion: ReduceMotion.System }));
  // Clip only while receded: a clipped ancestor would stop web backdrop-filter (the glass bars) from blurring.
  const [receded, setReceded] = useState(false);
  useEffect(() => {
    if (sheetOpen) setReceded(true);
    else {
      const t = setTimeout(() => setReceded(false), motion.sheet.duration);
      return () => clearTimeout(t);
    }
  }, [sheetOpen]);
  const page = useAnimatedStyle(() => ({
    borderRadius: p.value * radius.hero,
    opacity: 1 - p.value * 0.15,
    transform: [{ scale: 1 - p.value * (1 - motion.sheetRecede) }],
  }));
  return (
    // One column on every screen size: phones fill it, iPad and desktop browsers centre it, so the same layout
    // (and the same tap targets) works on iOS, Android and the web.
    <View style={{ flex: 1, backgroundColor: c.bg, alignItems: "center" }}>
    <View style={{ flex: 1, width: "100%", maxWidth: layout.maxWidth, backgroundColor: "#000000" }}>
      <StatusBar style={isDark || sheetOpen ? "light" : "dark"} />
      <Animated.View style={[{ flex: 1, overflow: receded ? "hidden" : "visible", backgroundColor: c.bg }, page]}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="search" options={{ animation: "fade_from_bottom", animationDuration: 280, gestureEnabled: true }} />
          <Stack.Screen name="template/[slug]/index" />
          <Stack.Screen name="template/[slug]/story" />
          <Stack.Screen name="creator/[handle]" />
          <Stack.Screen name="categories" />
          <Stack.Screen name="category/[key]" />
          <Stack.Screen name="studio/new" options={{ presentation: "modal" }} />
          <Stack.Screen name="studio/new-prompt" options={{ presentation: "modal" }} />
          <Stack.Screen name="studio/new-buyout" options={{ presentation: "modal" }} />
          <Stack.Screen name="studio/new-launch" options={{ presentation: "modal" }} />
          <Stack.Screen name="studio/analytics" />
          <Stack.Screen name="post/[id]" />
          <Stack.Screen name="profile" options={{ presentation: "modal" }} />
          <Stack.Screen name="terms" />
          <Stack.Screen name="admin" />
          <Stack.Screen name="github-callback" />
          <Stack.Screen name="prompt/[slug]" />
          <Stack.Screen name="buyout/[slug]" />
          <Stack.Screen name="launch/[slug]" />
        </Stack>
      </Animated.View>
      <AuthSheet />
      <TermsGateSheet />
      <ToastHost />
    </View>
    </View>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
    GeistMono_400Regular,
    GeistMono_700Bold,
    ...iconFonts,
  });
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <BottomSheetModalProvider>
              {loaded ? <Shell /> : null}
              <Intro ready={loaded} />
            </BottomSheetModalProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * The opening loading page over the app: it plays in full on every launch while the app mounts underneath,
 * then fades out once both the opening has played and the fonts are in (docs/BRAND.md §5).
 */
function Intro({ ready }: { ready: boolean }) {
  const [played, setPlayed] = useState(false);
  const [gone, setGone] = useState(false);
  const fade = useDerivedValue(() => withTiming(played && ready ? 0 : 1, { duration: 320, reduceMotion: ReduceMotion.System }, (done) => {
    if (done && played && ready) scheduleOnRN(setGone, true);
  }), [played, ready]);
  const style = useAnimatedStyle(() => ({ opacity: fade.value }));
  if (gone) return null;
  return (
    <Animated.View pointerEvents={played && ready ? "none" : "auto"} style={[{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }, style]}>
      <LaunchMark onReady={() => SplashScreen.hideAsync().catch(() => {})} onFinish={() => setPlayed(true)} />
    </Animated.View>
  );
}
