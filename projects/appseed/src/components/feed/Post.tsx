import { router } from "expo-router";
import { useState } from "react";
import { Share, View } from "react-native";
import { findListing } from "@/api/mockServer";
import { usePostToggle } from "@/api/queries";
import type { Post, PostAttachment } from "@/api/types";
import { Cover } from "@/components/template/Cover";
import { Tag } from "@/components/ui/Chip";
import { Icon, type IconName } from "@/components/ui/Icon";
import { PressableScale } from "@/components/ui/PressableScale";
import { Txt } from "@/components/ui/Txt";
import { useT } from "@/i18n";
import { formatCompact, formatRelative } from "@/lib/engagement";
import { haptic } from "@/lib/haptic";
import { segments } from "@/lib/posts";
import { formatPrice } from "@/lib/price";
import { requireAuth } from "@/store/authGate";
import { useTheme } from "@/theme/ThemeProvider";
import { font, gap, nested, radius } from "@/theme/tokens";

export const AVATAR = 36;
const ROUTE: Record<PostAttachment["kind"], string> = { template: "template", prompt: "prompt", buyout: "buyout", launch: "launch" };

/** Initial in a circle; `name` null = a signed-out visitor, shown as a person glyph. */
export function Avatar({ name, size = AVATAR, mine }: { name: string | null; size?: number; mine?: boolean }) {
  const { c } = useTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: radius.chip, backgroundColor: mine ? c.accent : name ? c.accentSoft : c.bgMuted, alignItems: "center", justifyContent: "center" }}>
      {name ? (
        <Txt variant="bodyStrong" style={{ color: mine ? c.accentFg : c.accent, fontFamily: font.bold }}>
          {name.slice(0, 1).toUpperCase()}
        </Txt>
      ) : (
        <Icon name="user" size={size / 2} color={c.fgMuted} enter={false} />
      )}
    </View>
  );
}

/** Post text with #tags and links in the accent colour. */
export function PostBody({ body, large }: { body: string; large?: boolean }) {
  return (
    <Txt variant={large ? "longform" : "body"}>
      {segments(body).map((s, i) =>
        s.kind === "text" ? (
          s.text
        ) : (
          <Txt key={i} variant={large ? "longform" : "body"} tone="accent">
            {s.text}
          </Txt>
        ),
      )}
    </Txt>
  );
}

/** The promoted app as a compact card; tapping opens its page. */
export function AttachmentCard({ a }: { a: PostAttachment }) {
  const { c } = useTheme();
  const t = useT();
  const item = findListing(a.kind, a.slug);
  if (!item) return null;
  return (
    <PressableScale
      onPress={() => router.push(`/${ROUTE[a.kind]}/${a.slug}` as never)}
      accessibilityLabel={`${t(`discuss.kind.${a.kind}`)} ${item.name}`}
      style={{ flexDirection: "row", gap: gap.md, padding: gap.sm, borderRadius: radius.inset, borderWidth: 1, borderColor: c.border, backgroundColor: c.bgElevated }}
    >
      <Cover t={item} style={{ width: 64, aspectRatio: 1 }} rounded={nested(radius.inset, gap.sm)} />
      <View style={{ flex: 1, gap: gap.xxs, justifyContent: "center" }}>
        <Txt variant="caption" tone="fgSubtle">
          {t(`discuss.kind.${a.kind}`)}
          {item.price != null ? ` · ${formatPrice(item.price, "HKD", t("common.free"))}` : ""}
        </Txt>
        <Txt variant="bodyStrong" numberOfLines={1}>
          {item.name}
        </Txt>
        <Txt variant="caption" tone="fgMuted" numberOfLines={1}>
          {item.tagline}
        </Txt>
      </View>
      <View style={{ justifyContent: "center" }}>
        <Icon name="chevronRight" size={16} color={c.fgSubtle} enter={false} />
      </View>
    </PressableScale>
  );
}

function Action({ icon, count, active, color, label, motion, onPress }: { icon: IconName; count?: number; active?: boolean; color?: string; label: string; motion?: "pop" | "spin" | "bounce"; onPress: () => void }) {
  const { c } = useTheme();
  const t = useT();
  const [taps, setTaps] = useState(0);
  const tint = active ? (color ?? c.accent) : c.fgMuted;
  return (
    <PressableScale
      onPress={() => {
        setTaps((n) => n + 1);
        onPress();
      }}
      accessibilityLabel={count != null ? `${label} ${count}` : label}
      accessibilityState={{ selected: !!active }}
      hitSlop={8}
      scaleTo={0.9}
      style={{ flexDirection: "row", alignItems: "center", gap: gap.xs, minHeight: 36, paddingRight: gap.md }}
    >
      <Icon name={icon} size={20} color={tint} active={active} motion={motion ?? "pop"} trigger={taps} />
      {count != null && count > 0 && (
        <Txt variant="caption" tabular style={{ color: tint }}>
          {formatCompact(count, t.locale)}
        </Txt>
      )}
    </PressableScale>
  );
}

/**
 * One post in the Threads style: avatar column on the left (with a line down to the replies when there are
 * any), then name, time, the post, an optional promoted app and the action row. Tapping the text opens the thread.
 */
export function PostItem({ p, now, mine, large, onReply, onMore, threadLine }: { p: Post; now: number; mine?: boolean; large?: boolean; onReply: () => void; onMore: () => void; threadLine?: boolean }) {
  const { c } = useTheme();
  const t = useT();
  const like = usePostToggle("like");
  const repost = usePostToggle("repost");
  const open = () => router.push(`/post/${p.id}`);
  return (
    <View style={{ flexDirection: "row", gap: gap.md, paddingVertical: gap.md }}>
      <View style={{ alignItems: "center", gap: gap.sm }}>
        <PressableScale onPress={() => router.push(`/creator/${p.handle}` as never)} accessibilityLabel={p.author}>
          <Avatar name={p.author} mine={mine} />
        </PressableScale>
        {threadLine && <View style={{ flex: 1, width: 2, borderRadius: radius.chip, backgroundColor: c.bgMuted }} />}
      </View>
      <View style={{ flex: 1, gap: gap.sm }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: gap.sm }}>
          <Txt variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
            {p.author}
          </Txt>
          <Txt variant="caption" tone="fgSubtle" numberOfLines={1} style={{ flexShrink: 1 }}>
            {formatRelative(p.createdAt, now, t.locale)}
          </Txt>
          {p.promo && <Tag label={t("discuss.promo")} />}
          <View style={{ flex: 1 }} />
          <PressableScale onPress={onMore} hitSlop={10} accessibilityLabel={t("discuss.more")}>
            <Icon name="more" size={20} color={c.fgSubtle} enter={false} />
          </PressableScale>
        </View>
        <PressableScale onPress={open} disabled={large} scaleTo={0.99} accessibilityRole="link" accessibilityLabel={t("discuss.thread")}>
          <PostBody body={p.body} large={large} />
        </PressableScale>
        {p.attachment && <AttachmentCard a={p.attachment} />}
        <View style={{ flexDirection: "row", alignItems: "center", marginLeft: -gap.xs }}>
          <Action icon="heart" label={t("discuss.like")} count={p.likes} active={p.liked} color={c.danger} onPress={() => requireAuth("discuss.reasonPost", () => like.mutate(p.id))} />
          <Action icon="comment" label={t("discuss.reply")} count={p.replies} motion="bounce" onPress={() => requireAuth("discuss.reasonPost", onReply)} />
          <Action
            icon="repost"
            label={p.reposted ? t("discuss.reposted") : t("discuss.repost")}
            count={p.reposts}
            active={p.reposted}
            color={c.live}
            motion="spin"
            onPress={() =>
              requireAuth("discuss.reasonPost", () => {
                haptic("success");
                repost.mutate(p.id);
              })
            }
          />
          <Action icon="send" label={t("discuss.share")} motion="bounce" onPress={() => Share.share({ message: `${p.body.slice(0, 80)} https://appseed.app/post/${p.id}` })} />
        </View>
      </View>
    </View>
  );
}
