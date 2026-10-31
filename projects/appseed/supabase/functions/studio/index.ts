// The creator studio's server side: submit listings, scan and store source, signed downloads, GitHub App.
// POST { action, ... } with the creator's token (see _shared/studio.ts).
import { unzipSync } from "npm:fflate@0.8.2";
import { githubApi } from "../_shared/github.ts";
import { signedInEndpoint } from "../_shared/http.ts";
import { enc, serviceRest } from "../_shared/rest.ts";
import { shouldRead } from "../_shared/source.ts";
import { handleStudio, StudioError, type StudioDeps } from "../_shared/studio.ts";

const env = (k: string) => Deno.env.get(k) ?? "";
const url = env("SUPABASE_URL");
const key = env("SUPABASE_SERVICE_ROLE_KEY");
const rest = serviceRest(url, key);
const auth = { apikey: key, Authorization: `Bearer ${key}` };
const object = (path: string) => `${url}/storage/v1/object/sources/${path.split("/").map(encodeURIComponent).join("/")}`;

const deps: StudioDeps = {
  db: {
    rpc: (fn, args) => rest.rpc(fn, args),
    handle: async (u) => (await rest.select<{ handle: string }>(`profiles?id=eq.${enc(u)}&deleted_at=is.null&select=handle`))[0]?.handle ?? null,
    email: async (u) => ((await rest.call<{ email?: string }>(`/auth/v1/admin/users/${enc(u)}`)).email ?? null),
    canDownload: (u, slug) => rest.rpc<boolean>("can_download", { p_user: u, p_slug: slug }),
    source: async (slug) => (await rest.select<{ path: string }>(`listing_sources?slug=eq.${enc(slug)}&select=path`))[0] ?? null,
    saveSource: (row) => rest.insert("listing_sources", row),
    installation: async (u) => {
      const [i] = await rest.select<{ installation_id: number; login: string }>(`github_installations?user_id=eq.${enc(u)}&select=installation_id,login`);
      return i ? { installationId: Number(i.installation_id), login: i.login } : null;
    },
    saveInstallation: (u, id, login) => rest.call("/rest/v1/github_installations?on_conflict=user_id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ user_id: u, installation_id: id, login }) }),
  },
  storage: {
    async signDownload(path, seconds) {
      const r = await rest.call<{ signedURL: string }>(`/storage/v1/object/sign/sources/${path.split("/").map(encodeURIComponent).join("/")}`, { method: "POST", body: JSON.stringify({ expiresIn: seconds }) });
      return `${url}/storage/v1${r.signedURL}`;
    },
    async signUpload(path) {
      const r = await rest.call<{ url: string; token: string }>(`/storage/v1/object/upload/sign/sources/${path.split("/").map(encodeURIComponent).join("/")}`, { method: "POST" });
      return { url: `${url}/storage/v1${r.url}`, token: r.token };
    },
    async read(path) {
      const res = await fetch(object(path), { headers: auth });
      if (!res.ok) throw new StudioError("notFound");
      return new Uint8Array(await res.arrayBuffer());
    },
    async write(path, bytes) {
      const res = await fetch(object(path), { method: "POST", headers: { ...auth, "Content-Type": "application/zip", "x-upsert": "true" }, body: bytes });
      if (!res.ok) throw new Error(`storage ${res.status}`);
    },
  },
  unzip(bytes) {
    const files = unzipSync(bytes);
    const text = new TextDecoder();
    return Object.entries(files).map(([path, data]) => ({ path, size: data.byteLength, text: shouldRead(path, data.byteLength) ? text.decode(data) : undefined }));
  },
  github: githubApi({ appId: env("GITHUB_APP_ID"), privateKey: env("GITHUB_APP_PRIVATE_KEY"), clientId: env("GITHUB_CLIENT_ID"), clientSecret: env("GITHUB_CLIENT_SECRET") }),
  email: env("RESEND_API_KEY")
    ? async (to, subject, text) => {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${env("RESEND_API_KEY")}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from: env("MAIL_FROM"), to, subject, text }),
        });
        if (!res.ok) throw new Error(`mail ${res.status}`);
      }
    : null,
};

const endpoint = signedInEndpoint("studio", [StudioError], (userId, body) => handleStudio(deps, userId, body));
Deno.serve((req) => endpoint(req, env));
