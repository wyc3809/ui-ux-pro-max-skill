// Staff tools: report queue, listing review, suspensions. POST { action, ... } with a staff member's token.
import { AdminError, handleAdmin } from "../_shared/admin.ts";
import { signedInEndpoint } from "../_shared/http.ts";
import { enc, serviceRest } from "../_shared/rest.ts";

const env = (k: string) => Deno.env.get(k) ?? "";
const rest = serviceRest(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));

const endpoint = signedInEndpoint("admin", [AdminError], (userId, body) =>
  handleAdmin(
    {
      isStaff: (u) => rest.rpc<boolean>("is_staff", { p_user: u }),
      rpc: (fn, args) => rest.rpc(fn, args),
      ban: async (u) => {
        await rest.call(`/auth/v1/admin/users/${enc(u)}`, { method: "PUT", body: JSON.stringify({ ban_duration: "876000h" }) });
      },
    },
    userId,
    body,
  ),
);
Deno.serve((req) => endpoint(req, env));
