import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { Icon } from "@/components/ui/Icon";
import { PressableScale } from "@/components/ui/PressableScale";
import { RowDivider } from "@/components/ui/ListRow";
import { Sheet } from "@/components/ui/Sheet";
import { Txt } from "@/components/ui/Txt";
import { useT } from "@/i18n";
import { APPLE_CATEGORIES, isCategory, isVibe, VIBE_CATEGORIES, type CategoryKey } from "@/lib/categories";
import { useTheme } from "@/theme/ThemeProvider";
import { font, gap, hit, radius, space } from "@/theme/tokens";
import { CATEGORY_ICON } from "./categoryIcons";


/** The rounded icon tile: vibe coding categories in the brand tint, App Store categories neutral. */
export function CategoryTile({ k, size = 32, active = false }: { k: CategoryKey; size?: number; active?: boolean }) {
  const { c } = useTheme();
  const vibe = isVibe(k);
  return (
    <View style={{ width: size, height: size, borderRadius: size >= 44 ? radius.control : 8, backgroundColor: vibe ? c.accentSoft : c.bgMuted, alignItems: "center", justifyContent: "center" }}>
      <Icon name={CATEGORY_ICON[k]} size={Math.round(size * 0.53)} color={vibe ? c.accent : c.fg} active={active} />
    </View>
  );
}

/** A tappable category row that opens the category's page (its leaderboard and top charts). */
export function CategoryRow({ k, value, onPress }: { k: CategoryKey; value?: string; onPress?: () => void }) {
  const { c } = useTheme();
  const t = useT();
  const label = t(`category.${k}`);
  return (
    <PressableScale onPress={onPress ?? (() => router.push(`/category/${k}`))} scaleTo={0.985} hapticKind="selection" accessibilityRole="button" accessibilityLabel={value ? `${label}, ${value}` : label} style={{ borderRadius: radius.row }}>
      <View style={{ minHeight: hit + gap.sm, flexDirection: "row", alignItems: "center", gap: gap.md, paddingHorizontal: space.rowPadX, paddingVertical: space.rowPadY }}>
        <CategoryTile k={k} />
        <Txt variant="bodyStrong" style={{ flex: 1 }}>
          {label}
        </Txt>
        {value ? <Txt tone="fgMuted">{value}</Txt> : null}
        <Icon name="chevronRight" size={17} color={c.fgSubtle} enter={false} />
      </View>
    </PressableScale>
  );
}

/** A small link to a listing's category, shown on listing pages (like the category line on an App Store page). */
export function CategoryLink({ k }: { k: CategoryKey }) {
  const { c } = useTheme();
  const t = useT();
  return (
    <PressableScale onPress={() => router.push(`/category/${k}`)} hapticKind="selection" accessibilityRole="link" accessibilityLabel={t(`category.${k}`)} hitSlop={gap.sm} style={{ flexDirection: "row", alignItems: "center", gap: gap.xs, paddingHorizontal: gap.md, height: 26, borderRadius: radius.chip, backgroundColor: isVibe(k) ? c.accentSoft : c.bgMuted }}>
      <Icon name={CATEGORY_ICON[k]} size={13} color={isVibe(k) ? c.accent : c.fgMuted} enter={false} />
      <Txt variant="caption" tone={isVibe(k) ? "accent" : "fgMuted"} style={{ fontFamily: font.semibold }}>
        {t(`category.${k}`)}
      </Txt>
    </PressableScale>
  );
}

/** A listing's primary and secondary category as links, so its category boards are one tap away. */
export function CategoryLinks({ item }: { item: { category?: string; secondaryCategory?: string | null } }) {
  const keys = [item.category, item.secondaryCategory].filter(isCategory);
  if (keys.length === 0) return null;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: gap.sm }}>
      {keys.map((k) => (
        <CategoryLink key={k} k={k} />
      ))}
    </View>
  );
}

/**
 * Primary (required) and secondary (optional) category, chosen from a sheet that lists the vibe coding categories
 * first and then the App Store ones, the same grouping as the categories page.
 */
export function CategoryPicker({ value, secondary, onChange }: { value: CategoryKey | null; secondary: CategoryKey | null; onChange: (primary: CategoryKey | null, secondary: CategoryKey | null) => void }) {
  const t = useT();
  const [open, setOpen] = useState<"primary" | "secondary" | null>(null);
  const pick = (k: CategoryKey | null) => {
    if (open === "primary") onChange(k, secondary === k ? null : secondary);
    else onChange(value, k);
    setOpen(null);
  };
  return (
    <View style={{ gap: gap.md }}>
      <PickerField label={t("categories.primary")} k={value} onPress={() => setOpen("primary")} />
      <PickerField label={t("categories.secondary")} k={secondary} empty={t("categories.noSecondary")} onPress={() => setOpen("secondary")} />
      <Txt variant="caption" tone="fgSubtle">
        {t("categories.pickerHint")}
      </Txt>
      <Sheet open={open != null} onClose={() => setOpen(null)} title={open === "secondary" ? t("categories.secondary") : t("categories.primary")}>
        {open === "secondary" && <Choice label={t("categories.noSecondary")} selected={!secondary} onPress={() => pick(null)} />}
        {(
          [
            ["vibe", VIBE_CATEGORIES],
            ["apple", APPLE_CATEGORIES],
          ] as const
        ).map(([group, keys]) => (
          <View key={group} style={{ gap: gap.xs }}>
            <Txt variant="eyebrow" tone="fgSubtle" style={{ paddingTop: gap.sm }}>
              {t(`categories.${group}`)}
            </Txt>
            {keys
              .filter((k) => open !== "secondary" || k !== value)
              .map((k) => (
                <Choice key={k} k={k} label={t(`category.${k}`)} selected={(open === "secondary" ? secondary : value) === k} onPress={() => pick(k)} />
              ))}
          </View>
        ))}
      </Sheet>
    </View>
  );
}

function PickerField({ label, k, empty, onPress }: { label: string; k: CategoryKey | null; empty?: string; onPress: () => void }) {
  const { c } = useTheme();
  const t = useT();
  const shown = k ? t(`category.${k}`) : (empty ?? t("categories.choose"));
  return (
    <View style={{ gap: gap.sm }}>
      <Txt variant="caption" tone="fgMuted" style={{ fontFamily: font.semibold }}>
        {label}
      </Txt>
      <PressableScale onPress={onPress} scaleTo={0.985} hapticKind="selection" accessibilityRole="button" accessibilityLabel={`${label}: ${shown}`} style={{ minHeight: 48, flexDirection: "row", alignItems: "center", gap: gap.md, paddingHorizontal: gap.lg, paddingVertical: gap.sm, borderRadius: radius.control, backgroundColor: c.bgMuted }}>
        {k ? <CategoryTile k={k} size={28} /> : null}
        <Txt variant="body" tone={k ? "fg" : "fgSubtle"} style={{ flex: 1 }}>
          {shown}
        </Txt>
        <Icon name="chevronDown" size={16} color={c.fgSubtle} enter={false} />
      </PressableScale>
    </View>
  );
}

function Choice({ k, label, selected, onPress }: { k?: CategoryKey; label: string; selected: boolean; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <>
      <PressableScale onPress={onPress} scaleTo={0.985} hapticKind="selection" accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={label} style={{ minHeight: hit, flexDirection: "row", alignItems: "center", gap: gap.md, paddingVertical: gap.sm, borderRadius: radius.control }}>
        {k ? <CategoryTile k={k} size={28} /> : <View style={{ width: 28 }} />}
        <Txt variant={selected ? "bodyStrong" : "body"} style={{ flex: 1 }}>
          {label}
        </Txt>
        {selected ? <Icon name="check" size={18} color={c.accent} active /> : null}
      </PressableScale>
      <RowDivider />
    </>
  );
}
