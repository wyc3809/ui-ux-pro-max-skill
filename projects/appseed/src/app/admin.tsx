import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { ScrollView, View } from "react-native";
import { api } from "@/api/backend";
import type { AdminListing, AdminReport } from "@/api/types";
import { DetailScaffold } from "@/components/shell/DetailScaffold";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Section } from "@/components/ui/Section";
import { toast } from "@/components/ui/Toast";
import { Txt } from "@/components/ui/Txt";
import { useT } from "@/i18n";
import { formatPrice } from "@/lib/price";
import { gap, radius } from "@/theme/tokens";

/**
 * Staff tools (§36), opened from Me for staff only: the report queue Apple expects handled within 24 hours,
 * listings waiting for review, and suspensions. The server checks staff again and logs every action.
 */
export default function AdminScreen() {
  const t = useT();
  const qc = useQueryClient();
  const { data: role } = useQuery({ queryKey: ["staff"], queryFn: api.staffRole });
  const reports = useQuery({ queryKey: ["admin", "reports"], queryFn: api.adminReports, enabled: !!role });
  const listings = useQuery({ queryKey: ["admin", "listings"], queryFn: api.adminListings, enabled: !!role });

  const act = (run: () => Promise<unknown>) =>
    run()
      .then(() => {
        toast(t("common.done"));
        qc.invalidateQueries({ queryKey: ["admin"] });
      })
      .catch(() => toast(t("common.tryAgain"), "warning"));

  if (!role) {
    return (
      <DetailScaffold title={t("admin.title")}>
        <EmptyState icon="lock" title={t("admin.title")} body={t("admin.staffOnly")} />
      </DetailScaffold>
    );
  }

  return (
    <DetailScaffold title={t("admin.title")}>
      <Section title={t("admin.reports")} eyebrow={t("admin.reportsHint")} inset={false}>
        {reports.data?.length === 0 && <Txt tone="fgMuted">{t("admin.empty")}</Txt>}
        {reports.data?.map((r) => (
          <ReportCard key={r.id} r={r} onAct={act} />
        ))}
      </Section>
      <Section title={t("admin.listings")} index={1} inset={false}>
        {listings.data?.length === 0 && <Txt tone="fgMuted">{t("admin.empty")}</Txt>}
        {listings.data?.map((l) => (
          <ListingCard key={l.slug} l={l} onAct={act} />
        ))}
      </Section>
    </DetailScaffold>
  );
}

function ReportCard({ r, onAct }: { r: AdminReport; onAct: (run: () => Promise<unknown>) => void }) {
  const t = useT();
  const held = r.detail.startsWith("auto:");
  return (
    <Card style={{ gap: gap.sm }}>
      <Txt variant="caption" tone="fgSubtle">
        {t(`admin.kind.${r.target_kind}`)} · @{r.target_handle} · {held ? t("admin.held") : t(`moderation.reasons.${r.reason}` as never)} · {t("admin.count", { n: r.reports })}
      </Txt>
      <Txt numberOfLines={6}>{r.preview || r.target_id}</Txt>
      {!!r.detail && !held && (
        <Txt variant="caption" tone="fgMuted">
          {r.detail}
        </Txt>
      )}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: gap.sm }}>
        {r.target_kind !== "profile" && <Button label={t("admin.hide")} variant="danger" onPress={() => onAct(() => api.adminResolve(r.id, "hide"))} />}
        <Button label={held ? t("admin.restore") : t("admin.dismiss")} variant="secondary" onPress={() => onAct(() => api.adminResolve(r.id, held ? "restore" : "dismiss"))} />
        {!!r.target_handle && <Button label={t("admin.suspend")} variant="ghost" onPress={() => onAct(() => api.adminSuspend(r.target_handle))} />}
      </View>
    </Card>
  );
}

function ListingCard({ l, onAct }: { l: AdminListing; onAct: (run: () => Promise<unknown>) => void }) {
  const t = useT();
  const failed = (l.report?.checks ?? []).filter((c) => c.status !== "pass").map((c) => c.id);
  return (
    <Card style={{ gap: gap.sm }}>
      <Txt variant="caption" tone="fgSubtle">
        {t(`admin.listingKind.${l.kind}` as never)} · @{l.owner_handle} · {l.price ? formatPrice(l.price / 100, "HKD", t("common.free")) : t("common.free")}
      </Txt>
      <Txt variant="bodyStrong">{l.data.name ?? l.data.title ?? l.slug}</Txt>
      <Txt tone="fgMuted">{l.data.tagline ?? l.data.summary ?? ""}</Txt>
      {/* Every uploaded image is seen by a person before the listing goes live (§39). */}
      {!!(l.data.media?.icon || l.data.media?.screenshots.length) && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: gap.sm }}>
          {[l.data.media?.icon, ...(l.data.media?.screenshots ?? [])].filter(Boolean).map((uri) => (
            <Image key={uri} source={{ uri: uri! }} style={{ width: 64, height: uri === l.data.media?.icon ? 64 : 128, borderRadius: radius.control }} contentFit="cover" />
          ))}
        </ScrollView>
      )}
      {l.data.media?.video && (
        <Txt variant="caption" tone="fgSubtle">
          {t("media.videoAdded")}
        </Txt>
      )}
      {failed.length > 0 && (
        <Txt variant="caption" tone="warn">
          {t("admin.warnings", { list: failed.join(", ") })}
        </Txt>
      )}
      <View style={{ flexDirection: "row", gap: gap.sm }}>
        <Button label={t("admin.approve")} onPress={() => onAct(() => api.adminReview(l.slug, true))} />
        <Button label={t("admin.reject")} variant="secondary" onPress={() => onAct(() => api.adminReview(l.slug, false))} />
      </View>
    </Card>
  );
}
