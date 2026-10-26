import { useState } from "react";
import { View } from "react-native";
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
import { useHistory } from "@/store/history";
import { useSettings, type ThemePref } from "@/store/settings";
import { space } from "@/theme/tokens";

export default function MeScreen() {
  const t = useT();
  const s = useSettings();
  const clearHistory = useHistory((h) => h.clear);
  const [confirm, setConfirm] = useState<"history" | "account" | null>(null);
  return (
    <TabScene index={3}>
      <LargeTitleScreen title={t("me.title")}>
        <View style={{ paddingHorizontal: space.gutter, gap: 24 }}>
          <Section index={0} inset={false}>
            <Card padded={false}>
              <ListRow icon="user" title={t("me.guest")} detail={t("me.signIn")} onPress={() => toast(t("common.done"))} />
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
              <ListRow icon="shield" title={t("me.privacy")} onPress={() => {}} />
              <RowDivider />
              <ListRow icon="file" title={t("me.terms")} onPress={() => {}} />
              <RowDivider />
              <ListRow icon="info" title={t("me.about")} value="0.1.0" />
            </Card>
            <Card padded={false}>
              <ListRow icon="trash" title={t("me.deleteAccount")} danger onPress={() => setConfirm("account")} />
            </Card>
          </Section>
        </View>

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
        <ConfirmSheet open={confirm === "account"} title={t("me.deleteAccount")} body={t("me.clearHistoryConfirm")} confirmLabel={t("me.deleteAccount")} onConfirm={() => toast(t("common.done"))} onClose={() => setConfirm(null)} />
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
