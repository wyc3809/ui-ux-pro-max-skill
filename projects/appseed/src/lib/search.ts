/** Lower-cases, strips accents and collapses whitespace so "  Expo  SUPABASE" == "expo supabase". */
export function normalize(q: string): string {
  return q
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function tokens(q: string): string[] {
  const n = normalize(q);
  return n ? n.split(" ") : [];
}

/** All tokens must appear somewhere in the haystack fields. */
export function matches(query: string, fields: string[]): boolean {
  const t = tokens(query);
  if (t.length === 0) return true;
  const hay = normalize(fields.join(" "));
  return t.every((tok) => hay.includes(tok));
}

export type Segment = { text: string; hit: boolean };

/** Splits `text` into hit / non-hit segments for accent-bold highlighting (§5). */
export function highlight(text: string, query: string): Segment[] {
  const t = tokens(query).filter(Boolean);
  if (t.length === 0) return [{ text, hit: false }];
  const lower = text.toLowerCase();
  const marks = new Array<boolean>(text.length).fill(false);
  for (const tok of t) {
    let from = 0;
    for (;;) {
      const i = lower.indexOf(tok, from);
      if (i < 0) break;
      for (let k = i; k < i + tok.length; k++) marks[k] = true;
      from = i + tok.length;
    }
  }
  const out: Segment[] = [];
  for (let i = 0; i < text.length; i++) {
    const hit = marks[i] ?? false;
    const last = out[out.length - 1];
    if (last && last.hit === hit) last.text += text[i];
    else out.push({ text: text[i] ?? "", hit });
  }
  return out;
}

export function pushHistory(list: string[], q: string, max = 8): string[] {
  const n = q.trim();
  if (!n) return list;
  return [n, ...list.filter((x) => normalize(x) !== normalize(n))].slice(0, max);
}
