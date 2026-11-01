import { Image } from "expo-image";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import Animated from "react-native-reanimated";
import { api } from "@/api/backend";
import { Icon } from "@/components/ui/Icon";
import { PressableScale } from "@/components/ui/PressableScale";
import { Spinner } from "@/components/ui/Spinner";
import { toast } from "@/components/ui/Toast";
import { Txt } from "@/components/ui/Txt";
import { useT } from "@/i18n";
import { haptic } from "@/lib/haptic";
import { type ListingMedia, MEDIA, type MediaKind } from "@/lib/media";
import { pickMedia } from "@/lib/pickMedia";
import { storeIdFrom, type Store } from "@/lib/storeLinks";
import { rowIn, rowOut } from "@/theme/animations";
import { useTheme } from "@/theme/ThemeProvider";
import { gap, nested, radius, space } from "@/theme/tokens";
import { Field, Group } from "./FormFields";

/**
 * The listing's preview (docs/DESIGN.md §39): an app icon, up to 8 screenshots and one short video, picked from
 * the photo library on iOS, Android or the web. Each file is checked (lib/media.ts) before it uploads; until a
 * listing has an icon, the generated cover stands in.
 */
export function MediaEditor({ value, onChange, minScreenshots = 0 }: { value: ListingMedia; onChange: (m: ListingMedia) => void; minScreenshots?: number }) {
  const { c } = useTheme();
  const t = useT();
  const [busy, setBusy] = useState<MediaKind | null>(null);

  const add = async (kind: MediaKind) => {
    const picked = await pickMedia(kind).catch(() => ({ error: "mediaType" }));
    if (!picked) return;
    if ("error" in picked) {
      haptic("warning");
      return toast(t.error(picked.error, ["media.errors"], { side: MEDIA.icon.minSide, seconds: MEDIA.video.maxSeconds }), "warning");
    }
    setBusy(kind);
    try {
      const { url } = await api.uploadMedia(kind, picked.file);
      haptic("success");
      onChange(kind === "icon" ? { ...value, icon: url } : kind === "video" ? { ...value, video: url } : { ...value, screenshots: [...value.screenshots, url].slice(0, MEDIA.screenshot.max) });
    } catch (e) {
      toast(t.error(e instanceof Error ? e.message : "", ["media.errors"], { side: MEDIA.icon.minSide, seconds: MEDIA.video.maxSeconds }), "warning");
    } finally {
      setBusy(null);
    }
  };

  const slot = { width: 72, aspectRatio: 9 / 19.5, borderRadius: radius.inset, alignItems: "center", justifyContent: "center" } as const;
  const empty = { ...slot, borderWidth: 1.5, borderStyle: "dashed", borderColor: c.fgSubtle } as const;

  return (
    <View style={{ gap: gap.xl }}>
      <Group label={t("media.icon")}>
        <View style={{ width: "100%", flexDirection: "row", alignItems: "center", gap: gap.md }}>
          <PressableScale onPress={() => add("icon")} accessibilityRole="button" accessibilityLabel={value.icon ? t("media.replaceIcon") : t("media.addIcon")} style={{ width: 72, height: 72, borderRadius: radius.row, overflow: "hidden", alignItems: "center", justifyContent: "center", ...(value.icon ? { borderWidth: 1, borderColor: c.border } : { borderWidth: 1.5, borderStyle: "dashed", borderColor: c.fgSubtle }) }}>
            {busy === "icon" ? <Spinner color={c.fgMuted} /> : value.icon ? <Image source={{ uri: value.icon }} style={{ width: "100%", height: "100%" }} contentFit="cover" accessibilityIgnoresInvertColors /> : <Icon name="upload" size={20} color={c.fgSubtle} />}
          </PressableScale>
          <Txt variant="caption" tone="fgMuted" style={{ flex: 1 }}>
            {t("media.iconHint", { side: MEDIA.icon.minSide })}
          </Txt>
        </View>
      </Group>

      <Group label={minScreenshots ? t("media.screenshotsMin", { n: minScreenshots }) : t("media.screenshots")}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ width: "100%" }} contentContainerStyle={{ gap: gap.sm }}>
          {value.screenshots.map((uri, i) => (
            <Animated.View key={uri} entering={rowIn} exiting={rowOut} style={[slot, { overflow: "hidden", borderWidth: 1, borderColor: c.border }]}>
              <Image source={{ uri }} style={{ width: "100%", height: "100%" }} contentFit="cover" accessibilityLabel={t("a11y.media", { i: i + 1, n: value.screenshots.length })} />
              <Remove label={t("media.remove")} onPress={() => onChange({ ...value, screenshots: value.screenshots.filter((_, j) => j !== i) })} />
            </Animated.View>
          ))}
          {value.screenshots.length < MEDIA.screenshot.max && (
            <PressableScale onPress={() => add("screenshot")} hapticKind="tap" accessibilityRole="button" accessibilityLabel={t("upload.addShot")} style={empty}>
              {busy === "screenshot" ? <Spinner color={c.fgMuted} /> : <Icon name="image" size={20} color={c.fgSubtle} />}
            </PressableScale>
          )}
        </ScrollView>
      </Group>

      <Group label={t("media.video")}>
        <View style={{ width: "100%", flexDirection: "row", alignItems: "center", gap: gap.md }}>
          <PressableScale onPress={() => (value.video ? undefined : add("video"))} accessibilityRole="button" accessibilityLabel={value.video ? t("media.videoAdded") : t("media.addVideo")} style={[{ width: 72, height: 72, borderRadius: radius.inset, alignItems: "center", justifyContent: "center" }, value.video ? { backgroundColor: c.accentSoft } : { borderWidth: 1.5, borderStyle: "dashed", borderColor: c.fgSubtle }]}>
            {busy === "video" ? <Spinner color={c.fgMuted} /> : <Icon name={value.video ? "play" : "film"} size={22} color={value.video ? c.accent : c.fgSubtle} />}
            {value.video && <Remove label={t("media.remove")} onPress={() => onChange({ ...value, video: undefined })} />}
          </PressableScale>
          <Txt variant="caption" tone="fgMuted" style={{ flex: 1 }}>
            {value.video ? t("media.videoAdded") : t("media.videoHint", { seconds: MEDIA.video.maxSeconds })}
          </Txt>
        </View>
      </Group>
    </View>
  );
}

function Remove({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={gap.sm} style={{ position: "absolute", top: gap.xs, right: gap.xs, width: 24, height: 24, borderRadius: nested(radius.inset, gap.xs), backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center" }}>
      <Icon name="close" size={14} color="#ffffff" enter={false} />
    </PressableScale>
  );
}

/** App Store and Google Play links; each is checked as it is typed and stored as the canonical store URL. */
export function StoreLinkFields({ value, onChange }: { value: Record<Store, string>; onChange: (v: Record<Store, string>) => void }) {
  const t = useT();
  const hint = (store: Store) => {
    const r = storeIdFrom(store, value[store]);
    return "error" in r ? t(`media.errors.${r.error}`) : undefined;
  };
  return (
    <View style={{ width: "100%", gap: space.cardPad }}>
      <Field label={t("media.appStore")} value={value.appStore} onChangeText={(appStore) => onChange({ ...value, appStore })} placeholder="https://apps.apple.com/…" autoCapitalize="none" keyboardType="url" hint={hint("appStore")} />
      <Field label={t("media.googlePlay")} value={value.googlePlay} onChangeText={(googlePlay) => onChange({ ...value, googlePlay })} placeholder="https://play.google.com/store/apps/details?id=…" autoCapitalize="none" keyboardType="url" hint={hint("googlePlay")} />
    </View>
  );
}
