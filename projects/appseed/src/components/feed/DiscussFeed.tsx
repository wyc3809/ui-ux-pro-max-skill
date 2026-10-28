import { useState } from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";
import { usePosts } from "@/api/queries";
import type { Post } from "@/api/types";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { ExplainSheet } from "@/components/ui/ExplainSheet";
import { Icon } from "@/components/ui/Icon";
import { PressableScale } from "@/components/ui/PressableScale";
import { Reveal } from "@/components/ui/Reveal";
import { Skeleton } from "@/components/ui/Skeleton";
import { Txt } from "@/components/ui/Txt";
import { useT } from "@/i18n";
import type { PostSort } from "@/lib/posts";
import { requireTerms } from "@/store/authGate";
import { useSession } from "@/store/session";
import { reorder, rowIn } from "@/theme/animations";
import { useTheme } from "@/theme/ThemeProvider";
import { gap, space } from "@/theme/tokens";
import { ComposeSheet } from "./ComposeSheet";
import { useViewer } from "./useViewer";
import { useModeration } from "@/components/moderation/ModerationSheet";
import { withoutBlocked } from "@/lib/moderation";
import { useBlocks } from "@/store/blocks";

const SORTS: PostSort[] = ["forYou", "top", "latest"];
import { AVATAR, Avatar, PostItem } from "./Post";

/** Hairline between posts, inset to line up with the text column like Threads. */
export function PostDivider() {
  const { c } = useTheme();
  return <View style={{ height: 1, backgroundColor: c.border, marginLeft: AVATAR + gap.md }} />;
}

/**
 * 討論: the Threads-style feed on Explore. A composer row on top (sign in first), latest or top ordering,
 * then posts separated by hairlines. New posts slide in at the top; reordering glides.
 */
export function DiscussFeed() {
  const { c } = useTheme();
  const t = useT();
  const user = useSession((s) => s.user);
  const [sort, setSort] = useState<PostSort>("forYou");
  const viewer = useViewer();
  const { data } = usePosts(sort, viewer);
  const [how, setHow] = useState(false);
  const [compose, setCompose] = useState<{ parent?: Post } | null>(null);
  const report = useModeration();
  const blocked = useBlocks((s) => s.handles);
  const [now] = useState(Date.now());

  return (
    <View style={{ paddingTop: gap.lg, paddingHorizontal: space.gutter, gap: gap.md }}>
      <Reveal>
        <PressableScale
          onPress={() => requireTerms("discuss.reasonPost", () => setCompose({}))}
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
      <Reveal index={1} style={{ flexDirection: "row", alignItems: "center", gap: gap.sm }}>
        {SORTS.map((s) => (
          <Chip key={s} label={t(`discuss.${s}`)} selected={sort === s} onPress={() => setSort(s)} />
        ))}
        <View style={{ flex: 1 }} />
        <PressableScale onPress={() => setHow(true)} hitSlop={8} accessibilityLabel={t("discuss.how")}>
          <Icon name="info" size={20} color={c.fgSubtle} />
        </PressableScale>
      </Reveal>

      {!data ? (
        <View style={{ gap: gap.lg }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={120} />
          ))}
        </View>
      ) : data.length === 0 ? (
        <EmptyState icon="chat" title={t("discuss.empty")} body={t("discuss.emptyBody")} action={{ label: t("discuss.compose"), onPress: () => requireTerms("discuss.reasonPost", () => setCompose({})) }} />
      ) : (
        <View>
          {withoutBlocked(data, blocked).map((p, i) => (
            <Animated.View key={p.id} entering={rowIn} layout={reorder}>
              {i > 0 && <PostDivider />}
              <PostItem p={p} now={now} mine={p.userId === user?.id} onReply={() => requireTerms("discuss.reasonPost", () => setCompose({ parent: p }))} onMore={() => report.ask({ kind: "post", id: p.id, handle: p.handle })} threadLine={p.replies > 0} />
            </Animated.View>
          ))}
        </View>
      )}

      <ExplainSheet
        open={how}
        onClose={() => setHow(false)}
        title={t("discuss.how")}
        points={[
          { icon: "chat", text: t("discuss.how1") },
          { icon: "heart", text: t("discuss.how2") },
          { icon: "sparkles", text: t("discuss.how3") },
          { icon: "eye", text: t("discuss.how4") },
          { icon: "people", text: t("discuss.how5") },
          { icon: "shield", text: t("discuss.how6") },
        ]}
      />
      <ComposeSheet open={!!compose} parent={compose?.parent} onClose={() => setCompose(null)} />
      {report.sheet}
    </View>
  );
}
