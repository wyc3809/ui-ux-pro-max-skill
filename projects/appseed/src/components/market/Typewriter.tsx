import { useEffect, useState } from "react";
import { useReducedMotion } from "react-native-reanimated";
import { Txt, type TxtVariant } from "@/components/ui/Txt";

/**
 * Reveals text a few characters per frame — used when a purchased prompt unlocks, so the
 * hidden lines visibly "type themselves" in. Reduced motion shows everything at once.
 */
export function Typewriter({ text, from = 0, variant = "code", play = true }: { text: string; from?: number; variant?: TxtVariant; play?: boolean }) {
  const reduced = useReducedMotion();
  const [n, setN] = useState(play && !reduced ? from : text.length);
  useEffect(() => {
    if (!play || reduced) {
      setN(text.length);
      return;
    }
    setN(from);
    let raf = 0;
    const step = Math.max(2, Math.ceil((text.length - from) / 60));
    const tick = () => {
      setN((v) => {
        const next = Math.min(text.length, v + step);
        if (next < text.length) raf = requestAnimationFrame(tick);
        return next;
      });
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, from, play, reduced]);
  return (
    <Txt variant={variant} selectable accessibilityLabel={text}>
      {text.slice(0, n)}
      {n < text.length ? "▍" : ""}
    </Txt>
  );
}
