import { Geist_400Regular, Geist_500Medium, Geist_600SemiBold, Geist_700Bold } from "@expo-google-fonts/geist";
import { GeistMono_400Regular, GeistMono_700Bold } from "@expo-google-fonts/geist-mono";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthSheet } from "@/components/auth/AuthSheet";
import { iconFonts } from "@/components/ui/Icon";
import { LaunchMark } from "@/components/shell/LaunchMark";
import { ToastHost } from "@/components/ui/Toast";
import { ThemeProvider, useTheme } from "@/theme/ThemeProvider";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, staleTime: 60_000, refetchOnWindowFocus: false } },
});

function Shell() {
  const { c, isDark } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style={isDark ? "light" : "dark"} />
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
