import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCreator, useSaveProfile } from "@/api/queries";
import { SOCIAL_NAME, SocialIcon } from "@/components/creator/CreatorCard";
import { Field } from "@/components/studio/FormFields";
import { Button } from "@/components/ui/Button";
import { HeaderButton } from "@/components/ui/HeaderButton";
import { Reveal } from "@/components/ui/Reveal";
import { toast } from "@/components/ui/Toast";
import { Txt } from "@/components/ui/Txt";
import { useT, type TKey } from "@/i18n";
import { haptic } from "@/lib/haptic";
import { isScreenReason } from "@/lib/moderation";
import { BIO_MAX, normalizeSocial, SOCIALS, socialLabel, type LinkError, type Social, type SocialLinks } from "@/lib/socialLinks";
import { useSession } from "@/store/session";
import { useTheme } from "@/theme/ThemeProvider";
import { gap, space } from "@/theme/tokens";

const PLACEHOLDER: Record<Social, string> = { x: "@username", instagram: "@username", github: "username", threads: "@username", linkedin: "linkedin.com/in/…", youtube: "@channel", website: "https://" };

/**
 * Edit the public creator profile (§29): name, bio and social links. Each link is checked as it is typed and
 * again by the server; the preview line shows exactly what buyers will see under every listing.
 */
export default function ProfileScreen() {
  const { c } = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const user = useSession((s) => s.user);
  const { data } = useCreator(user?.handle ?? "");
  const save = useSaveProfile();
  const [name, setName] = useState(user?.name ?? "");
  const [bio, setBio] = useState("");
  const [links, setLinks] = useState<SocialLinks>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (loaded || !data) return;
    if (data.creator) {
      setName(data.creator.name);
      setBio(data.creator.bio);
      setLinks(data.creator.links ?? {});
    }
    setLoaded(true);
  }, [data, loaded]);

  if (!user) return null;
  const site = (k: Social) => (k === "website" ? t("creator.website") : SOCIAL_NAME[k]);
  const checks = Object.fromEntries(SOCIALS.map((k) => [k, normalizeSocial(k, links[k] ?? "")])) as Record<Social, ReturnType<typeof normalizeSocial>>;
  const errorOf = (k: Social): LinkError | null => ("error" in checks[k] ? (checks[k] as { error: LinkError }).error : null);
  const invalid = SOCIALS.some((k) => errorOf(k)) || bio.trim().length > BIO_MAX || !name.trim();

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + gap.sm }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space.gutter, paddingBottom: gap.md }}>
        <Txt variant="section">{t("creator.edit")}</Txt>
        <HeaderButton icon="close" motion="spin" label={t("common.close")} onPress={() => router.back()} />
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: insets.bottom + gap.xxl, gap: gap.lg }}>
        <Reveal>
          <Txt tone="fgMuted">{t("creator.editBody")}</Txt>
        </Reveal>
        <Reveal index={1} style={{ gap: gap.lg }}>
          <Field label={t("creator.name")} value={name} onChangeText={setName} />
          <Field label={t("creator.bio")} value={bio} onChangeText={setBio} multiline hint={bio.trim().length > BIO_MAX ? t("creator.errors.bioTooLong") : `${bio.trim().length} / ${BIO_MAX}`} />
        </Reveal>
        <Reveal index={2} style={{ gap: gap.lg }}>
          <View style={{ gap: gap.xs }}>
            <Txt variant="section">{t("creator.links")}</Txt>
            <Txt variant="caption" tone="fgSubtle">
              {t("creator.linksHint")}
            </Txt>
          </View>
          {SOCIALS.map((k) => {
            const err = errorOf(k);
            const ok = checks[k];
            return (
              <View key={k} style={{ flexDirection: "row", gap: gap.md, alignItems: "flex-start" }}>
                <View style={{ width: 32, height: 32, marginTop: 32, alignItems: "center", justifyContent: "center" }}>
                  <SocialIcon kind={k} size={20} color={err ? c.danger : c.fg} />
                </View>
                <View style={{ flex: 1 }}>
                  <Field
                    label={site(k)}
                    value={links[k] ?? ""}
                    onChangeText={(v) => setLinks((l) => ({ ...l, [k]: v }))}
                    placeholder={PLACEHOLDER[k]}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType={k === "website" ? "url" : "default"}
                    hint={err ? t(`creator.errors.${err}` as TKey, { site: site(k) }) : "value" in ok && ok.value ? socialLabel(k, ok.value) : undefined}
                  />
                </View>
              </View>
            );
          })}
        </Reveal>
        <Button
          label={t("creator.save")}
          disabled={invalid}
          loading={save.isPending}
          onPress={() =>
            save.mutate(
              { handle: user.handle, name, bio, links },
              {
                onSuccess: () => {
                  haptic("success");
                  toast(t("creator.saved"));
                  router.back();
                },
                onError: (e) => toast(t((isScreenReason(e.message) ? `moderation.${e.message}` : `creator.errors.${e.message}`) as TKey, { site: "" }), "warning"),
              },
            )
          }
        />
        <Button label={t("creator.preview")} variant="ghost" onPress={() => router.push(`/creator/${user.handle}` as never)} />
      </ScrollView>
    </View>
  );
}
