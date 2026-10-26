/** §8: tabs to the right enter from the right (+offset), tabs to the left from the left (−offset). */
export function tabEnterOffset(prevIndex: number, nextIndex: number, offset: number): number {
  if (prevIndex === nextIndex) return 0;
  return nextIndex > prevIndex ? offset : -offset;
}

/** §8: more than 3 items arriving at once (first load, sync) skip per-item animation. */
export function shouldAnimateItems(newItemCount: number, reducedMotion: boolean): boolean {
  return !reducedMotion && newItemCount > 0 && newItemCount <= 3;
}

/** Delay for the n-th section of a page: first is immediate, 2nd and 3rd are staggered, rest share the 3rd's delay. */
export function staggerDelay(index: number, step: number): number {
  return Math.min(Math.max(index, 0), 2) * step;
}
