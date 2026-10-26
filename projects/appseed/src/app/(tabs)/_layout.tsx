import { Tabs } from "expo-router/js-tabs";
import { TabBar } from "@/components/shell/TabBar";
import { useTheme } from "@/theme/ThemeProvider";

export default function TabsLayout() {
  const { c } = useTheme();
  return (
    <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.bg }, lazy: true }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="library" />
      <Tabs.Screen name="studio" />
      <Tabs.Screen name="me" />
    </Tabs>
  );
}
