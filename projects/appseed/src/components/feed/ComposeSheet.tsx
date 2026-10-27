import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { findTemplate } from "@/api/mockServer";
import { useCreatePost, useStudio } from "@/api/queries";
import type { Post, PostAttachment } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Sheet } from "@/components/ui/Sheet";
import { SheetTextInput } from "@/components/ui/SheetTextInput";
import { noOutline } from "@/components/ui/SearchBar";
import { toast } from "@/components/ui/Toast";
import { Txt } from "@/components/ui/Txt";
import { useT, type TKey } from "@/i18n";
import { haptic } from "@/lib/haptic";
import { POST_MAX, remaining, validatePost } from "@/lib/posts";
import { useSession } from "@/store/session";
import { useTheme } from "@/theme/ThemeProvider";
import { font, gap, space } from "@/theme/tokens";
import { Avatar, PostBody } from "./Post";

/**
 * Writes a post or, with `parent`, a reply. A post can attach one of the writer's own live listings, which
 * labels it 作者作品; replies never carry an attachment. The server re-checks every rule, including the
 * daily promotion limit, and its error is shown as a toast.
 */
export function ComposeSheet({ open, onClose, parent }: { open: boolean; onClose: () => void; parent?: Post }) {
  const { c } = useTheme();
  const t = useT();
  const user = useSession((s) => s.user);
  const { data: studio } = useStudio();
  const create = useCreatePost();
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState<PostAttachment | undefined>();

  useEffect(() => {
    if (!open) {
      setText("");
      setAttachment(undefined);
    }
  }, [open]);

  const mine = (studio?.listings ?? []).filter((l) => l.status === "live");
  const local = validatePost(text, { promo: false, promoToday: 0 });
  const left = remaining(text);

  const submit = () => {
    if (!user || local) return;
    create.mutate(
      { body: text, attachment: parent ? undefined : attachment, parentId: parent?.id, user: { id: user.id, name: user.name, handle: user.handle } },
      {
        onSuccess: () => {
          haptic("success");
          toast(t("discuss.posted"));
          onClose();
        },
        onError: (e) => toast(t(`discuss.errors.${e.message}` as TKey), "warning"),
      },
    );
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={parent ? t("discuss.replyTo", { name: parent.author }) : t("discuss.compose")}
      footer={
        <View style={{ flexDirection: "row", alignItems: "center", gap: gap.md }}>
          <Txt variant="caption" tone={left != null && left < 0 ? "danger" : "fgSubtle"} tabular style={{ flex: 1 }}>
            {left != null ? `${left} / ${POST_MAX}` : parent ? "" : t("discuss.promoNote")}
          </Txt>
          <Button label={t("discuss.post")} onPress={submit} loading={create.isPending} disabled={!!local} style={{ minWidth: 112 }} />
        </View>
      }
    >
      {parent && (
        <View style={{ flexDirection: "row", gap: gap.md, opacity: 0.8 }}>
          <Avatar name={parent.author} size={28} />
          <View style={{ flex: 1, gap: gap.xxs }}>
            <Txt variant="bodyStrong">{parent.author}</Txt>
            <PostBody body={parent.body.length > 140 ? `${parent.body.slice(0, 140)}…` : parent.body} />
          </View>
        </View>
      )}
      <View style={{ flexDirection: "row", gap: gap.md }}>
        <Avatar name={user?.name ?? null} size={28} mine />
        <SheetTextInput
          value={text}
          onChangeText={setText}
          placeholder={parent ? t("discuss.replyPlaceholder") : t("discuss.placeholder")}
          placeholderTextColor={c.fgSubtle}
          multiline
          autoFocus
          maxLength={POST_MAX + 50}
          accessibilityLabel={parent ? t("discuss.replyPlaceholder") : t("discuss.placeholder")}
          style={[{ flex: 1, minHeight: 96, color: c.fg, fontFamily: font.regular, fontSize: 16, lineHeight: 24, textAlignVertical: "top", paddingTop: gap.xs }, noOutline]}
        />
      </View>
      {!parent && mine.length > 0 && (
        <View style={{ gap: gap.sm }}>
          <Txt variant="caption" tone="fgMuted">
            {t("discuss.attach")}
          </Txt>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -(space.gutter + gap.sm) }} contentContainerStyle={{ gap: gap.sm, paddingHorizontal: space.gutter + gap.sm }}>
            <Chip label={t("discuss.noAttach")} selected={!attachment} onPress={() => setAttachment(undefined)} />
            {mine.map((l) => (
              <Chip key={l.slug} label={findTemplate(l.slug)?.name ?? l.slug} selected={attachment?.slug === l.slug} onPress={() => setAttachment({ kind: "template", slug: l.slug })} />
            ))}
          </ScrollView>
        </View>
      )}
    </Sheet>
  );
}
