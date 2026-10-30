/** Webhook authenticity checks. Both run before a body is parsed; a failure returns 400 and writes nothing. */

const enc = new TextEncoder();

function equal(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmacHex(secret: string, payload: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(payload)));
  return Array.from(sig, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Stripe-Signature: `t=<unix>,v1=<hex>[,v1=…]`, signed over `${t}.${body}`, accepted within `toleranceSec`. */
export async function verifyStripe(body: string, header: string | null, secret: string, nowSec: number, toleranceSec = 300) {
  if (!header || !secret) return false;
  const parts = header.split(",").map((p) => p.split("=") as [string, string]);
  const t = Number(parts.find(([k]) => k === "t")?.[1]);
  const sigs = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!Number.isFinite(t) || !sigs.length || Math.abs(nowSec - t) > toleranceSec) return false;
  const expected = await hmacHex(secret, `${t}.${body}`);
  return sigs.some((s) => equal(s, expected));
}

/** `Authorization: Bearer <secret>`: RevenueCat sends the value set in its dashboard; pg_cron sends the settlement secret. */
export function verifyBearer(header: string | null, secret: string) {
  return !!header && !!secret && equal(header, `Bearer ${secret}`);
}
