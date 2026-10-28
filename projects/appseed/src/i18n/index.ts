import { en } from "./en";
import { zhHant, type Dict } from "./zh-Hant";
import { useSettings } from "@/store/settings";

export type Locale = "zh-Hant" | "en";
export const dictionaries: Record<Locale, Dict> = { "zh-Hant": zhHant, en };

type Leaves<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];

export type TKey = Leaves<Dict>;

const lookup = (dict: Dict, key: string): unknown => key.split(".").reduce<unknown>((o, k) => (o == null ? undefined : (o as Record<string, unknown>)[k]), dict);

/** Whether a dynamically built key (e.g. from a server error code) exists. */
export const hasKey = (dict: Dict, key: string): key is TKey => typeof lookup(dict, key) === "string";

/** Missing keys fall back to the key itself instead of crashing, so a typo shows up on screen, not as a crash. */
export function translate(dict: Dict, key: TKey, vars?: Record<string, string | number>): string {
  const found = lookup(dict, key);
  const raw = typeof found === "string" ? found : key;
  return vars ? raw.replace(/\{(\w+)\}/g, (_, v: string) => String(vars[v] ?? `{${v}}`)) : raw;
}

export function useT() {
  const locale = useSettings((s) => s.locale);
  const dict = dictionaries[locale];
  const t = (key: TKey, vars?: Record<string, string | number>) => translate(dict, key, vars);
  /**
   * Message for an error code from the server: the first candidate key that exists, else a generic
   * "try again" message. Never shows an undefined or raw code.
   */
  const error = (code: string, prefixes: string[], vars?: Record<string, string | number>) => {
    const key = prefixes.map((p) => `${p}.${code}`).find((k) => hasKey(dict, k));
    return key ? translate(dict, key as TKey, vars) : translate(dict, "common.tryAgain");
  };
  return Object.assign(t, { locale, error });
}
