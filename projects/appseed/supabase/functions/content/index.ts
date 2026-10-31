// Writes user content after the shared rules pass (see _shared/content.ts). POST a ContentInput as JSON with
// the person's access token; answers 200 with the result, 400 { error } with a code the app translates,
// 401 without a valid session.
import Anthropic from "npm:@anthropic-ai/sdk@1.3.0";
import { revokeAppleTokens } from "../_shared/apple.ts";
import { classify, DEFAULT_MODEL } from "../_shared/classifier.ts";
import { ContentError, type ContentDb, handleContent, USER_ERRORS } from "../_shared/content.ts";
import { verifyUser } from "../_shared/session.ts";

const env = (k: string) => Deno.env.get(k) ?? "";
const url = env("SUPABASE_URL");
const service = env("SUPABASE_SERVICE_ROLE_KEY");
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

// Optional: without ANTHROPIC_API_KEY the shared rules alone decide.
const claude = env("ANTHROPIC_API_KEY") ? new Anthropic({ apiKey: env("ANTHROPIC_API_KEY") }) : null;

const db: ContentDb = {
  revokeApple: env("APPLE_PRIVATE_KEY")
    ? (code) => revokeAppleTokens(code, { teamId: env("APPLE_TEAM_ID"), keyId: env("APPLE_KEY_ID"), clientId: env("APPLE_CLIENT_ID"), privateKey: env("APPLE_PRIVATE_KEY") })
    : undefined,
  classify: claude ? (text) => classify(claude, text, env("MODERATION_MODEL") || DEFAULT_MODEL) : undefined,
  async rpc(fn, args) {
    const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: { apikey: service, Authorization: `Bearer ${service}`, "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
    const text = await res.text();
    if (!res.ok) throw new Error((JSON.parse(text || "{}") as { message?: string }).message ?? `rpc ${res.status}`);
    return (text ? JSON.parse(text) : null) as never;
  },
  async deleteAuthUser(userId) {
    const res = await fetch(`${url}/auth/v1/admin/users/${userId}`, {
      method: "DELETE",
      headers: { apikey: service, Authorization: `Bearer ${service}`, "Content-Type": "application/json" },
      body: JSON.stringify({ should_soft_delete: true }),
    });
    if (!res.ok) throw new Error(`deleteUser ${res.status}`);
  },
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { error: "methodNotAllowed" });
  const userId = await verifyUser(url, env("SUPABASE_ANON_KEY"), req.headers.get("authorization"));
  if (!userId) return json(401, { error: "authRequired" });
  try {
    return json(200, await handleContent(db, userId, await req.json()));
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (e instanceof ContentError || USER_ERRORS.has(message)) return json(400, { error: message });
    console.error("content", message);
    return json(500, { error: "serverError" });
  }
});
