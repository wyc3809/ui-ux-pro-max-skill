/** PostgREST and Storage calls with the service role key, for Edge Functions only. Errors carry the SQL message. */
export function serviceRest(url: string, key: string, fetcher: typeof fetch = fetch) {
  const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetcher(`${url}${path}`, { ...init, headers: { ...headers, ...(init.headers as Record<string, string>) } });
    const text = await res.text();
    if (!res.ok) {
      let message = text;
      try {
        message = (JSON.parse(text) as { message?: string }).message ?? text;
      } catch {}
      throw new Error(message);
    }
    return (text ? JSON.parse(text) : null) as T;
  }
  return {
    call,
    rpc: <T>(fn: string, args: object) => call<T>(`/rest/v1/rpc/${fn}`, { method: "POST", body: JSON.stringify(args) }),
    select: <T>(query: string) => call<T[]>(`/rest/v1/${query}`),
    insert: (table: string, row: object, onConflict?: string) =>
      call(`/rest/v1/${table}${onConflict ? `?on_conflict=${onConflict}` : ""}`, {
        method: "POST",
        headers: { Prefer: `${onConflict ? "resolution=ignore-duplicates," : ""}return=minimal` },
        body: JSON.stringify(row),
      }),
    patch: (query: string, values: object) => call(`/rest/v1/${query}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(values) }),
  };
}

export const enc = encodeURIComponent;
