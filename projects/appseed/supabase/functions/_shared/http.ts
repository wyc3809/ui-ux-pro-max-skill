import { verifyUser } from "./session.ts";

export const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };

/**
 * A POST endpoint for a signed-in person: answers CORS preflight, checks the session with Supabase Auth, and
 * maps errors whose class is in `userErrors` to 400 { error } (codes the app translates); anything else is 500.
 */
export function signedInEndpoint(name: string, userErrors: (new (...a: never[]) => Error)[], handler: (userId: string, body: Record<string, unknown>) => Promise<unknown>) {
  return async (req: Request, env: (k: string) => string) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
    if (req.method !== "POST") return json(405, { error: "methodNotAllowed" });
    const userId = await verifyUser(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), req.headers.get("authorization"));
    if (!userId) return json(401, { error: "authRequired" });
    try {
      return json(200, await handler(userId, ((await req.json().catch(() => ({}))) ?? {}) as Record<string, unknown>));
    } catch (e) {
      if (userErrors.some((E) => e instanceof E)) return json(400, { error: (e as Error).message });
      console.error(name, e instanceof Error ? e.message : e);
      return json(500, { error: "serverError" });
    }
  };
}
