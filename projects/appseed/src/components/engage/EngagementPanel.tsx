import Ionicons from "@expo/vector-icons/Ionicons";
import * as Clipboard from "expo-clipboard";
import { useEffect, useState } from "react";
import { Linking, Platform, Share, View } from "react-native";
import Animated from "react-native-reanimated";
import { useEngagement, useRecordShare, useToggleLike } from "@/api/queries";
import { Icon, type IconName } from "@/components/ui/Icon";
import { NumberRoll } from "@/components/ui/NumberRoll";
import { PressableScale } from "@/components/ui/PressableScale";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/components/ui/Toast";
import { Txt } from "@/components/ui/Txt";
import { useT } from "@/i18n";
import { buildShareUrl, formatCompact, itemKey, shareLink, shouldCountView, type ItemKind, type ShareTarget } from "@/lib/engagement";
import { haptic } from "@/lib/haptic";
import { requireAuth } from "@/store/authGate";
import { useFavorites } from "@/store/favorites";
import { mmkv } from "@/store/storage";
import { api } from "@/api/mockServer";
import { popIn, slideInAt } from "@/theme/animations";
import { useTheme } from "@/theme/ThemeProvider";
import { radius } from "@/theme/tokens";

type Extra = { icon: IconName; label: string; value: number };
/** Launches upvote instead of liking: the first tile then shows and toggles the upvote. */
type LikeOverride = { label: string; icon: IconName; count: number; active: boolean; onToggle: () => void };

type Props = { kind: ItemKind; slug: string; title: string; extra: Extra; like?: LikeOverride; onComments?: () => void };

const VIEWED_KEY = "engage:last-viewed";

/**
 * Stats grid + share row for any item (templates, prompts, buyouts, launches). Likes and saves are
 * live toggles (heart / bookmark morph and the count rolls), comments jump to the thread, and every
 * share hand-off bumps the share count.
 */
export function EngagementPanel({ kind, slug, title, extra, like, onComments }: Props) {
  const t = useT();
  const key = itemKey(kind, slug);
  const { data: e } = useEngagement(key);
  const toggleLike = useToggleLike(key);
  const saved = useFavorites((s) => s.slugs.includes(key));
  const toggleSave = useFavorites((s) => s.toggle);

  // Count one view per item per 30 minutes per device; the server de-dupes per viewer too.
  useEffect(() => {
    const seen = JSON.parse(mmkv.getString(VIEWED_KEY) ?? "{}") as Record<string, number>;
    const now = Date.now();
    if (!shouldCountView(seen[key], now)) return;
    mmkv.set(VIEWED_KEY, JSON.stringify({ ...seen, [key]: now }));
    api.recordView(key).catch(() => {});
  }, [key]);

  const compact = (n: number) => formatCompact(n, t.locale);
  if (!e) {
    return (
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} height={84} radius={radius.row} style={{ flexBasis: "30%", flexGrow: 1 }} />
        ))}
      </View>
    );
  }

  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {like ? (
          <Tile index={0} icon={like.icon} label={like.label} value={like.count} active={like.active} format={compact} onPress={like.onToggle} a11y={like.label} />
        ) : (
          <Tile
            index={0}
            icon="heart"
            label={t("engage.likes")}
            value={e.likes}
            active={e.liked}
            activeTone="danger"
            format={compact}
            a11y={t("engage.likeA11y", { n: e.likes })}
            onPress={() =>
              requireAuth("engage.reasonLike", () => {
                haptic(e.liked ? "selection" : "tap");
                toggleLike.mutate();
              })
            }
          />
        )}
        <Tile index={1} icon="eye" label={t("engage.views")} value={e.views} format={compact} />
        <Tile index={2} icon="share" label={t("engage.shares")} value={e.shares} format={compact} />
        <Tile index={3} icon="comment" label={t("engage.comments")} value={e.comments} format={compact} onPress={onComments} a11y={t("engage.commentA11y", { n: e.comments })} />
        <Tile
          index={4}
          icon="bookmark"
          label={t("engage.bookmarks")}
          value={e.bookmarks + (saved ? 1 : 0)}
          active={saved}
          format={compact}
          a11y={saved ? t("template.unfavorite") : t("template.favorite")}
          onPress={() =>
            requireAuth("auth.reasonFavorite", () => {
              haptic("tap");
              toggleSave(key);
            })
          }
        />
        <Tile index={5} icon={extra.icon} label={extra.label} value={extra.value} format={compact} />
      </View>
      <ShareRow kind={kind} slug={slug} title={title} />
    </View>
  );
}

type TileProps = {
  index: number;
  icon: IconName;
  label: string;
  value: number;
  format: (n: number) => string;
  active?: boolean;
  activeTone?: "accent" | "danger";
  onPress?: () => void;
  a11y?: string;
};

/** One stat. Interactive tiles get a tinted border when active and their icon morphs to filled. */
function Tile({ index, icon, label, value, format, active = false, activeTone = "accent", onPress, a11y }: TileProps) {
  const { c, card } = useTheme();
  const tone = active ? c[activeTone] : c.fgMuted;
  const body = (
    <View style={[{ padding: 12, gap: 6, borderRadius: radius.row, backgroundColor: active ? (activeTone === "danger" ? c.dangerSoft : c.accentSoft) : c.bgElevated, borderWidth: 1.5, borderColor: active ? tone : "transparent", minHeight: 84 }, active ? null : card]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Icon name={icon} size={15} color={c.fgMuted} activeColor={tone} active={active} motion="pop" enterDelay={index * 50} />
        <Txt variant="eyebrow" tone={active ? (activeTone === "danger" ? "danger" : "accent") : "fgSubtle"} style={{ fontSize: 10, letterSpacing: 1 }} numberOfLines={1}>
          {label}
        </Txt>
      </View>
      <NumberRoll value={value} variant="price" format={format} />
    </View>
  );
  return (
    <Animated.View entering={slideInAt(index, 50)} style={{ flexBasis: "30%", flexGrow: 1 }}>
      {onPress ? (
        <PressableScale onPress={onPress} scaleTo={0.95} accessibilityLabel={a11y ?? label} accessibilityState={{ selected: active }}>
          {body}
        </PressableScale>
      ) : (
        <View accessible accessibilityLabel={`${label} ${format(value)}`}>
          {body}
        </View>
      )}
    </Animated.View>
  );
}

const TARGET_GLYPH: Record<ShareTarget, { glyph: "logo-x" | "logo-linkedin" | "logo-threads" | "logo-whatsapp"; label: string; brand?: string }> = {
  x: { glyph: "logo-x", label: "X" },
  linkedin: { glyph: "logo-linkedin", label: "LinkedIn", brand: "#0a66c2" },
  threads: { glyph: "logo-threads", label: "Threads" },
  whatsapp: { glyph: "logo-whatsapp", label: "WhatsApp", brand: "#25d366" },
};

/** Copy link, four networks and the system share sheet. Buttons pop in one by one. */
function ShareRow({ kind, slug, title }: { kind: ItemKind; slug: string; title: string }) {
  const { c, card } = useTheme();
  const t = useT();
  const record = useRecordShare(itemKey(kind, slug));
  const [copied, setCopied] = useState(false);
  const url = shareLink(kind, slug);
  const text = t("engage.shareText", { name: title });

  const open = async (target: ShareTarget) => {
    haptic("tap");
    record.mutate();
    const href = buildShareUrl(target, url, text);
    const ok = await Linking.openURL(href).then(() => true).catch(() => false);
    if (!ok) {
      await Clipboard.setStringAsync(url).catch(() => {});
      toast(t("engage.linkCopied"));
    }
  };
  const copy = async () => {
    await Clipboard.setStringAsync(url).catch(() => {});
    record.mutate();
    setCopied(true);
    toast(t("engage.linkCopied"));
    setTimeout(() => setCopied(false), 1600);
  };
  const native = async () => {
    record.mutate();
    await Share.share(Platform.OS === "ios" ? { message: text, url } : { message: `${text} ${url}` }).catch(() => {});
  };

  // Six equal-width buttons that always fit one row (no lone button wrapping onto its own line).
  const square = { height: 48, borderRadius: radius.control + 2, backgroundColor: c.bgMuted, alignItems: "center" as const, justifyContent: "center" as const };
  return (
    <View style={[{ padding: 14, borderRadius: radius.card, backgroundColor: c.bgElevated, gap: 12 }, card]}>
      <Txt variant="eyebrow" tone="fgSubtle">
        {t("engage.shareTo")}
      </Txt>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Animated.View entering={popIn(0, 60)} style={{ flex: 1 }}>
          <PressableScale onPress={copy} scaleTo={0.9} accessibilityLabel={t("engage.copyLink")} style={square}>
            <Icon name={copied ? "check" : "link"} size={20} color={copied ? c.live : c.fg} active={copied} motion="pop" trigger={copied} />
          </PressableScale>
        </Animated.View>
        {(Object.keys(TARGET_GLYPH) as ShareTarget[]).map((target, i) => (
          <Animated.View key={target} entering={popIn(i + 1, 60)} style={{ flex: 1 }}>
            <PressableScale onPress={() => open(target)} scaleTo={0.9} accessibilityLabel={`${t("engage.shareTo")} ${TARGET_GLYPH[target].label}`} style={square}>
              {/* Brand logos are font glyphs; LinkedIn and WhatsApp keep their brand colours, X and Threads follow the text colour. */}
              <Ionicons name={TARGET_GLYPH[target].glyph} size={22} color={TARGET_GLYPH[target].brand ?? c.fg} />
            </PressableScale>
          </Animated.View>
        ))}
        <Animated.View entering={popIn(5, 60)} style={{ flex: 1 }}>
          <PressableScale onPress={native} scaleTo={0.9} accessibilityLabel={t("engage.more")} style={square}>
            <Icon name="more" size={20} color={c.fg} />
          </PressableScale>
        </Animated.View>
      </View>
    </View>
  );
}
