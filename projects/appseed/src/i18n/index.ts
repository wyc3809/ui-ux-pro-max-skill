import { en } from "./en";
import { zhHant, type Dict } from "./zh-Hant";
import { useSettings } from "@/store/settings";

export type Locale = "zh-Hant" | "en";
export const dictionaries: Record<Locale, Dict> = { "zh-Hant": zhHant, en };

type Leaves<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];

export type TKey = Leaves<Dict>;

export function translate(dict: Dict, key: TKey, vars?: Record<string, string | number>): string {
  const raw = key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], dict) as string;
  return vars ? raw.replace(/\{(\w+)\}/g, (_, v: string) => String(vars[v] ?? `{${v}}`)) : raw;
}

export function useT() {
  const locale = useSettings((s) => s.locale);
  const dict = dictionaries[locale];
  return Object.assign((key: TKey, vars?: Record<string, string | number>) => translate(dict, key, vars), { locale });
}
