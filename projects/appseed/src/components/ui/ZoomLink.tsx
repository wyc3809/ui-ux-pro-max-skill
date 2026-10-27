import { Link, router, type Href } from "expo-router";
import { Platform } from "react-native";
import { PressableScale } from "./PressableScale";

type Props = Omit<React.ComponentProps<typeof PressableScale>, "onPress"> & { href: Href; onOpen?: () => void };

/**
 * A pressable card that opens `href` with the iOS 18 zoom transition: the card's `ZoomSource` (its cover)
 * grows into the detail page's `ZoomTarget`, and swiping back shrinks it home. Android and web keep the stack
 * push (Link's web Slot breaks the animated pressable's style, so it is iOS only).
 */
export function ZoomLink({ href, onOpen, children, ...rest }: Props) {
  if (Platform.OS !== "ios") {
    return (
      <PressableScale
        {...rest}
        onPress={() => {
          onOpen?.();
          router.push(href);
        }}
      >
        {children}
      </PressableScale>
    );
  }
  return (
    <Link href={href} asChild onPress={onOpen}>
      <PressableScale {...rest}>{children}</PressableScale>
    </Link>
  );
}

/** Wraps the single element on a card that zooms (one child only). */
export const ZoomSource = Link.AppleZoom;
/** Wraps the element on the detail page the card zooms into (one child only). */
export const ZoomTarget = Link.AppleZoomTarget;
