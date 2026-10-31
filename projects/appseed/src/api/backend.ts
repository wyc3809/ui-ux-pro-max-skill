import { setErrorSink } from "@/lib/errorReport";
import { iapLogOut } from "@/lib/iap";
import { api as demoApi } from "./mockServer";
import { remoteApi } from "./remote";
import { supabase } from "./supabase";

/**
 * The API the app calls. With Supabase configured, the parts that have a real backend (remote.ts) replace the
 * demo server's; the catalogue, studio and source upload stay on the demo server until their tables and
 * functions exist. Without configuration the whole app runs on the demo server, as before.
 */
export const api: typeof demoApi = supabase ? { ...demoApi, ...remoteApi(supabase, demoApi) } : demoApi;

// Error reports go to the project's own database when there is one (no third-party crash SDK).
if (supabase) {
  const sb = supabase;
  setErrorSink(async (r) => {
    await sb.from("client_errors").insert(r);
  });
}

/** Ends the Supabase session too, so a signed-out device holds no token. */
export async function signOutBackend() {
  await supabase?.auth.signOut().catch(() => {});
  await iapLogOut();
}
