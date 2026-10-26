import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  useBottomSheetTimingConfigs,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { useCallback, useEffect, useRef } from "react";
import { AccessibilityInfo, BackHandler, findNodeHandle, View, type TextInstance } from "react-native";
import { ReduceMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { haptic } from "@/lib/haptic";
import { useTheme } from "@/theme/ThemeProvider";
import { motion, radius, space } from "@/theme/tokens";
import { Txt } from "./Txt";

export type SheetProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
};

/**
 * The only overlay in the app (§7). Title and footer are pinned, only the middle scrolls.
 * Closes on backdrop tap, swipe down, and Android back (which always closes the top sheet first).
 * Web uses Sheet.web.tsx (same API and motion) because the gorhom modal portal does not mount on react-native-web.
 */
export function Sheet({ open, onClose, title, footer, children }: SheetProps) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const ref = useRef<BottomSheetModal>(null);
  const titleRef = useRef<TextInstance>(null);
  const animationConfigs = useBottomSheetTimingConfigs({ duration: motion.sheet.duration, easing: motion.sheet.easing, reduceMotion: ReduceMotion.System });

  useEffect(() => {
    if (open) {
      haptic("tap");
      ref.current?.present();
    } else ref.current?.dismiss();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [open, onClose]);

  const backdrop = useCallback(
    (p: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...p} appearsOnIndex={0} disappearsOnIndex={-1} opacity={1} style={[p.style, { backgroundColor: c.overlay }]} pressBehavior="close" />
    ),
    [c.overlay],
  );

  return (
    <BottomSheetModal
      ref={ref}
      onDismiss={onClose}
      onChange={(i) => {
        // Move screen-reader focus into the sheet once it settles (§16).
        if (i >= 0 && titleRef.current) {
          const node = findNodeHandle(titleRef.current);
          if (node) AccessibilityInfo.setAccessibilityFocus(node);
        }
      }}
      enableDynamicSizing
      maxDynamicContentSize={720}
      animationConfigs={animationConfigs}
      backdropComponent={backdrop}
      backgroundStyle={{ backgroundColor: c.bgElevated, borderTopLeftRadius: radius.hero, borderTopRightRadius: radius.hero }}
      handleIndicatorStyle={{ backgroundColor: c.fgSubtle, opacity: 0.4, width: 40 }}
    >
      {title ? (
        <View style={{ paddingHorizontal: space.gutter + 4, paddingBottom: 12, paddingTop: 4 }}>
          <Txt ref={titleRef} variant="section" accessibilityRole="header" style={{ fontSize: 19, fontFamily: "DMSans_800ExtraBold" }}>
            {title}
          </Txt>
        </View>
      ) : null}
      <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: space.gutter + 4, paddingBottom: footer ? 12 : insets.bottom + 20, gap: 12 }}>
        {children}
      </BottomSheetScrollView>
      {footer ? (
        <View style={{ paddingHorizontal: space.gutter + 4, paddingTop: 12, paddingBottom: insets.bottom + 12, borderTopWidth: 1, borderTopColor: c.border, gap: 10 }}>{footer}</View>
      ) : null}
    </BottomSheetModal>
  );
}
