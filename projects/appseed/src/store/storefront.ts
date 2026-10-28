import { getLocales } from "expo-localization";

/**
 * The store region deciding external-link rules. Production reads the real storefront from StoreKit /
 * Play Billing through RevenueCat; until then the device region stands in (it usually matches).
 */
export function useStorefront(): string | null {
  return getLocales()[0]?.regionCode ?? null;
}
