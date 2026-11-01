import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * First-party crash and error reports (§30: no third-party tracking SDKs). A report carries what broke and
 * where, never who: no account, device id, or the text people typed. With Supabase configured it lands in
 * `client_errors`; otherwise it only goes to the console.
 */
export type ErrorReport = { platform: "ios" | "android" | "web"; app_version: string; route: string; message: string; stack: string };

/** Emails, long digits and tokens are stripped, in case an error message quotes user input. */
export const scrub = (s: string) =>
  s
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, "<email>")
    .replace(/\b(eyJ[\w-]+\.[\w-]+\.[\w-]+|sk_[\w]+|[A-Za-z0-9_-]{32,})\b/g, "<token>")
    .replace(/\+?\d[\d\s-]{6,}\d/g, "<number>");

export function errorReport(error: unknown, route: string, platform = Platform.OS, version = Constants.expoConfig?.version ?? "0"): ErrorReport {
  const e = error instanceof Error ? error : new Error(String(error));
  return {
    platform: platform === "ios" || platform === "android" ? platform : "web",
    app_version: version.slice(0, 20),
    route: route.replace(/\?.*$/, "").slice(0, 200),
    message: scrub(`${e.name}: ${e.message}`).slice(0, 500) || "Error",
    stack: scrub(e.stack ?? "").slice(0, 4000),
  };
}

type Sink = (r: ErrorReport) => Promise<unknown>;
let sink: Sink | null = null;
let sent = 0;

export function setErrorSink(s: Sink | null) {
  sink = s;
}

/** Sends at most 20 reports per session, so a render loop cannot flood the table. */
export function reportError(error: unknown, route = "") {
  const r = errorReport(error, route);
  console.error("[vcseed]", r.message);
  if (!sink || sent >= 20) return;
  sent++;
  sink(r).catch(() => {});
}

/** Unhandled errors and promise rejections, on every platform. */
export function installGlobalErrorHandlers(currentRoute: () => string) {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.addEventListener("error", (ev) => reportError(ev.error ?? ev.message, currentRoute()));
    window.addEventListener("unhandledrejection", (ev) => reportError(ev.reason, currentRoute()));
    return;
  }
  const g = globalThis as { ErrorUtils?: { getGlobalHandler(): (e: unknown, fatal?: boolean) => void; setGlobalHandler(h: (e: unknown, fatal?: boolean) => void): void } };
  const previous = g.ErrorUtils?.getGlobalHandler();
  g.ErrorUtils?.setGlobalHandler((e, fatal) => {
    reportError(e, currentRoute());
    previous?.(e, fatal);
  });
}
