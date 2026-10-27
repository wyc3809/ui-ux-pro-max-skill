import * as AppleAuthentication from "expo-apple-authentication";
import { Platform } from "react-native";

export type AppleCredential = { sub: string; email: string | null; name: string | null; identityToken: string | null; demo: boolean };

/**
 * iOS uses the system Sign in with Apple sheet. Elsewhere (Android, web, simulators without it)
 * the real app would use Apple's web flow through Supabase; until that exists this returns a demo
 * credential so the rest of the flow can be exercised. Returns null when the user cancels.
 */
export async function signInWithApple(): Promise<AppleCredential | null> {
  if (Platform.OS === "ios" && (await AppleAuthentication.isAvailableAsync().catch(() => false))) {
    try {
      const c = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
      });
      const name = c.fullName ? AppleAuthentication.formatFullName(c.fullName).trim() || null : null;
      return { sub: c.user, email: c.email, name, identityToken: c.identityToken, demo: false };
    } catch (e) {
      if ((e as { code?: string }).code === "ERR_REQUEST_CANCELED") return null;
      throw e;
    }
  }
  await new Promise((r) => setTimeout(r, 700));
  // Apple only shares name/email on the first sign-in, and often as a private relay address.
  return { sub: "demo-apple-001", email: "x7k2pq@privaterelay.appleid.com", name: null, identityToken: null, demo: true };
}
