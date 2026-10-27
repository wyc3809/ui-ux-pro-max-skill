import { useState } from "react";
import { TextInput, View } from "react-native";
import Animated from "react-native-reanimated";
import { useComments, useDeleteComment, usePostComment } from "@/api/queries";
import type { Comment } from "@/api/types";
import { Icon } from "@/components/ui/Icon";
import { PressableScale } from "@/components/ui/PressableScale";
import { noOutline } from "@/components/ui/SearchBar";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/components/ui/Toast";
import { Txt } from "@/components/ui/Txt";
import { useT } from "@/i18n";
import { COMMENT_MAX, formatRelative, itemKey, validateComment, type ItemKind } from "@/lib/engagement";
import { haptic } from "@/lib/haptic";
import { requireAuth } from "@/store/authGate";
import { useSession } from "@/store/session";
import { reorder, rowIn, rowOut } from "@/theme/animations";
import { useTheme } from "@/theme/ThemeProvider";
import { font, radius } from "@/theme/tokens";

const PREVIEW = 3;

/** Public comment thread for any item. New comments slide in on top; deleting one closes the gap smoothly. */
export function CommentsSection({ kind, slug }: { kind: ItemKind; slug: string }) {
  const { c, card } = useTheme();
  const t = useT();
  const key = itemKey(kind, slug);
  const { data } = useComments(key);
  const post = usePostComment(key);
  const remove = useDeleteComment(key);
  const user = useSession((s) => s.user);
  const [text, setText] = useState("");
  const [all, setAll] = useState(false);
  const [now] = useState(Date.now());

  const send = () => {
    const err = validateComment(text);
    if (err) {
      haptic("warning");
      toast(t(`engage.${err}`), "warning");
      return;
    }
    if (!user) return;
    post.mutate(
      { body: text, user: { id: user.id, name: user.name, handle: user.handle } },
      {
        onSuccess: () => {
          haptic("success");
          setText("");
          setAll(true);
        },
      },
    );
  };

  const list = data ?? [];
  const shown = all ? list : list.slice(0, PREVIEW);
  const ready = validateComment(text) == null;

  return (
    <View style={[{ padding: 16, borderRadius: radius.card, backgroundColor: c.bgElevated, gap: 12 }, card]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Icon name="comment" size={17} color={c.accent} active />
        <Txt variant="section" style={{ flex: 1 }}>
          {t("engage.commentsTitle")}
        </Txt>
        <Txt variant="caption" tone="fgSubtle" tabular>
          {list.length}
        </Txt>
      </View>

      {/* Composer: guests see the same field, but tapping it opens sign-in first. */}
      {user ? (
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
          <View style={{ flex: 1, gap: 4 }}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={t("engage.placeholder")}
              placeholderTextColor={c.fgSubtle}
              multiline
              maxLength={COMMENT_MAX + 50}
              accessibilityLabel={t("engage.placeholder")}
              maxFontSizeMultiplier={1.4}
              style={[{ minHeight: 44, maxHeight: 120, paddingHorizontal: 12, paddingVertical: 12, borderRadius: radius.control, backgroundColor: c.bgMuted, color: c.fg, fontFamily: font.regular, fontSize: 16 }, noOutline]}
            />
            {text.length > COMMENT_MAX - 100 && (
              <Txt variant="caption" tone={text.length > COMMENT_MAX ? "danger" : "fgSubtle"} tabular style={{ textAlign: "right" }}>
                {text.length}/{COMMENT_MAX}
              </Txt>
            )}
          </View>
          <PressableScale
            onPress={send}
            disabled={post.isPending}
            accessibilityLabel={t("engage.send")}
            scaleTo={0.9}
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: ready ? c.accent : c.bgMuted, alignItems: "center", justifyContent: "center" }}
          >
            <Icon name="send" size={18} color={ready ? c.accentFg : c.fgSubtle} active={ready} motion="nudge" trigger={post.isPending} loop={post.isPending ? "breathe" : undefined} />
          </PressableScale>
        </View>
      ) : (
        <PressableScale onPress={() => requireAuth("engage.reasonComment", () => {})} scaleTo={0.99} accessibilityLabel={t("engage.placeholder")} style={{ height: 44, justifyContent: "center", paddingHorizontal: 12, borderRadius: radius.control, backgroundColor: c.bgMuted }}>
          <Txt tone="fgSubtle">{t("engage.placeholder")}</Txt>
        </PressableScale>
      )}

      {!data ? (
        [0, 1].map((i) => <Skeleton key={i} height={56} radius={radius.control} />)
      ) : list.length === 0 ? (
        <Txt tone="fgMuted" style={{ textAlign: "center", paddingVertical: 8 }}>
          {t("engage.empty")}
        </Txt>
      ) : (
        <View>
          {shown.map((cm) => (
            <Animated.View key={cm.id} entering={rowIn} exiting={rowOut} layout={reorder}>
              <CommentRow
                cm={cm}
                now={now}
                mine={cm.userId === user?.id}
                onDelete={() =>
                  remove.mutate(cm.id, {
                    onSuccess: () => toast(t("engage.deleted")),
                  })
                }
              />
            </Animated.View>
          ))}
        </View>
      )}

      {!all && list.length > PREVIEW && (
        <PressableScale onPress={() => setAll(true)} scaleTo={0.98} style={{ height: 40, alignItems: "center", justifyContent: "center", borderRadius: radius.control, backgroundColor: c.bgMuted }}>
          <Txt variant="bodyStrong" tone="accent">
            {t("engage.seeAll", { n: list.length })}
          </Txt>
        </PressableScale>
      )}
    </View>
  );
}

function CommentRow({ cm, now, mine, onDelete }: { cm: Comment; now: number; mine: boolean; onDelete: () => void }) {
  const { c } = useTheme();
  const t = useT();
  return (
    <View style={{ flexDirection: "row", gap: 12, paddingVertical: 12 }}>
      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: mine ? c.accent : c.accentSoft, alignItems: "center", justifyContent: "center" }}>
        <Txt style={{ fontFamily: font.bold, color: mine ? c.accentFg : c.accent }}>{cm.author.slice(0, 1).toUpperCase()}</Txt>
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Txt variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
            {mine ? t("engage.you") : cm.author}
          </Txt>
          <Txt variant="caption" tone="fgSubtle" numberOfLines={1}>
            @{cm.handle} · {formatRelative(cm.createdAt, Math.max(now, Date.now()), t.locale)}
          </Txt>
        </View>
        <Txt>{cm.body}</Txt>
      </View>
      {mine && (
        <PressableScale onPress={onDelete} hitSlop={10} accessibilityLabel={t("engage.delete")} style={{ alignSelf: "flex-start", paddingTop: 2 }}>
          <Icon name="trash" size={16} color={c.fgSubtle} motion="wiggle" />
        </PressableScale>
      )}
    </View>
  );
}
