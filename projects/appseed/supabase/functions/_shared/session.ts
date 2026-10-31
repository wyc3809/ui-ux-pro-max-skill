/**
 * Who is calling: asks Supabase Auth to validate the caller's access token, so a function never trusts a user
 * id sent in the body. Returns null for a missing, expired or forged token.
 */
export async function verifyUser(url: string, anonKey: string, authorization: string | null, fetcher: typeof fetch = fetch): Promise<string | null> {
  if (!authorization?.startsWith("Bearer ")) return null;
  const res = await fetcher(`${url}/auth/v1/user`, { headers: { Authorization: authorization, apikey: anonKey } });
  if (!res.ok) return null;
  const user = (await res.json()) as { id?: string };
  return typeof user.id === "string" ? user.id : null;
}
