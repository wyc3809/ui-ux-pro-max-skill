import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCreator } from "@/api/queries";
import { TemplateCard } from "@/components/template/TemplateCard";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { HeaderButton } from "@/components/ui/HeaderButton";
import { NumberRoll } from "@/components/ui/NumberRoll";
import { Section } from "@/components/ui/Section";
import { Skeleton } from "@/components/ui/Skeleton";
import { Txt } from "@/components/ui/Txt";
import { useT } from "@/i18n";

import { useTheme } from "@/theme/ThemeProvider";
import { font, gap, radius, space } from "@/theme/tokens";
import { Reveal } from "@/components/ui/Reveal";
import { SocialLinksRow } from "@/components/creator/CreatorCard";
import { useModeration } from "@/components/moderation/ModerationSheet";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { toast } from "@/components/ui/Toast";
import { useBlocks } from "@/store/blocks";
import { useSession } from "@/store/session";

export default function CreatorScreen() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const { data, isLoading } = useCreator(handle);
  const { c } = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const colW = (Math.min(width, 1120) - space.gutter * 2 - 12) / 2;
  const creator = data?.creator;
  const moderation = useModeration();
  const isBlocked = useBlocks((s) => s.handles.includes(handle));
  const unblock = useBlocks((s) => s.unblock);
  const me = useSession((s) => s.user);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ paddingTop: insets.top, paddingHorizontal: space.gutter, height: insets.top + 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <HeaderButton icon="chevronLeft" motion="nudge" label={t("a11y.backBtn")} onPress={() => router.back()} />
        {creator && me?.handle !== handle && <HeaderButton icon="more" label={t("moderation.reportProfile")} onPress={() => moderation.ask({ kind: "profile", id: handle, handle })} />}
      </View>
      {isBlocked && (
        <View style={{ marginHorizontal: space.gutter, flexDirection: "row", alignItems: "center", gap: gap.md, padding: gap.md, borderRadius: radius.control, backgroundColor: c.dangerSoft }}>
          <Icon name="userX" size={18} color={c.danger} active />
          <Txt tone="danger" style={{ flex: 1 }}>
            {t("moderation.blockedProfile")}
          </Txt>
          <Button
            label={t("moderation.unblock")}
            variant="secondary"
            onPress={() => {
              unblock(handle);
              toast(t("moderation.unblocked", { handle }));
            }}
          />
        </View>
      )}
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32, gap: 24 }}>
        {isLoading ? (
          <View style={{ alignItems: "center", gap: 12, paddingTop: 12 }}>
            <Skeleton width={84} height={84} radius={42} />
            <Skeleton width={160} height={22} />
          </View>
        ) : !creator ? (
          <EmptyState icon="userX" title={t("search.emptyTitle")} body={t("search.emptyBody")} action={{ label: t("library.browse"), onPress: () => router.replace("/") }} />
        ) : (
          <>
            <Reveal style={{ alignItems: "center", gap: 8, paddingHorizontal: space.gutter }}>
              <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: c.accentSoft, alignItems: "center", justifyContent: "center" }}>
                <Txt tone="accent" style={{ fontSize: 30, lineHeight: 36, fontFamily: font.bold }}>
                  {creator.name[0]}
                </Txt>
              </View>
              <Txt variant="heroTitle">{creator.name}</Txt>
              <Txt tone="fgSubtle">@{creator.handle}</Txt>
              {creator.founding && (
                <View style={{ backgroundColor: c.accentSoft, borderRadius: 999, paddingHorizontal: 12, height: 24, justifyContent: "center" }}>
                  <Txt style={{ fontSize: 12, fontFamily: font.semibold, color: c.accent }}>{t("creator.founding")}</Txt>
                </View>
              )}
              <Txt tone="fgMuted" style={{ textAlign: "center", marginTop: 4 }}>
                {creator.bio}
              </Txt>
              <View style={{ paddingTop: 8 }}>
                <SocialLinksRow c={creator} center />
              </View>
            </Reveal>
            <Reveal kind="card" index={1} style={{ paddingHorizontal: space.gutter }}>
              <Card style={{ flexDirection: "row" }}>
                <Stat label={t("creator.templates")} value={<NumberRoll value={data.templates.length} />} />
                <Stat label={t("creator.totalSales")} value={<NumberRoll value={creator.totalSales} />} />
                <Stat label={t("creator.avgRating")} value={creator.avgRating.toFixed(1)} />
              </Card>
            </Reveal>
            <Section title={t("creator.templates")} index={2}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, paddingHorizontal: space.gutter }}>
                {data.templates.map((x) => (
                  <TemplateCard key={x.slug} t={x} width={colW} />
                ))}
              </View>
            </Section>
          </>
        )}
      </ScrollView>
      {moderation.sheet}
    </View>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <View style={{ flex: 1, alignItems: "center", gap: 2 }}>
      {typeof value === "string" ? (
        <Txt variant="price" tabular>
          {value}
        </Txt>
      ) : (
        value
      )}
      <Txt variant="caption" tone="fgSubtle">
        {label}
      </Txt>
    </View>
  );
}
