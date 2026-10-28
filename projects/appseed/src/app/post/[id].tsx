import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";
import { useThread } from "@/api/queries";
import { ComposeSheet } from "@/components/feed/ComposeSheet";
import { PostDivider } from "@/components/feed/DiscussFeed";
import { useModeration } from "@/components/moderation/ModerationSheet";
import { withoutBlocked } from "@/lib/moderation";
import { useBlocks } from "@/store/blocks";
import { Avatar, PostItem } from "@/components/feed/Post";
import { DetailScaffold } from "@/components/shell/DetailScaffold";
import { BottomBar } from "@/components/ui/BottomBar";
import { PressableScale } from "@/components/ui/PressableScale";
import { Reveal } from "@/components/ui/Reveal";
import { Skeleton } from "@/components/ui/Skeleton";
import { Txt } from "@/components/ui/Txt";
import { useT } from "@/i18n";
import { requireAuth } from "@/store/authGate";
import { useSeenPosts } from "@/store/seenPosts";
import { useSession } from "@/store/session";
import { rowIn } from "@/theme/animations";
import { gap } from "@/theme/tokens";

/** A post with its replies, oldest first, and a floating glass reply bar (§27). */
export default function ThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useT();
  const user = useSession((s) => s.user);
  const { data } = useThread(id);
  const markSeen = useSeenPosts((s) => s.mark);
  useEffect(() => markSeen(id), [id, markSeen]);
  const [replying, setReplying] = useState(false);
  const report = useModeration();
  const blocked = useBlocks((s) => s.handles);
  const [now] = useState(Date.now());
  const reply = () => requireAuth("discuss.reasonPost", () => setReplying(true));

  return (
    <DetailScaffold
      title={t("discuss.thread")}
      bottom={
        data ? (
          <BottomBar>
            <PressableScale onPress={reply} accessibilityLabel={t("discuss.replyTo", { name: data.post.author })} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: gap.md, height: 48 }}>
              <Avatar name={user?.name ?? null} size={28} mine={!!user} />
              <Txt tone="fgSubtle" numberOfLines={1} style={{ flex: 1 }}>
                {t("discuss.replyTo", { name: data.post.author })}
              </Txt>
            </PressableScale>
          </BottomBar>
        ) : undefined
      }
    >
      {!data ? (
        <Skeleton height={200} />
      ) : (
        <View>
          <Reveal>
            <PostItem p={data.post} now={now} mine={data.post.userId === user?.id} large onReply={reply} onMore={() => report.ask({ kind: "post", id: data.post.id, handle: data.post.handle })} threadLine={data.replies.length > 0} />
          </Reveal>
          {data.replies.length > 0 && (
            <Reveal index={1}>
              <Txt variant="caption" tone="fgSubtle" style={{ paddingVertical: gap.sm }}>
                {t("discuss.replies", { n: data.replies.length })}
              </Txt>
            </Reveal>
          )}
          {withoutBlocked(data.replies, blocked).map((r, i) => (
            <Animated.View key={r.id} entering={rowIn}>
              {i > 0 && <PostDivider />}
              <PostItem p={r} now={now} mine={r.userId === user?.id} onReply={reply} onMore={() => report.ask({ kind: "post", id: r.id, handle: r.handle })} />
            </Animated.View>
          ))}
        </View>
      )}
      <ComposeSheet open={replying} parent={data?.post} onClose={() => setReplying(false)} />
      {report.sheet}
    </DetailScaffold>
  );
}
