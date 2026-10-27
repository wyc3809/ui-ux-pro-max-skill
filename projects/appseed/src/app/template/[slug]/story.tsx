import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import Animated, { useAnimatedRef, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, scrollTo } from "react-native-reanimated";
import { scheduleOnUI } from "react-native-worklets";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useOwned, useTemplate } from "@/api/queries";
import { StoryStep } from "@/components/template/StoryStep";
import { Button } from "@/components/ui/Button";
import { HeaderButton } from "@/components/ui/HeaderButton";
import { Icon } from "@/components/ui/Icon";
import { ListRow } from "@/components/ui/ListRow";
import { Sheet } from "@/components/ui/Sheet";
import { Skeleton } from "@/components/ui/Skeleton";
import { Txt } from "@/components/ui/Txt";
import { useT } from "@/i18n";
import { mmkv } from "@/store/storage";

import { useTheme } from "@/theme/ThemeProvider";
import { space } from "@/theme/tokens";
import { Reveal } from "@/components/ui/Reveal";

/** Long-form reader (§10.4): progress bar, contents sheet, remembers reading position. */
export default function StoryScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: tpl } = useTemplate(slug);
  const owned = useOwned(slug);
  const { c } = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const ref = useAnimatedRef<Animated.ScrollView>();
  const offsets = useRef<number[]>([]);
  const [toc, setToc] = useState(false);
  const progress = useSharedValue(0);
  const posKey = `story-pos:${slug}`;
  const lastSaved = useRef(0);

  const onScroll = useAnimatedScrollHandler((e) => {
    const max = Math.max(1, e.contentSize.height - e.layoutMeasurement.height);
    progress.value = Math.min(1, Math.max(0, e.contentOffset.y / max));
  });
  const bar = useAnimatedStyle(() => ({ transform: [{ scaleX: progress.value }] }));

  useEffect(() => {
    // Restore the last reading position once content has laid out.
    const y = Number(mmkv.getString(posKey) ?? 0);
    if (!tpl || y <= 0) return;
    const id = setTimeout(() => scheduleOnUI(() => scrollTo(ref, 0, y, false)), 60);
    return () => clearTimeout(id);
  }, [tpl, posKey, ref]);

  const jump = (i: number) => {
    setToc(false);
    const y = offsets.current[i] ?? 0;
    scheduleOnUI(() => scrollTo(ref, 0, Math.max(0, y - 12), true));
  };

  const visible = owned ? tpl?.story.length ?? 0 : tpl?.freePreviewSteps ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ paddingTop: insets.top, backgroundColor: c.bg, zIndex: 2 }}>
        <View style={{ height: 52, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: space.gutter }}>
          <HeaderButton icon="chevronLeft" motion="nudge" label={t("a11y.backBtn")} onPress={() => router.back()} />
          <Txt variant="section" numberOfLines={1} style={{ flex: 1, textAlign: "center" }}>
            {t("template.story")}
          </Txt>
          <HeaderButton icon="list" motion="bounce" label={t("template.toc")} onPress={() => setToc(true)} />
        </View>
        <View style={{ height: 3, backgroundColor: c.bgMuted }}>
          <Animated.View style={[{ height: 3, backgroundColor: c.accent, transformOrigin: "left" }, bar]} />
        </View>
      </View>

      <Animated.ScrollView
        ref={ref}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          const y = Math.round(e.nativeEvent.contentOffset.y);
          if (Math.abs(y - lastSaved.current) > 40) {
            lastSaved.current = y;
            mmkv.set(posKey, String(y));
          }
        }}
        contentContainerStyle={{ padding: space.gutter + 4, paddingBottom: insets.bottom + 48 }}
      >
        {!tpl ? (
          <View style={{ gap: 12 }}>
            <Skeleton width="80%" height={28} />
            <Skeleton height={16} />
            <Skeleton height={16} />
            <Skeleton width="60%" height={16} />
          </View>
        ) : (
          <>
            <Reveal style={{ gap: 6, marginBottom: 28 }}>
              <Txt variant="eyebrow" tone="fgSubtle">
                {t("template.story")}
              </Txt>
              <Txt variant="largeTitle" style={{ fontSize: 24, lineHeight: 32 }}>
                {tpl.name}
              </Txt>
            </Reveal>
            {tpl.story.slice(0, visible).map((s, i) => (
              <Reveal key={i} index={i + 1} onLayout={(e) => (offsets.current[i] = e.nativeEvent.layout.y)}>
                <StoryStep step={s} n={i + 1} last={i === visible - 1} longform />
              </Reveal>
            ))}
            {!owned && tpl.story.length > visible && (
              <Reveal index={2} style={{ marginTop: 28, padding: 20, borderRadius: 22, backgroundColor: c.accentSoft, alignItems: "center", gap: 12 }}>
                <Icon name="lock" size={24} color={c.accent} active motion="wiggle" loop="breathe" />
                <Txt variant="bodyStrong" style={{ textAlign: "center" }}>
                  {t("template.unlockAll", { n: tpl.story.length })}
                </Txt>
                <Button label={t("cta.buy")} onPress={() => router.back()} />
              </Reveal>
            )}
          </>
        )}
      </Animated.ScrollView>

      <Sheet open={toc} onClose={() => setToc(false)} title={t("template.toc")}>
        {tpl?.story.map((s, i) => (
          <ListRow key={i} title={`${i + 1}. ${s.title}`} onPress={i < visible ? () => jump(i) : undefined} trailing={i >= visible ? <Icon name="lock" size={15} color={c.fgSubtle} enterDelay={i * 40} /> : undefined} />
        ))}
      </Sheet>
    </View>
  );
}
