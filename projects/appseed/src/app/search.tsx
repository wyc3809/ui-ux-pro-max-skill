import { FlashList } from "@shopify/flash-list";
import { router } from "expo-router";
import { ChevronDown, Clock, SearchX, SlidersHorizontal } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { ScrollView, View, type TextInputInstance } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { SearchParams } from "@/api/mockServer";
import { useSearch } from "@/api/queries";
import type { Platform as Plat } from "@/api/types";
import { TemplateRow } from "@/components/template/TemplateCard";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { PressableScale } from "@/components/ui/PressableScale";
import { SearchInput } from "@/components/ui/SearchBar";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Sheet } from "@/components/ui/Sheet";
import { Txt } from "@/components/ui/Txt";
import { useT } from "@/i18n";
import { useHistory } from "@/store/history";
import { crossfadeIn, rowIn, rowOut, reorder } from "@/theme/animations";
import { useTheme } from "@/theme/ThemeProvider";
import { space } from "@/theme/tokens";

type Filters = Required<Omit<SearchParams, "q" | "category">>;
const DEFAULT: Filters = { price: "any", platform: "any", sort: "relevance" };

export default function SearchScreen() {
  const { c } = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const input = useRef<TextInputInstance>(null);
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [filters, setFilters] = useState<Filters>(DEFAULT);
  const [sheet, setSheet] = useState(false);
  const history = useHistory();
  const { data } = useSearch({ q: debounced, ...filters });

  useEffect(() => {
    // Raise the keyboard once the push transition settles so the two motions don't fight.
    const id = setTimeout(() => input.current?.focus(), 260);
    return () => clearTimeout(id);
  }, []);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(q), 160);
    return () => clearTimeout(id);
  }, [q]);

  const active = filters.price !== "any" || filters.platform !== "any" || filters.sort !== "relevance";
  const showHistory = q.trim() === "" && history.queries.length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + 6 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: space.gutter }}>
        <SearchInput ref={input} value={q} onChangeText={setQ} placeholder={t("explore.searchPlaceholder")} onSubmit={() => history.add(q)} />
        <PressableScale onPress={() => router.back()} style={{ height: 44, justifyContent: "center" }} accessibilityLabel={t("common.cancel")}>
          <Txt variant="bodyStrong" tone="accent" style={{ fontSize: 15 }}>
            {t("common.cancel")}
          </Txt>
        </PressableScale>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 8, paddingHorizontal: space.gutter, paddingVertical: 12 }} style={{ flexGrow: 0 }}>
        <Chip label={t("search.filters")} selected={active} onPress={() => setSheet(true)} trailing={<SlidersHorizontal size={14} color={active ? c.bg : c.fg} />} />
        <Chip label={`${t("search.price")} · ${filters.price === "any" ? t("search.any") : filters.price === "free" ? t("common.free") : t("search.paid")}`} onPress={() => setSheet(true)} trailing={<ChevronDown size={14} color={c.fgSubtle} />} />
        <Chip label={`${t("search.platform")} · ${filters.platform === "any" ? t("search.any") : filters.platform}`} onPress={() => setSheet(true)} trailing={<ChevronDown size={14} color={c.fgSubtle} />} />
        <Chip label={`${t("search.sort")} · ${t(`search.sort${cap(filters.sort)}`)}`} onPress={() => setSheet(true)} trailing={<ChevronDown size={14} color={c.fgSubtle} />} />
      </ScrollView>

      {showHistory ? (
        <Animated.View entering={crossfadeIn} style={{ paddingHorizontal: space.gutter, gap: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", height: 36 }}>
            <Txt variant="eyebrow" tone="fgSubtle">
              {t("search.recent")}
            </Txt>
            <PressableScale onPress={history.clear} hitSlop={8}>
              <Txt variant="caption" tone="accent" style={{ fontFamily: "DMSans_700Bold" }}>
                {t("search.clear")}
              </Txt>
            </PressableScale>
          </View>
          {history.queries.map((h) => (
            <Animated.View key={h} entering={rowIn} exiting={rowOut} layout={reorder}>
              <PressableScale onPress={() => setQ(h)} scaleTo={0.99} style={{ flexDirection: "row", alignItems: "center", gap: 10, height: 44 }}>
                <Clock size={16} color={c.fgSubtle} />
                <Txt>{h}</Txt>
              </PressableScale>
            </Animated.View>
          ))}
        </Animated.View>
      ) : (
        <View style={{ flex: 1 }}>
          {data && data.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title={t("search.emptyTitle")}
              body={t("search.emptyBody")}
              action={{
                label: t("search.clearFilters"),
                onPress: () => {
                  setFilters(DEFAULT);
                  setQ("");
                },
              }}
            />
          ) : (
            <FlashList
              data={data ?? []}
              keyExtractor={(x) => x.slug}
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
              ListHeaderComponent={
                data ? (
                  <Txt variant="caption" tone="fgSubtle" style={{ paddingHorizontal: space.gutter, paddingBottom: 8 }}>
                    {t("search.results", { n: data.length })}
                  </Txt>
                ) : null
              }
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
              renderItem={({ item }) => (
<TemplateRow t={item} query={debounced} onOpen={() => history.add(q)} />
              )}
            />
          )}
        </View>
      )}

      <FilterSheet open={sheet} value={filters} onClose={() => setSheet(false)} onApply={setFilters} />
    </View>
  );
}

const cap = (s: string) => (s[0]!.toUpperCase() + s.slice(1)) as "Relevance" | "Newest" | "Rating" | "Sales";

function FilterSheet({ open, value, onClose, onApply }: { open: boolean; value: Filters; onClose: () => void; onApply: (f: Filters) => void }) {
  const t = useT();
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t("search.filters")}
      footer={
        <Button
          label={t("search.apply")}
          onPress={() => {
            onApply(draft);
            onClose();
          }}
        />
      }
    >
      <Group label={t("search.price")}>
        <SegmentedControl
          value={draft.price}
          onChange={(price) => setDraft({ ...draft, price })}
          options={[
            { value: "any", label: t("search.any") },
            { value: "free", label: t("common.free") },
            { value: "paid", label: t("search.paid") },
          ]}
        />
      </Group>
      <Group label={t("search.platform")}>
        <SegmentedControl<Plat | "any">
          value={draft.platform}
          onChange={(platform) => setDraft({ ...draft, platform })}
          options={[
            { value: "any", label: t("search.any") },
            { value: "iOS", label: "iOS" },
            { value: "Android", label: "Android" },
            { value: "Web", label: "Web" },
          ]}
        />
      </Group>
      <Group label={t("search.sort")}>
        <SegmentedControl
          value={draft.sort}
          onChange={(sort) => setDraft({ ...draft, sort })}
          options={(["relevance", "newest", "rating", "sales"] as const).map((s) => ({ value: s, label: t(`search.sort${cap(s)}`) }))}
        />
      </Group>
    </Sheet>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8, marginBottom: 6 }}>
      <Txt variant="eyebrow" tone="fgSubtle">
        {label}
      </Txt>
      {children}
    </View>
  );
}
