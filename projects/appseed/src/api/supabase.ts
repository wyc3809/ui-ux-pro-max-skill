import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import { mmkvStorage } from "@/store/storage";

/**
 * The Supabase client, or null while the project is not configured (the app then runs on the demo server in
 * mockServer.ts). Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to switch over; both are
 * public by design: Row Level Security, not the key, protects the data.
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          storage: mmkvStorage as never,
          persistSession: true,
          autoRefreshToken: true,
          // Web finishes OAuth from the redirect URL; native gets sessions from id tokens and OTP codes.
          detectSessionInUrl: Platform.OS === "web",
        },
      })
    : null;

export const isRemote = supabase != null;

/** Calls an Edge Function and turns its `{ error }` body into an Error with that code. */
export async function invoke<T>(fn: string, body: object): Promise<T> {
  if (!supabase) throw new Error("notConfigured");
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    const code = ctx ? ((await ctx.json().catch(() => ({}))) as { error?: string }).error : undefined;
    throw new Error(code ?? error.message);
  }
  return data as T;
}
