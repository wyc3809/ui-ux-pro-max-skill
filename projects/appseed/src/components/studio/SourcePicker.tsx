import { useEffect, useRef, useState } from "react";
import { Platform, View } from "react-native";
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useConnectGithub, useGithubAccount, useGithubRepos, useScanRepo, useUploadZip } from "@/api/queries";
import type { GithubRepo, ScanReport, SourceChoice } from "@/api/types";
import { FileTree } from "@/components/template/FileTree";
import { Button } from "@/components/ui/Button";
import { Chip, Tag } from "@/components/ui/Chip";
import { Icon, type IconName } from "@/components/ui/Icon";
import { PressableScale } from "@/components/ui/PressableScale";
import { SearchInput } from "@/components/ui/SearchBar";
import { Sheet } from "@/components/ui/Sheet";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/components/ui/Toast";
import { Txt } from "@/components/ui/Txt";
import { useT } from "@/i18n";
import { formatBytes, formatDate } from "@/lib/format";
import { haptic } from "@/lib/haptic";
import { matches } from "@/lib/search";
import { isBlocking } from "@/lib/sourceScan";
import { enterAt, slideInAt } from "@/theme/animations";
import { useTheme } from "@/theme/ThemeProvider";
import { radius } from "@/theme/tokens";
import { ScanChecklist } from "./ScanChecklist";

type Props = { value: SourceChoice | null; onChange: (v: SourceChoice | null) => void; onStack?: (stack: string[]) => void };

/**
 * Source step for every listing that ships code: connect GitHub (recommended) or upload a zip on the web.
 * Either way the source runs through the same pre-review scan, and a failed check blocks submission.
 */
export function SourcePicker({ value, onChange, onStack }: Props) {
  const t = useT();
  const { data: account } = useGithubAccount();
  const [authOpen, setAuthOpen] = useState(false);

  if (!value) {
    return (
      <View style={{ gap: 12 }}>
        <OptionCard
          icon="git"
          title={t("source.github")}
          body={t("source.githubBody")}
          badge={t("source.recommended")}
          index={0}
          onPress={() => (account ? onChange({ kind: "github", repo: "", branch: "", report: null }) : setAuthOpen(true))}
        />
        <OptionCard icon="package" title={t("source.zip")} body={t("source.zipBody")} index={1} onPress={() => onChange({ kind: "zip", fileName: null, report: null })} />
        <AuthSheet
          open={authOpen}
          onClose={() => setAuthOpen(false)}
          onConnected={() => {
            setAuthOpen(false);
            onChange({ kind: "github", repo: "", branch: "", report: null });
          }}
        />
      </View>
    );
  }
  return (
    <View style={{ gap: 14 }}>
      {value.kind === "github" ? <GithubSource value={value} onChange={onChange} onStack={onStack} /> : <ZipSource value={value} onChange={onChange} onStack={onStack} />}
    </View>
  );
}

function OptionCard({ icon, title, body, badge, index, onPress }: { icon: IconName; title: string; body: string; badge?: string; index: number; onPress: () => void }) {
  const { c, card } = useTheme();
  return (
    <Animated.View entering={slideInAt(index, 80)}>
      <PressableScale onPress={onPress} hapticKind="tap" accessibilityLabel={title} scaleTo={0.98} style={[{ flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: radius.card, backgroundColor: c.bgElevated, borderWidth: badge ? 1.5 : 0, borderColor: c.accent }, card]}>
        <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: c.accentSoft, alignItems: "center", justifyContent: "center" }}>
          <Icon name={icon} size={24} color={c.accent} active enterDelay={120 + index * 80} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Txt variant="bodyStrong">{title}</Txt>
            {badge ? <Tag label={badge} /> : null}
          </View>
          <Txt variant="caption" tone="fgMuted">
            {body}
          </Txt>
        </View>
        <Icon name="chevronRight" size={18} color={c.fgSubtle} enter={false} />
      </PressableScale>
    </Animated.View>
  );
}

/** GitHub App authorization: what access is granted, stated plainly, before the creator says yes. */
function AuthSheet({ open, onClose, onConnected }: { open: boolean; onClose: () => void; onConnected: () => void }) {
  const { c } = useTheme();
  const t = useT();
  const connect = useConnectGithub();
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t("source.authTitle")}
      footer={
        <Button
          label={t("source.authorize")}
          loading={connect.isPending}
          icon={<Icon name="git" size={18} color={c.accentFg} />}
          onPress={() =>
            connect.mutate(undefined, {
              onSuccess: () => {
                haptic("success");
                toast(t("source.connected"));
                onConnected();
              },
            })
          }
        />
      }
    >
      <Txt tone="fgMuted">{t("source.authBody")}</Txt>
      {(["source.authP1", "source.authP2", "source.authP3"] as const).map((k, i) => (
        <Animated.View key={k} entering={slideInAt(i)} style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
          <Icon name="shield" size={18} color={c.live} active enterDelay={i * 80} />
          <Txt style={{ flex: 1 }}>{t(k)}</Txt>
        </Animated.View>
      ))}
    </Sheet>
  );
}

function GithubSource({ value, onChange, onStack }: { value: Extract<SourceChoice, { kind: "github" }>; onChange: Props["onChange"]; onStack: Props["onStack"] }) {
  const { c } = useTheme();
  const t = useT();
  const { data: account } = useGithubAccount();
  const { data: repos } = useGithubRepos(!!account);
  const scan = useScanRepo();
  const [q, setQ] = useState("");
  const repo = repos?.find((r) => r.fullName === value.repo);

  const run = (fullName: string, branch: string) => {
    onChange({ kind: "github", repo: fullName, branch, report: null });
    scan.mutate(fullName, {
      onSuccess: (report) => {
        haptic(isBlocking(report.checks) ? "warning" : "success");
        onChange({ kind: "github", repo: fullName, branch, report });
        if (!isBlocking(report.checks)) onStack?.(report.stack);
      },
    });
  };

  return (
    <>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: radius.row, backgroundColor: c.bgMuted }}>
        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c.fg, alignItems: "center", justifyContent: "center" }}>
          <Icon name="git" size={17} color={c.bg} active />
        </View>
        <Txt variant="bodyStrong" style={{ flex: 1 }}>
          @{account?.login}
        </Txt>
        <PressableScale onPress={() => onChange(null)} hitSlop={8}>
          <Txt variant="caption" tone="accent" style={{ fontFamily: "DMSans_700Bold" }}>
            {t("source.change")}
          </Txt>
        </PressableScale>
      </View>

      {!value.repo ? (
        <>
          <SearchInput value={q} onChangeText={setQ} placeholder={t("source.searchRepos")} />
          {!repos ? (
            [0, 1, 2].map((i) => <Skeleton key={i} height={64} radius={radius.row} />)
          ) : (
            repos
              .filter((r) => matches(q, [r.fullName, r.language]))
              .map((r, i) => <RepoRow key={r.fullName} r={r} index={i} onPress={() => run(r.fullName, r.defaultBranch)} />)
          )}
        </>
      ) : (
        <Animated.View entering={enterAt(0)} style={{ gap: 14 }}>
          {repo && <RepoRow r={repo} index={0} selected onPress={() => onChange({ kind: "github", repo: "", branch: "", report: null })} />}
          {repo && repo.branches.length > 1 && (
            <View style={{ gap: 8 }}>
              <Txt variant="caption" tone="fgMuted" style={{ fontFamily: "DMSans_700Bold" }}>
                {t("source.branch")}
              </Txt>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {repo.branches.map((b) => (
                  <Chip key={b} label={b} selected={value.branch === b} onPress={() => value.branch !== b && run(repo.fullName, b)} />
                ))}
              </View>
            </View>
          )}
          <ScanResult report={value.report} scanning={scan.isPending} onRescan={() => run(value.repo, value.branch)} onChooseOther={() => onChange({ kind: "github", repo: "", branch: "", report: null })} />
        </Animated.View>
      )}
    </>
  );
}

function RepoRow({ r, index, selected, onPress }: { r: GithubRepo; index: number; selected?: boolean; onPress: () => void }) {
  const { c, card } = useTheme();
  const t = useT();
  return (
    <Animated.View entering={slideInAt(index, 60)}>
      <PressableScale onPress={onPress} hapticKind="selection" scaleTo={0.98} accessibilityLabel={r.fullName} style={[{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: radius.row, backgroundColor: c.bgElevated, borderWidth: selected ? 1.5 : 0, borderColor: c.accent }, card]}>
        <Icon name={r.private ? "lock" : "globe"} size={18} color={c.fgMuted} active={r.private} enterDelay={index * 60} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="bodyStrong" numberOfLines={1}>
            {r.fullName.split("/")[1]}
          </Txt>
          <Txt variant="caption" tone="fgSubtle" numberOfLines={1}>
            {r.private ? t("source.private") : t("source.public")} · {r.language} · {t("source.updated", { date: formatDate(r.updatedAt, t.locale) })}
          </Txt>
        </View>
        {selected ? <Icon name="checkCircle" size={20} color={c.accent} active /> : <Icon name="chevronRight" size={18} color={c.fgSubtle} enter={false} />}
      </PressableScale>
    </Animated.View>
  );
}

/** Checklist + outcome: blocking issues with fixes, or detected stack and the file tree buyers will see. */
function ScanResult({ report, scanning, onRescan, onChooseOther }: { report: ScanReport | null; scanning: boolean; onRescan: () => void; onChooseOther?: () => void }) {
  const { c, card } = useTheme();
  const t = useT();
  const blocking = report ? report.checks.filter((x) => x.status === "fail").length : 0;
  const warns = report ? report.checks.filter((x) => x.status === "warn").length : 0;
  const settled = useSettledAfter(report, 7 * 180 + 120);
  return (
    <View style={{ gap: 14 }}>
      <View style={[{ padding: 14, borderRadius: radius.card, backgroundColor: c.bgElevated, gap: 12 }, card]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Icon name="shield" size={18} color={c.accent} active loop={scanning ? "breathe" : undefined} />
          <Txt variant="section" style={{ flex: 1 }}>
            {t("source.scanTitle")}
          </Txt>
          {scanning && (
            <Txt variant="caption" tone="fgSubtle">
              {t("source.scanning")}
            </Txt>
          )}
        </View>
        <ScanChecklist report={report} />
      </View>
      {report && settled && (
        <Animated.View entering={enterAt(0)} style={{ gap: 12 }}>
          {blocking > 0 ? (
            <View style={{ gap: 10, padding: 14, borderRadius: radius.inset, backgroundColor: c.dangerSoft }}>
              <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                <Icon name="warning" size={18} color={c.danger} active motion="wiggle" trigger={report} />
                <Txt variant="bodyStrong" tone="danger" style={{ flex: 1 }}>
                  {t("source.blocked", { n: blocking })}
                </Txt>
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Button label={t("source.rescan")} variant="secondary" onPress={onRescan} style={{ flex: 1 }} icon={<Icon name="refresh" size={16} color={c.fg} motion="spin" trigger={scanning} />} />
                {onChooseOther && <Button label={t("source.chooseOther")} variant="secondary" onPress={onChooseOther} style={{ flex: 1 }} />}
              </View>
            </View>
          ) : (
            <>
              <View style={{ flexDirection: "row", gap: 8, alignItems: "center", padding: 12, borderRadius: radius.inset, backgroundColor: c.liveSoft }}>
                <Icon name="checkCircle" size={18} color={c.live} active />
                <Txt variant="bodyStrong" tone="live" style={{ flex: 1 }}>
                  {t("source.passed")}
                </Txt>
                {warns > 0 && (
                  <Txt variant="caption" tone="warn">
                    {t("source.warnings", { n: warns })}
                  </Txt>
                )}
              </View>
              {report.stack.length > 0 && (
                <View style={{ gap: 8 }}>
                  <Txt variant="caption" tone="fgMuted" style={{ fontFamily: "DMSans_700Bold" }}>
                    {t("source.detectedStack")}
                  </Txt>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                    {report.stack.map((s, i) => (
                      <Tag key={s} label={s} index={i} />
                    ))}
                  </View>
                </View>
              )}
              <Txt variant="caption" tone="fgMuted" style={{ fontFamily: "DMSans_700Bold" }}>
                {t("source.preview")} · {t("source.files", { n: report.fileCount, size: formatBytes(report.sizeBytes) })}
              </Txt>
              <FileTree nodes={report.files} />
            </>
          )}
        </Animated.View>
      )}
    </View>
  );
}

/** True once the checklist's staggered reveal has finished, so the outcome never appears ahead of its checks. */
function useSettledAfter(report: ScanReport | null, ms: number): boolean {
  const [settled, setSettled] = useState(!!report);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      if (report) return;
    }
    setSettled(false);
    if (!report) return;
    const id = setTimeout(() => setSettled(true), ms);
    return () => clearTimeout(id);
  }, [report, ms]);
  return settled;
}

/** Zip: real upload is web-only (§10.10); on a phone the creator gets the link emailed and the draft is kept. */
function ZipSource({ value, onChange, onStack }: { value: Extract<SourceChoice, { kind: "zip" }>; onChange: Props["onChange"]; onStack: Props["onStack"] }) {
  const { c } = useTheme();
  const t = useT();
  const upload = useUploadZip();
  const progress = useSharedValue(value.report ? 1 : 0);
  const bar = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  const start = () => {
    progress.value = 0;
    progress.value = withTiming(0.92, { duration: 2200, easing: Easing.out(Easing.quad), reduceMotion: ReduceMotion.System });
    onChange({ kind: "zip", fileName: "my-app.zip", report: null });
    upload.mutate(undefined, {
      onSuccess: ({ fileName, report }) => {
        progress.value = withTiming(1, { duration: 200 });
        haptic(isBlocking(report.checks) ? "warning" : "success");
        onChange({ kind: "zip", fileName, report });
        if (!isBlocking(report.checks)) onStack?.(report.stack);
      },
    });
  };

  return (
    <>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: radius.row, backgroundColor: c.bgMuted }}>
        <Icon name="package" size={20} color={c.fg} active />
        <Txt variant="bodyStrong" style={{ flex: 1 }}>
          {value.fileName ?? t("source.zip")}
        </Txt>
        <PressableScale onPress={() => onChange(null)} hitSlop={8}>
          <Txt variant="caption" tone="accent" style={{ fontFamily: "DMSans_700Bold" }}>
            {t("source.change")}
          </Txt>
        </PressableScale>
      </View>
      {Platform.OS !== "web" ? (
        <Animated.View entering={enterAt(0)} style={{ gap: 12, padding: 14, borderRadius: radius.inset, backgroundColor: c.pendingSoft }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Icon name="laptop" size={20} color={c.pending} active loop="breathe" />
            <Txt style={{ flex: 1 }}>{t("source.zipMobile")}</Txt>
          </View>
          <Button label={t("source.emailLink")} variant="secondary" icon={<Icon name="mail" size={17} color={c.fg} />} onPress={() => toast(t("source.emailed"))} />
        </Animated.View>
      ) : !value.fileName ? (
        <Button label={t("source.chooseZip")} icon={<Icon name="download" size={18} color={c.accentFg} />} onPress={start} />
      ) : (
        <>
          {!value.report && (
            <View style={{ gap: 6 }}>
              <Txt variant="caption" tone="fgSubtle">
                {t("source.uploading")}
              </Txt>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: c.bgMuted, overflow: "hidden" }}>
                <Animated.View style={[{ height: 6, borderRadius: 3, backgroundColor: c.accent }, bar]} />
              </View>
            </View>
          )}
          <ScanResult report={value.report} scanning={upload.isPending} onRescan={start} />
        </>
      )}
    </>
  );
}
