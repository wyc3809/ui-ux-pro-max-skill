import type { StudioDeps } from "./studio.ts";

/**
 * GitHub App access (read-only, repos the creator picks — §22.6). The app signs a short JWT with its private
 * key to get an installation token; installations are linked only after GitHub's user OAuth confirms them.
 */
const b64url = (bytes: Uint8Array | string) =>
  btoa(typeof bytes === "string" ? bytes : String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

/** RS256 JWT for the GitHub App, valid 9 minutes (GitHub allows 10), backdated a minute for clock skew. */
export async function appJwt(appId: string, pkcs8Pem: string, nowSec = Math.floor(Date.now() / 1000)) {
  const der = Uint8Array.from(atob(pkcs8Pem.replace(/-----[^-]+-----|\s/g, "")), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const head = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const body = b64url(JSON.stringify({ iat: nowSec - 60, exp: nowSec + 540, iss: appId }));
  const sig = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${head}.${body}`)));
  return `${head}.${body}.${b64url(sig)}`;
}

export function githubApi(cfg: { appId: string; privateKey: string; clientId: string; clientSecret: string }, fetcher: typeof fetch = fetch): StudioDeps["github"] {
  const gh = async (path: string, token: string, accept = "application/vnd.github+json") => {
    const res = await fetcher(`https://api.github.com${path}`, { headers: { Authorization: `Bearer ${token}`, Accept: accept, "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "appseed" } });
    if (!res.ok) throw new Error(`github ${res.status} ${path}`);
    return res;
  };
  const repoPath = (repo: string) => repo.split("/").map(encodeURIComponent).join("/");
  return {
    async userInstallations(code) {
      const res = await fetcher("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: cfg.clientId, client_secret: cfg.clientSecret, code }),
      });
      const { access_token } = (await res.json()) as { access_token?: string };
      if (!access_token) throw new Error("githubOAuthFailed");
      const user = (await (await gh("/user", access_token)).json()) as { login: string };
      const list = (await (await gh("/user/installations", access_token)).json()) as { installations: { id: number }[] };
      return { login: user.login, ids: list.installations.map((i) => i.id) };
    },
    async token(installationId) {
      const res = await fetcher(`https://api.github.com/app/installations/${installationId}/access_tokens`, {
        method: "POST",
        headers: { Authorization: `Bearer ${await appJwt(cfg.appId, cfg.privateKey)}`, Accept: "application/vnd.github+json", "User-Agent": "appseed" },
      });
      const json = (await res.json()) as { token?: string };
      if (!json.token) throw new Error("githubTokenFailed");
      return json.token;
    },
    async repos(token) {
      const { repositories } = (await (await gh("/installation/repositories?per_page=100", token)).json()) as {
        repositories: { full_name: string; private: boolean; language: string | null; pushed_at: string; default_branch: string }[];
      };
      return repositories.map((r) => ({ fullName: r.full_name, private: r.private, language: r.language ?? "", updatedAt: r.pushed_at.slice(0, 10), defaultBranch: r.default_branch, branches: [r.default_branch] }));
    },
    async tree(token, repo, ref) {
      const json = (await (await gh(`/repos/${repoPath(repo)}/git/trees/${encodeURIComponent(ref)}?recursive=1`, token)).json()) as { tree: { path: string; type: string; size?: number }[] };
      return json.tree.filter((t) => t.type === "blob").map((t) => ({ path: t.path, size: t.size ?? 0 }));
    },
    async file(token, repo, ref, path) {
      const res = await fetcher(`https://api.github.com/repos/${repoPath(repo)}/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(ref)}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.raw+json", "User-Agent": "appseed" },
      });
      return res.ok ? res.text() : null;
    },
    async zipball(token, repo, ref) {
      return new Uint8Array(await (await gh(`/repos/${repoPath(repo)}/zipball/${encodeURIComponent(ref)}`, token, "application/vnd.github+json")).arrayBuffer());
    },
  };
}
