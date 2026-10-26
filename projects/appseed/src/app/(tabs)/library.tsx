import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";
import { usePurchases, useTemplates } from "@/api/queries";
import { LargeTitleScreen } from "@/components/shell/LargeTitleScreen";
import { TabScene } from "@/components/shell/TabScene";
import { TemplateRow } from "@/components/template/TemplateCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon, type IconName } from "@/components/ui/Icon";
import { PressableScale } from "@/components/ui/PressableScale";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Skeleton } from "@/components/ui/Skeleton";
import { Txt } from "@/components/ui/Txt";
import { useT } from "@/i18n";
import { shouldAnimateItems } from "@/lib/motion";
import { useFavorites } from "@/store/favorites";
import { crossfadeIn, reorder, rowIn, rowOut } from "@/theme/animations";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space } from "@/theme/tokens";

export default function LibraryScreen() {
  const t = useT();
  const [seg, setSeg] = useState<"owned" | "saved">("owned");
  const { data: all } = useTemplates();
  const { data: purchases, isLoading, refetch } = usePurchases();
  const saved = useFavorites((s) => s.slugs);
  const slugs = seg === "owned" ? purchases ?? [] : saved;
  const items = slugs.map((s) => all?.find((x) => x.slug === s)).filter((x) => !!x);
  // Per-row enter/exit only for small changes (e.g. one unsave); first load and bulk syncs appear at once (§8).
  const prevCount = useRef<number | null>(null);
  const animateRows = prevCount.current != null && shouldAnimateItems(Math.abs(items.length - prevCount.current), false);
  useEffect(() => {
    prevCount.current = items.length;
  });

  return (
    <TabScene index={1}>
      <LargeTitleScreen title={t("library.title")} onRefresh={refetch}>
        <View style={{ paddingHorizontal: space.gutter, paddingBottom: 16 }}>
          <SegmentedControl
            value={seg}
            onChange={(v) => {
              prevCount.current = null;
              setSeg(v);
            }}
            options={[
              { value: "owned", label: t("library.owned") },
              { value: "saved", label: t("library.saved") },
            ]}
          />
        </View>
        {isLoading ? (
          <View style={{ paddingHorizontal: space.gutter, gap: 10 }}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} height={92} radius={radius.row} />
            ))}
          </View>
        ) : items.length === 0 ? (
          seg === "owned" ? (
            <EmptyState icon="package" title={t("library.emptyOwnedTitle")} body={t("library.emptyOwnedBody")} action={{ label: t("library.browse"), onPress: () => router.navigate("/") }} />
          ) : (
            <EmptyState icon="heart" title={t("library.emptySavedTitle")} body={t("library.emptySavedBody")} action={{ label: t("library.browse"), onPress: () => router.navigate("/") }} />
          )
        ) : (
          <Animated.View key={seg} entering={crossfadeIn} style={{ gap: 10 }}>
            {items.map((x) => (
              <Animated.View key={x.slug} entering={animateRows ? rowIn : undefined} exiting={rowOut} layout={reorder} style={{ gap: 6 }}>
                <TemplateRow t={x} trailing={seg === "owned" && x.versions.length > 1 ? <UpdateBadge /> : undefined} />
                {seg === "owned" && (
                  <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: space.gutter }}>
                    <MiniAction icon="laptop" label={t("cta.send")} onPress={() => router.push(`/template/${x.slug}`)} />
                    <MiniAction icon="book" label={t("template.story")} onPress={() => router.push(`/template/${x.slug}/story`)} />
                  </View>
                )}
              </Animated.View>
            ))}
          </Animated.View>
        )}
      </LargeTitleScreen>
    </TabScene>
  );
}

function UpdateBadge() {
  const { c } = useTheme();
  const t = useT();
  return (
    <View style={{ backgroundColor: c.pendingSoft, borderRadius: 999, paddingHorizontal: 8, height: 22, justifyContent: "center" }}>
      <Txt style={{ fontSize: 11, fontFamily: "DMSans_700Bold", color: c.pending }}>{t("library.hasUpdate")}</Txt>
    </View>
  );
}

function MiniAction({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const { c } = useTheme();
  const [taps, setTaps] = useState(0);
  return (
    <PressableScale
      onPress={() => {
        setTaps((n) => n + 1);
        onPress();
      }}
      hapticKind="selection" style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 40, borderRadius: radius.control, backgroundColor: c.bgMuted }}>
      <Icon name={icon} size={16} color={c.fg} motion="bounce" trigger={taps} />
      <Txt variant="caption" style={{ fontFamily: "DMSans_700Bold" }}>
        {label}
      </Txt>
    </PressableScale>
  );
}
