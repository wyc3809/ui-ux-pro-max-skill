import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";
import { api } from "@/api/backend";
import { queryClient } from "@/api/client";
import { Spinner } from "@/components/ui/Spinner";
import { toast } from "@/components/ui/Toast";
import { useT } from "@/i18n";
import { useTheme } from "@/theme/ThemeProvider";

/**
 * Where GitHub sends a creator after installing the AppSeed GitHub App (web). The server links the
 * installation only if GitHub confirms it belongs to them, then the upload wizard continues.
 */
export default function GithubCallback() {
  const { c } = useTheme();
  const t = useT();
  const { code, installation_id } = useLocalSearchParams<{ code?: string; installation_id?: string }>();
  useEffect(() => {
    api
      .linkGithub(code ?? "", installation_id ?? "")
      .then(() => queryClient.invalidateQueries({ queryKey: ["github"] }))
      .catch((e) => toast(t.error(e instanceof Error ? e.message : "", ["studio.errors"]), "warning"))
      .finally(() => router.replace("/studio/new"));
  }, [code, installation_id, t]);
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.bg }}>
      <Spinner color={c.fgMuted} />
    </View>
  );
}
