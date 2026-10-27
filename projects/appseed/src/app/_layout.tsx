import { Geist_400Regular, Geist_500Medium, Geist_600SemiBold, Geist_700Bold } from "@expo-google-fonts/geist";
import { GeistMono_400Regular, GeistMono_700Bold } from "@expo-google-fonts/geist-mono";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, { ReduceMotion, useAnimatedStyle, useDerivedValue, withTiming } from "react-native-reanimated";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthSheet } from "@/components/auth/AuthSheet";
import { iconFonts } from "@/components/ui/Icon";
import { LaunchMark } from "@/components/shell/LaunchMark";
import { ToastHost } from "@/components/ui/Toast";
import { useUi } from "@/store/ui";
import { ThemeProvider, useTheme } from "@/theme/ThemeProvider";
import { motion, radius } from "@/theme/tokens";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, staleTime: 60_000, refetchOnWindowFocus: false } },
});

function Shell() {
  const { c, isDark } = useTheme();
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
    <View style={{ flex: 1, backgroundColor: "#000000" }}>
      <StatusBar style={isDark || sheetOpen ? "light" : "dark"} />
      <Animated.View style={[{ flex: 1, overflow: receded ? "hidden" : "visible", backgroundColor: c.bg }, page]}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="search" options={{ animation: "fade_from_bottom", animationDuration: 280, gestureEnabled: true }} />
          <Stack.Screen name="template/[slug]/index" />
          <Stack.Screen name="template/[slug]/story" />
          <Stack.Screen name="creator/[handle]" />
          <Stack.Screen name="studio/new" options={{ presentation: "modal" }} />
          <Stack.Screen name="studio/new-prompt" options={{ presentation: "modal" }} />
          <Stack.Screen name="studio/new-buyout" options={{ presentation: "modal" }} />
          <Stack.Screen name="studio/new-launch" options={{ presentation: "modal" }} />
          <Stack.Screen name="prompt/[slug]" />
          <Stack.Screen name="buyout/[slug]" />
          <Stack.Screen name="launch/[slug]" />
        </Stack>
      </Animated.View>
      <AuthSheet />
      <ToastHost />
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
            <BottomSheetModalProvider>{loaded ? <Shell /> : <LaunchMark />}</BottomSheetModalProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
