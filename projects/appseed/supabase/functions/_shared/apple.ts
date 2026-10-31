/**
 * Sign in with Apple token revocation (App Review 5.1.1(v)): deleting an account must also revoke the Apple
 * tokens. The app sends a fresh authorization code; the server swaps it for a refresh token and revokes it,
 * authenticating with an ES256 client secret signed by the team's Sign in with Apple key.
 */
export type AppleConfig = { teamId: string; keyId: string; clientId: string; privateKey: string };

const b64url = (bytes: Uint8Array | string) =>
  btoa(typeof bytes === "string" ? bytes : String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

/** ES256 JWT; WebCrypto's ECDSA signature is already the raw r||s form JWS expects. */
export async function appleClientSecret(cfg: AppleConfig, nowSec = Math.floor(Date.now() / 1000)) {
  const der = Uint8Array.from(atob(cfg.privateKey.replace(/-----[^-]+-----|\s/g, "")), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const head = b64url(JSON.stringify({ alg: "ES256", kid: cfg.keyId }));
  const body = b64url(JSON.stringify({ iss: cfg.teamId, iat: nowSec, exp: nowSec + 300, aud: "https://appleid.apple.com", sub: cfg.clientId }));
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(`${head}.${body}`)));
  return `${head}.${body}.${b64url(sig)}`;
}

export async function revokeAppleTokens(code: string, cfg: AppleConfig, fetcher: typeof fetch = fetch) {
  const secret = await appleClientSecret(cfg);
  const form = (params: Record<string, string>) => ({ method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(params) });
  const tokenRes = await fetcher("https://appleid.apple.com/auth/token", form({ client_id: cfg.clientId, client_secret: secret, code, grant_type: "authorization_code" }));
  const { refresh_token } = (await tokenRes.json()) as { refresh_token?: string };
  if (!refresh_token) throw new Error("appleCodeInvalid");
  const revoke = await fetcher("https://appleid.apple.com/auth/revoke", form({ client_id: cfg.clientId, client_secret: secret, token: refresh_token, token_type_hint: "refresh_token" }));
  if (!revoke.ok) throw new Error(`appleRevoke ${revoke.status}`);
}
