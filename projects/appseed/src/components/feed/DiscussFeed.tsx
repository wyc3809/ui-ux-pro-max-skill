import { useState } from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";
import { usePosts, useReportPost } from "@/api/queries";
import type { Post } from "@/api/types";
import { Chip } from "@/components/ui/Chip";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { PressableScale } from "@/components/ui/PressableScale";
import { Reveal } from "@/components/ui/Reveal";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/components/ui/Toast";
import { Txt } from "@/components/ui/Txt";
import { useT } from "@/i18n";
import type { PostSort } from "@/lib/posts";
import { requireAuth } from "@/store/authGate";
import { useSession } from "@/store/session";
import { reorder, rowIn } from "@/theme/animations";
import { useTheme } from "@/theme/ThemeProvider";
import { gap, space } from "@/theme/tokens";
import { ComposeSheet } from "./ComposeSheet";
import { AVATAR, Avatar, PostItem } from "./Post";

/** Hairline between posts, inset to line up with the text column like Threads. */
export function PostDivider() {
  const { c } = useTheme();
  return <View style={{ height: 1, backgroundColor: c.border, marginLeft: AVATAR + gap.md }} />;
}

/** Hook for the report confirmation shared by the feed and the thread page. */
export function useReportFlow() {
  const t = useT();
  const report = useReportPost();
  const [target, setTarget] = useState<Post | null>(null);
  const sheet = (
    <ConfirmSheet
      open={!!target}
      title={t("discuss.report")}
      body={t("discuss.reportBody")}
      confirmLabel={t("discuss.report")}
      onClose={() => setTarget(null)}
      onConfirm={() => {
        if (target) report.mutate(target.id, { onSuccess: () => toast(t("discuss.reported")) });
        setTarget(null);
      }}
    />
  );
  return { ask: setTarget, sheet };
}

/**
 * 討論: the Threads-style feed on Explore. A composer row on top (sign in first), latest or top ordering,
 * then posts separated by hairlines. New posts slide in at the top; reordering glides.
 */
export function DiscussFeed() {
  const { c } = useTheme();
  const t = useT();
  const user = useSession((s) => s.user);
  const [sort, setSort] = useState<PostSort>("latest");
  const { data } = usePosts(sort);
  const [compose, setCompose] = useState<{ parent?: Post } | null>(null);
  const report = useReportFlow();
  const [now] = useState(Date.now());

  return (
    <View style={{ paddingTop: gap.lg, paddingHorizontal: space.gutter, gap: gap.md }}>
      <Reveal>
        <PressableScale
          onPress={() => requireAuth("discuss.reasonPost", () => setCompose({}))}
          accessibilityLabel={t("discuss.prompt")}
          scaleTo={0.99}
          style={{ flexDirection: "row", alignItems: "center", gap: gap.md, paddingVertical: gap.sm }}
        >
          <Avatar name={user?.name ?? null} mine={!!user} />
          <Txt tone="fgSubtle" style={{ flex: 1 }}>
            {t("discuss.prompt")}
          </Txt>
          <Icon name="compose" size={20} color={c.accent} motion="bounce" />
        </PressableScale>
      </Reveal>
      <Reveal index={1} style={{ flexDirection: "row", gap: gap.sm }}>
        <Chip label={t("discuss.latest")} selected={sort === "latest"} onPress={() => setSort("latest")} />
        <Chip label={t("discuss.top")} selected={sort === "top"} onPress={() => setSort("top")} />
      </Reveal>

      {!data ? (
        <View style={{ gap: gap.lg }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={120} />
          ))}
        </View>
      ) : data.length === 0 ? (
        <EmptyState icon="chat" title={t("discuss.empty")} body={t("discuss.emptyBody")} action={{ label: t("discuss.compose"), onPress: () => requireAuth("discuss.reasonPost", () => setCompose({})) }} />
      ) : (
        <View>
          {data.map((p, i) => (
            <Animated.View key={p.id} entering={rowIn} layout={reorder}>
              {i > 0 && <PostDivider />}
              <PostItem p={p} now={now} mine={p.userId === user?.id} onReply={() => setCompose({ parent: p })} onMore={() => report.ask(p)} threadLine={p.replies > 0} />
            </Animated.View>
          ))}
        </View>
      )}

      <ComposeSheet open={!!compose} parent={compose?.parent} onClose={() => setCompose(null)} />
      {report.sheet}
    </View>
  );
}
