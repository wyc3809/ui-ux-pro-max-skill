import { Platform } from "react-native";

/**
 * In-app purchases through RevenueCat (CLAUDE.md Payments). Templates and prompts are sold with fixed price
 * tiers (consumable products, e.g. tier_158); the server decides which listing a purchase was for from the
 * purchase intent written just before buying, and grants access from the store webhook. So this module only
 * talks to the store: it never unlocks anything itself.
 * Needs EXPO_PUBLIC_REVENUECAT_IOS_KEY / _ANDROID_KEY and a development build (not Expo Go, not the web).
 */
type Purchases = typeof import("react-native-purchases").default;

let configured: Purchases | null = null;

function sdk(): Purchases | null {
  if (configured) return configured;
  if (Platform.OS !== "ios" && Platform.OS !== "android") return null;
  const key = Platform.OS === "ios" ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
  if (!key) return null;
  const P = (require("react-native-purchases") as { default: Purchases }).default;
  P.configure({ apiKey: key });
  configured = P;
  return P;
}

export const iapAvailable = () => sdk() != null;

/** Ties store purchases to the AppSeed account, so the webhook's app_user_id is the buyer's user id. */
export async function iapLogIn(userId: string) {
  await sdk()?.logIn(userId);
}
export async function iapLogOut() {
  await sdk()
    ?.logOut()
    .catch(() => {});
}

/** Buys one price tier. Resolves "cancelled" when the person backs out; throws on a real failure. */
export async function buyTier(productId: string): Promise<"purchased" | "cancelled"> {
  const P = sdk();
  if (!P) throw new Error("paymentsNotConfigured");
  const [product] = await P.getProducts([productId], P.PRODUCT_CATEGORY.NON_SUBSCRIPTION);
  if (!product) throw new Error("productNotFound");
  try {
    await P.purchaseStoreProduct(product);
    return "purchased";
  } catch (e) {
    if ((e as { userCancelled?: boolean }).userCancelled) return "cancelled";
    throw e;
  }
}

/** Sends any receipts the server has not seen yet (Restore purchases). */
export async function syncStore() {
  await sdk()
    ?.syncPurchases()
    .catch(() => {});
}

/**
 * Waits until the server lists the item as owned: the store webhook usually lands within seconds. Gives up
 * after `tries`, leaving the purchase to appear on its own (or via Restore purchases).
 */
export async function waitForOwnership(owns: () => Promise<boolean>, tries = 10, delayMs = 1500, sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))) {
  for (let i = 0; i < tries; i++) {
    if (await owns()) return true;
    await sleep(delayMs);
  }
  return false;
}
