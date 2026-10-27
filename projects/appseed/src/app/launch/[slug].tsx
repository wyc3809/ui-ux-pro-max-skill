import * as Clipboard from "expo-clipboard";
import { router, useLocalSearchParams } from "expo-router";
import { Linking, Platform, Share, View } from "react-native";
import Animated from "react-native-reanimated";
import { findCreator } from "@/api/mockServer";
import { useEngagement, useLaunch, usePrompt, useTemplate, useVote } from "@/api/queries";
import { CommentsSection } from "@/components/engage/CommentsSection";
import { EngagementPanel } from "@/components/engage/EngagementPanel";
import { useJumpTo } from "@/components/engage/useJumpTo";
import { PromptRow } from "@/components/market/Cards";
import { UpvoteButton } from "@/components/market/UpvoteButton";
import { DetailScaffold } from "@/components/shell/DetailScaffold";
import { Cover } from "@/components/template/Cover";
import { TemplateRow } from "@/components/template/TemplateCard";
import { BottomBar } from "@/components/ui/BottomBar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { HeaderButton } from "@/components/ui/HeaderButton";
import { Icon } from "@/components/ui/Icon";
import { ListRow, RowDivider } from "@/components/ui/ListRow";
import { PressableScale } from "@/components/ui/PressableScale";
import { Section } from "@/components/ui/Section";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/components/ui/Toast";
import { Txt } from "@/components/ui/Txt";
import { useT } from "@/i18n";
import { itemKey } from "@/lib/engagement";
import { formatDate } from "@/lib/format";
import { requireAuth } from "@/store/authGate";
import { enterAt } from "@/theme/animations";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, font } from "@/theme/tokens";

/** A promoted vibe-coded app: maker's story, tools used, links, and the template / prompt behind it. */
export default function LaunchScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: l, isLoading } = useLaunch(slug);
  const vote = useVote();
  const jumpTo = useJumpTo();
  // Header and stats share one live comment count.
  const { data: engagement } = useEngagement(itemKey("launch", slug));
  const { c } = useTheme();
  const t = useT();

  const open = async (url: string) => {
    // Native opens the store / site; if that fails (or on web inside a sandbox) copy the link instead.
    const ok = Platform.OS !== "web" && (await Linking.openURL(url).then(() => true).catch(() => false));
    if (!ok) {
      await Clipboard.setStringAsync(url).catch(() => {});
      toast(t("launch.openLink"));
    }
  };

  if (!isLoading && !l) {
    return (
      <View style={{ flex: 1, justifyContent: "center", backgroundColor: c.bg }}>
        <EmptyState icon="closeCircle" title={t("search.emptyTitle")} body={t("search.emptyBody")} action={{ label: t("library.browse"), onPress: () => router.replace("/") }} />
      </View>
    );
  }
  const maker = l ? findCreator(l.maker) : undefined;

  return (
    <DetailScaffold
      scrollRef={jumpTo.ref}
      title={l?.name}
      right={l ? <HeaderButton icon="share" motion="bounce" label="Share" onPress={() => Share.share({ message: `${l.name} https://appseed.app/l/${l.slug}` })} /> : undefined}
      bottom={
        l ? (
          <BottomBar>
            <UpvoteButton count={l.upvotes} voted={l.voted} name={l.name} onToggle={() => vote.mutate(l.slug)} size="lg" />
            {l.links[0] && <Button label={`${t("launch.links")} · ${l.links[0].label}`} icon={<Icon name="rocket" size={18} color={c.accentFg} />} onPress={() => open(l.links[0]!.url)} style={{ flex: 1 }} />}
          </BottomBar>
        ) : undefined
      }
    >
      {!l ? (
        <Skeleton height={320} radius={radius.hero} />
      ) : (
        <>
          <Animated.View entering={enterAt(0)}>
            <Card style={{ gap: 12, padding: 12, borderRadius: radius.hero }}>
              <Cover t={l} />
              <View style={{ paddingHorizontal: 6, gap: 6 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Txt variant="eyebrow" tone="fgSubtle">
                    {formatDate(l.launchedAt, t.locale)}
                  </Txt>
                  {l.boosted && <Tag label={t("launch.sponsored")} />}
                </View>
                <Txt variant="heroTitle" accessibilityRole="header">
                  {l.name}
                </Txt>
                <Txt variant="heroLede" tone="fgMuted">
                  {l.tagline}
                </Txt>
              </View>
              {maker && (
                <PressableScale onPress={() => router.push(`/creator/${maker.handle}`)} scaleTo={0.98} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 6, minHeight: 44 }}>
                  <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: c.accentSoft, alignItems: "center", justifyContent: "center" }}>
                    <Txt tone="accent" style={{ fontFamily: font.bold }}>
                      {maker.name[0]}
                    </Txt>
                  </View>
                  <Txt variant="bodyStrong" style={{ flex: 1 }}>
                    {maker.name}
                  </Txt>
                  <Txt variant="caption" tone="fgSubtle">
                    {t("launch.comments", { n: engagement?.comments ?? 0 })}
                  </Txt>
                </PressableScale>
              )}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, paddingHorizontal: 6, paddingBottom: 6 }}>
                {l.aiTools.map((tool, i) => (
                  <Tag key={tool} label={tool} index={i} />
                ))}
                <Tag label={t("launch.buildDays", { n: l.buildDays })} index={l.aiTools.length} />
                {l.platforms.map((p, i) => (
                  <Tag key={p} label={p} index={l.aiTools.length + 1 + i} />
                ))}
              </View>
            </Card>
          </Animated.View>

          <EngagementPanel
            kind="launch"
            slug={l.slug}
            title={l.name}
            like={{ label: t("engage.upvotes"), icon: "upvote", count: l.upvotes, active: l.voted, onToggle: () => requireAuth("auth.reasonUpvote", () => vote.mutate(l.slug)) }}
            extra={{ icon: "timer", label: t("engage.buildDays"), value: l.buildDays }}
            onComments={jumpTo.jump}
          />

          <Section title={t("launch.story")} index={1} inset={false}>
            <Card style={{ flexDirection: "row", gap: 12 }}>
              <Icon name="sparkles" size={20} color={c.accent} active loop="breathe" />
              <Txt variant="longform" style={{ flex: 1 }}>
                {l.story}
              </Txt>
            </Card>
          </Section>

          <Section title={t("launch.links")} index={2} inset={false}>
            <Card padded={false}>
              {l.links.map((link, i) => (
                <View key={link.url}>
                  {i > 0 && <RowDivider />}
                  <ListRow icon="globe" title={link.label} detail={link.url.replace(/^https?:\/\//, "")} onPress={() => open(link.url)} />
                </View>
              ))}
            </Card>
          </Section>

          {l.relatedTemplate && <RelatedTemplate slug={l.relatedTemplate} />}
          {l.relatedPrompt && <RelatedPrompt slug={l.relatedPrompt} />}
          <View onLayout={jumpTo.onLayout}>
            <CommentsSection kind="launch" slug={l.slug} />
          </View>
        </>
      )}
    </DetailScaffold>
  );
}

function RelatedTemplate({ slug }: { slug: string }) {
  const t = useT();
  const { data } = useTemplate(slug);
  if (!data) return null;
  return (
    <Section title={t("launch.relatedTemplate")} index={2} inset={false}>
      <View style={{ marginHorizontal: -16 }}>
        <TemplateRow t={data} />
      </View>
    </Section>
  );
}

function RelatedPrompt({ slug }: { slug: string }) {
  const t = useT();
  const { data } = usePrompt(slug);
  if (!data) return null;
  return (
    <Section title={t("launch.relatedPrompt")} index={2} inset={false}>
      <View style={{ marginHorizontal: -16 }}>
        <PromptRow p={data} />
      </View>
    </Section>
  );
}
