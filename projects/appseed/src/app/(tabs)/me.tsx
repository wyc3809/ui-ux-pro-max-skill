import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { api } from "@/api/mockServer";
import { useDisconnectGithub, useGithubAccount } from "@/api/queries";
import type { User } from "@/api/types";
import { TonePill } from "@/components/market/Cards";
import { LargeTitleScreen } from "@/components/shell/LargeTitleScreen";
import { TabScene } from "@/components/shell/TabScene";
import { Card } from "@/components/ui/Card";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { ListRow, RowDivider } from "@/components/ui/ListRow";
import { Section } from "@/components/ui/Section";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Switch } from "@/components/ui/Switch";
import { toast } from "@/components/ui/Toast";
import { useT } from "@/i18n";
import { formatDate } from "@/lib/format";
import { useAuthGate } from "@/store/authGate";
import { useHistory } from "@/store/history";
import { useSession } from "@/store/session";
import { useSettings, type ThemePref } from "@/store/settings";
import { Icon } from "@/components/ui/Icon";
import { Txt } from "@/components/ui/Txt";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space, font } from "@/theme/tokens";
import { BlockedSheet } from "@/components/moderation/BlockedSheet";
import { useBlocks } from "@/store/blocks";

export default function MeScreen() {
  const t = useT();
  const s = useSettings();
  const clearHistory = useHistory((h) => h.clear);
  const [confirm, setConfirm] = useState<"history" | "account" | "github" | "signOut" | null>(null);
  const user = useSession((x) => x.user);
  const signOut = useSession((x) => x.signOut);
  const openAuth = useAuthGate((x) => x.request);
  // signOut also wipes the query cache and every per-person store (store/account.ts).
  const endSession = () => signOut();
  const { data: github } = useGithubAccount();
  const blockedCount = useBlocks((b) => b.handles.length);
  const [blockedOpen, setBlockedOpen] = useState(false);
  const disconnect = useDisconnectGithub();
  return (
    <TabScene index={3}>
      <LargeTitleScreen title={t("me.title")}>
        <View style={{ paddingHorizontal: space.gutter, gap: 24 }}>
          <Section index={0} inset={false}>
            <Card padded={false}>
              {user ? (
                <AccountHeader user={user} />
              ) : (
                <ListRow icon="user" title={t("auth.title")} detail={t("me.signIn")} onPress={() => openAuth(null)} />
              )}
              {user && (
                <>
                  <RowDivider />
                  <ListRow icon="pen" title={t("creator.edit")} detail={t("creator.editBody")} onPress={() => router.push("/profile")} />
                  <RowDivider />
                  <ListRow icon="userX" title={t("moderation.blockedList")} value={blockedCount ? String(blockedCount) : undefined} onPress={() => setBlockedOpen(true)} />
                  <RowDivider />
                  <ListRow
                    icon="git"
                    title="GitHub"
                    detail={github ? `@${github.login}` : t("source.notConnected")}
                    trailing={github ? <TonePill label={t("source.connected")} tone="live" /> : undefined}
                    onPress={github ? () => setConfirm("github") : undefined}
                  />
                  <RowDivider />
                  <ListRow icon="logout" title={t("auth.signOut")} onPress={() => setConfirm("signOut")} />
                </>
              )}
            </Card>
          </Section>

          <Section title={t("me.theme")} index={1} inset={false}>
            <SegmentedControl<ThemePref>
              value={s.theme}
              onChange={s.setTheme}
              options={[
                { value: "system", label: t("me.themeSystem") },
                { value: "light", label: t("me.themeLight") },
                { value: "dark", label: t("me.themeDark") },
              ]}
            />
            <Card padded={false}>
              <ListRow icon="language" title={t("me.language")} trailing={<LangToggle />} />
              <RowDivider />
              <ListRow icon="phone" title={t("me.haptics")} trailing={<Switch label={t("me.haptics")} value={s.haptics} onValueChange={s.setHaptics} />} />
              <RowDivider />
              <ListRow icon="bell" title={t("me.notifications")} onPress={() => {}} />
              <RowDivider />
              <ListRow icon="moon" title={t("me.clearHistory")} onPress={() => setConfirm("history")} />
            </Card>
          </Section>

          <Section index={2} inset={false}>
            <Card padded={false}>
              <ListRow icon="scale" title={t("me.licenses")} onPress={() => {}} />
              <RowDivider />
              <ListRow icon="refresh" title={t("me.refunds")} onPress={() => {}} />
              <RowDivider />
              <ListRow icon="shield" title={t("me.privacy")} onPress={() => router.push("/terms")} />
              <RowDivider />
              <ListRow icon="file" title={t("me.terms")} onPress={() => router.push("/terms")} />
              <RowDivider />
              <ListRow icon="info" title={t("me.about")} detail={t("brand.tagline")} value="0.1.0" />
            </Card>
            {user ? (
              <Card padded={false}>
                <ListRow icon="trash" title={t("me.deleteAccount")} danger onPress={() => setConfirm("account")} />
              </Card>
            ) : null}
          </Section>
        </View>

        <BlockedSheet open={blockedOpen} onClose={() => setBlockedOpen(false)} />
        <ConfirmSheet
          open={confirm === "history"}
          title={t("me.clearHistory")}
          body={t("me.clearHistoryConfirm")}
          confirmLabel={t("search.clear")}
          onConfirm={() => {
            clearHistory();
            toast(t("common.done"));
          }}
          onClose={() => setConfirm(null)}
        />
        <ConfirmSheet
          open={confirm === "github"}
          title={t("source.disconnect")}
          body={t("source.disconnectConfirm")}
          confirmLabel={t("source.disconnect")}
          onConfirm={() => disconnect.mutate(undefined, { onSuccess: () => toast(t("common.done")) })}
          onClose={() => setConfirm(null)}
        />
        <ConfirmSheet
          open={confirm === "signOut"}
          title={t("auth.signOut")}
          body={t("auth.signOutConfirm")}
          confirmLabel={t("auth.signOut")}
          onConfirm={() => {
            endSession();
            toast(t("common.done"));
          }}
          onClose={() => setConfirm(null)}
        />
        <ConfirmSheet
          open={confirm === "account"}
          title={t("me.deleteAccount")}
          body={t("auth.deleteBody")}
          confirmLabel={t("me.deleteAccount")}
          onConfirm={async () => {
            try {
              if (user) await api.deleteAccount(user.id);
            } catch (e) {
              toast(t("auth.deleteFailed"), "warning");
              throw e; // keeps the sheet open so they can retry
            }
            endSession();
            toast(t("auth.deleted"));
          }}
          onClose={() => setConfirm(null)}
        />
      </LargeTitleScreen>
    </TabScene>
  );
}

function LangToggle() {
  const locale = useSettings((s) => s.locale);
  const setLocale = useSettings((s) => s.setLocale);
  return (
    <View style={{ width: 140 }}>
      <SegmentedControl
        value={locale}
        onChange={setLocale}
        options={[
          { value: "zh-Hant", label: "中文" },
          { value: "en", label: "EN" },
        ]}
      />
    </View>
  );
}

/** Signed-in header: initial avatar, name, @handle, and how they signed in (Apple relay emails are labelled). */
function AccountHeader({ user }: { user: User }) {
  const { c } = useTheme();
  const t = useT();
  const via = user.provider === "apple" ? t("auth.viaApple") : user.provider === "google" ? t("auth.viaGoogle") : t("auth.viaEmail");
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 16, padding: 16 }}>
      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: c.accentSoft, alignItems: "center", justifyContent: "center" }}>
        <Txt tone="accent" style={{ fontSize: 24, fontFamily: font.bold }}>
          {user.name.slice(0, 1).toUpperCase()}
        </Txt>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="section">{user.name}</Txt>
        <Txt variant="caption" tone="fgSubtle">
          @{user.handle} · {t("auth.memberSince", { date: formatDate(user.createdAt, t.locale) })}
        </Txt>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4, alignSelf: "flex-start", paddingHorizontal: 8, height: 22, borderRadius: radius.chip, backgroundColor: c.bgMuted }}>
          <Icon name={user.provider === "email" ? "mail" : "shield"} size={12} color={c.fgMuted} active />
          <Txt variant="caption" tone="fgMuted">
            {via}
          </Txt>
        </View>
      </View>
    </View>
  );
}
