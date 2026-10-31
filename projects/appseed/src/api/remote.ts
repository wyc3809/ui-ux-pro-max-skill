import type { SupabaseClient } from "@supabase/supabase-js";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import { signInWithApple } from "@/lib/appleSignIn";
import type { AuthProvider } from "@/lib/auth";
import { normalizeEmail } from "@/lib/auth";
import { TERMS_VERSION } from "@/lib/contact";
import { forYou, type Viewer } from "@/lib/feed";
import type { ReportReason, ReportTarget } from "@/lib/moderation";
import { sortPosts, type PostSort } from "@/lib/posts";
import type { SocialLinks } from "@/lib/socialLinks";
import type { api as demoApi } from "./mockServer";
import { catalogueApi } from "./catalogue";
import { studioApi } from "./studioRemote";
import { buyTier, iapLogIn, syncStore, waitForOwnership } from "@/lib/iap";
import { invoke } from "./supabase";
import type { AdminListing, AdminReport, AuthResult, Comment, Creator, Engagement, Offer, Post, PostAttachment, User } from "./types";
import { withEnabledAttachments } from "@/lib/features";

/**
 * The Supabase implementation of the API (docs/DESIGN.md §33), for the parts of the app that now have a real
 * backend: accounts, profiles, purchases, discussion, comments, engagement, reports and offers. Everything
 * else still comes from the demo server until its tables exist; backend.ts merges the two.
 * Reads go through RLS; writes others will read go through the `content` Edge Function.
 */
type Api = typeof demoApi;

type ProfileRow = { id: string; handle: string; name: string; bio: string; links: SocialLinks; terms_version: number; created_at: string };
type PostRow = {
  id: string;
  user_id: string;
  author: string;
  handle: string;
  body: string;
  created_at: string;
  parent_id: string | null;
  attachment_kind: PostAttachment["kind"] | null;
  attachment_slug: string | null;
  promo: boolean;
  likes: number;
  replies: number;
  reposts: number;
  liked: boolean;
  reposted: boolean;
};
type CommentRow = { id: string; user_id: string; author: string; handle: string; body: string; created_at: string };
type OfferRow = { slug: string; amount: number; message: string; created_at: string; status: Offer["status"] | "declined" };

export function toUser(p: ProfileRow, auth: { email?: string | null; provider?: string }): User {
  const provider: AuthProvider = auth.provider === "apple" || auth.provider === "google" ? auth.provider : "email";
  return { id: p.id, name: p.name, handle: p.handle, email: auth.email ?? null, provider, createdAt: p.created_at.slice(0, 10), termsVersion: p.terms_version };
}

export function toPost(r: PostRow): Post {
  return {
    id: r.id,
    userId: r.user_id,
    author: r.author,
    handle: r.handle,
    body: r.body,
    createdAt: r.created_at,
    ...(r.attachment_kind && r.attachment_slug ? { attachment: { kind: r.attachment_kind, slug: r.attachment_slug }, promo: r.promo } : null),
    ...(r.parent_id ? { parentId: r.parent_id } : null),
    likes: Number(r.likes),
    replies: Number(r.replies),
    reposts: Number(r.reposts),
    liked: r.liked,
    reposted: r.reposted,
  };
}

/** A profile as a creator card; sales and ratings come from the catalogue (still demo data) when it has them. */
export const toCreator = (p: Pick<ProfileRow, "handle" | "name" | "bio" | "links"> & { avatar_hue?: number }, seed?: Creator | null): Creator => ({
  ...(seed ?? { avatarHue: p.avatar_hue ?? 262, founding: false, totalSales: 0, avgRating: 0 }),
  handle: p.handle,
  name: p.name,
  bio: p.bio,
  links: p.links,
});

export const toComment = (r: CommentRow): Comment => ({ id: r.id, userId: r.user_id, author: r.author, handle: r.handle, body: r.body, createdAt: r.created_at });

/** Offers are stored in cents like every amount; the app shows whole dollars. A declined offer reads as sent. */
export const toOffer = (r: OfferRow): Offer => ({ slug: r.slug, amount: Math.round(r.amount / 100), message: r.message, createdAt: r.created_at.slice(0, 10), status: r.status === "declined" ? "sent" : r.status });

const must = <T>(r: { data: T | null; error: { message: string } | null }): T => {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
};

/** Where Stripe should send the person back to: this page on the web, the site root otherwise. */
const returnHere = () => (Platform.OS === "web" && typeof window !== "undefined" ? window.location.href : undefined);

export type ConnectState = { state: "none" | "pending" | "ready"; payoutsEnabled: boolean };

export function remoteApi(sb: SupabaseClient, demo: Api) {
  const me = async () => {
    const { data } = await sb.auth.getUser();
    return data.user;
  };
  const myId = async () => {
    const u = await me();
    if (!u) throw new Error("authRequired");
    return u.id;
  };

  /** After any sign-in: a known account lands; a new one finishes its profile (the session is the ticket). */
  const land = async (fallbackName: string | null): Promise<AuthResult> => {
    const u = await me();
    if (!u) throw new Error("authFailed");
    const { data } = await sb.from("profiles").select("*").eq("id", u.id).maybeSingle<ProfileRow>();
    if (data) return { status: "signedIn", user: toUser(data, { email: u.email, provider: u.app_metadata.provider }) };
    return { status: "needsProfile", ticket: u.id, email: u.email ?? null, name: fallbackName ?? (u.user_metadata.full_name as string | undefined) ?? "" };
  };

  /** Web OAuth: the page leaves for Apple / Google and comes back signed in (see resumeSession). */
  const redirectTo = async (provider: "apple" | "google"): Promise<never> => {
    const r = await sb.auth.signInWithOAuth({ provider, options: { redirectTo: typeof window !== "undefined" ? window.location.href : undefined } });
    if (r.error) throw new Error(r.error.message);
    return new Promise<never>(() => {});
  };

  const catalogue = catalogueApi(sb);
  const { templatesBy: _templatesBy, ...catalogueReads } = catalogue;

  const feedRows = async (filter: (q: ReturnType<ReturnType<SupabaseClient["from"]>["select"]>) => unknown) => {
    const q = sb.from("post_feed").select("*");
    filter(q);
    return must(await (q as unknown as Promise<{ data: PostRow[] | null; error: { message: string } | null }>)).map(toPost);
  };

  const ownedSlugs = async (kind: "template" | "prompt") => {
    if (!(await me())) return [];
    const rows = must(await sb.rpc("my_purchases")) as { slug: string; kind: string }[];
    return rows.filter((r) => r.kind === kind).map((r) => r.slug);
  };

  /**
   * Buys a listing. Free: claimed on the server. Web: Stripe Checkout (the page leaves and comes back).
   * App: records the purchase intent, buys the listing's price tier from the store, then waits for the
   * webhook to grant access. Access is always the server's decision.
   */
  const buy = async (slug: string, kind: "template" | "prompt") => {
    const userId = await myId();
    const tier = (await sb.from("listing_prices").select("product_id").eq("listing_id", slug).eq("live", true).maybeSingle<{ product_id: string }>()).data;
    if (!tier) {
      const r = await sb.rpc("claim_free", { p_slug: slug });
      if (r.error) throw new Error(r.error.message);
      return { ok: true as const };
    }
    if (Platform.OS === "web") {
      const { url } = await invoke<{ url: string }>("checkout", { slug, returnUrl: returnHere() });
      window.location.assign(url);
      return new Promise<never>(() => {});
    }
    await iapLogIn(userId);
    must(await sb.rpc("create_purchase_intent", { p_listing: slug }));
    if ((await buyTier(tier.product_id)) === "cancelled") throw new Error("cancelled");
    if (!(await waitForOwnership(async () => (await ownedSlugs(kind)).includes(slug)))) throw new Error("purchasePending");
    return { ok: true as const };
  };

  const toggle = async (table: "post_likes" | "reposts" | "item_likes", match: Record<string, string>) => {
    const userId = await myId();
    const row = { ...match, user_id: userId };
    const existing = must(await sb.from(table).select("user_id").match(row).maybeSingle());
    if (existing) must(await sb.from(table).delete().match(row));
    else must(await sb.from(table).insert(row));
    return !existing;
  };

  return {
    signInWithApple: async (c: { sub: string; email: string | null; name: string | null; identityToken?: string | null }) => {
      // Native iOS hands over an identity token; the web uses Apple's redirect flow instead.
      if (!c.identityToken) {
        if (Platform.OS === "web") return redirectTo("apple");
        throw new Error("appleUnavailable");
      }
      const r = await sb.auth.signInWithIdToken({ provider: "apple", token: c.identityToken });
      if (r.error) throw new Error(r.error.message);
      return land(c.name);
    },
    signInWithGoogle: async () => {
      if (Platform.OS === "web") return redirectTo("google");
      // Native: Google's page in an auth session, back to appseed://auth-callback with a PKCE code.
      const callback = "appseed://auth-callback";
      const r = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: callback, skipBrowserRedirect: true } });
      if (r.error || !r.data.url) throw new Error("googleUnavailable");
      const result = await WebBrowser.openAuthSessionAsync(r.data.url, callback);
      if (result.type !== "success") throw new Error("cancelled");
      const code = new URL(result.url).searchParams.get("code");
      if (!code) throw new Error("authFailed");
      const x = await sb.auth.exchangeCodeForSession(code);
      if (x.error) throw new Error(x.error.message);
      return land(null);
    },
    /** Finishes a web redirect sign-in after the page reloads, or returns null when there is no session. */
    resumeSession: async (): Promise<AuthResult | null> => ((await me()) ? land(null) : null),
    sendEmailCode: async (email: string) => {
      const e = normalizeEmail(email);
      const r = await sb.auth.signInWithOtp({ email: e, options: { shouldCreateUser: true } });
      if (r.error) throw new Error(r.error.message);
      return { email: e, sentAt: Date.now() };
    },
    verifyEmailCode: async ({ email, code }: { email: string; code: string }) => {
      const r = await sb.auth.verifyOtp({ email: normalizeEmail(email), token: code, type: "email" });
      if (r.error) throw new Error("otpInvalid");
      return land(null);
    },
    checkHandle: async (handle: string) => {
      const { count } = await sb.from("profiles").select("id", { count: "exact", head: true }).eq("handle", handle);
      return { handle, available: !count };
    },
    completeProfile: async ({ name, handle, termsVersion }: { ticket: string; name: string; handle: string; termsVersion: number }) => {
      const profile = await invoke<ProfileRow>("content", { action: "completeProfile", name, handle, termsVersion });
      const u = await me();
      return toUser(profile, { email: u?.email, provider: u?.app_metadata.provider });
    },
    acceptTerms: async (_userId: string) => {
      must(await sb.rpc("accept_terms", { p_version: TERMS_VERSION }));
      const u = await me();
      const p = must(await sb.from("profiles").select("*").eq("id", u!.id).single<ProfileRow>());
      return toUser(p, { email: u?.email, provider: u?.app_metadata.provider });
    },
    deleteAccount: async (_id: string) => {
      // Apple accounts re-confirm with Apple once, so the server can revoke Apple's tokens (App Review 5.1.1(v)).
      const u = await me();
      const apple = u?.app_metadata.provider === "apple" ? await signInWithApple().catch(() => null) : null;
      await invoke("content", { action: "deleteAccount", appleAuthorizationCode: apple?.authorizationCode ?? undefined });
      await sb.auth.signOut();
      return { ok: true as const };
    },

    ...catalogueReads,
    ...studioApi(sb),
    staffRole: async () => {
      if (!(await me())) return null;
      const { data } = await sb.from("staff").select("role").maybeSingle<{ role: "admin" | "moderator" }>();
      return data?.role ?? null;
    },
    adminReports: () => invoke<AdminReport[]>("admin", { action: "reports" }),
    adminListings: () => invoke<AdminListing[]>("admin", { action: "listings" }),
    adminResolve: (reportId: string, decision: "dismiss" | "hide" | "restore") => invoke<{ ok: true }>("admin", { action: "resolve", reportId, decision }),
    adminReview: (slug: string, approve: boolean) => invoke<{ ok: true }>("admin", { action: "review", slug, approve }),
    adminSuspend: (handle: string) => invoke<{ ok: true }>("admin", { action: "suspend", handle }),
    blockHandle: async (handle: string) => {
      if (await me()) await sb.rpc("block_handle", { p_handle: handle });
    },
    unblockHandle: async (handle: string) => {
      if (await me()) await sb.rpc("unblock_handle", { p_handle: handle });
    },
    myBlocks: async () => ((await me()) ? (must(await sb.rpc("my_blocks")) as string[]) : null),
    creator: async (handle: string) => {
      // Sales and rating badges still come from the demo creator when there is one; the profile is the server's.
      const seed = (await demo.creator(handle)).creator;
      const [{ data }, templates] = await Promise.all([
        sb.from("profiles").select("handle, name, bio, links, avatar_hue").eq("handle", handle).maybeSingle<ProfileRow & { avatar_hue: number }>(),
        catalogue.templatesBy(handle),
      ]);
      return { creator: data ? toCreator(data, seed) : null, templates };
    },
    saveProfile: async ({ handle, name, bio, links }: { handle: string; name: string; bio: string; links: SocialLinks }) => {
      const p = await invoke<ProfileRow & { avatar_hue: number }>("content", { action: "saveProfile", name, bio, links });
      return toCreator(p, (await demo.creator(handle)).creator);
    },
    purchase: (slug: string) => buy(slug, "template"),
    purchasePrompt: (slug: string) => buy(slug, "prompt"),
    purchases: () => ownedSlugs("template"),
    purchaseDates: async () => {
      if (!(await me())) return {};
      const rows = must(await sb.rpc("my_purchases")) as { slug: string; acquired_at: string }[];
      return Object.fromEntries(rows.map((r) => [r.slug, r.acquired_at]));
    },
    promptPurchases: () => ownedSlugs("prompt"),
    // RevenueCat's syncPurchases() runs here once the SDK is in; ownership itself is read from the server.
    restorePurchases: async () => {
      const u = await me();
      if (u) await iapLogIn(u.id);
      await syncStore();
      return { templates: (await ownedSlugs("template")).length, prompts: (await ownedSlugs("prompt")).length };
    },
    connectStatus: async () => ((await me()) ? invoke<ConnectState>("connect", { action: "status" }) : { state: "none" as const, payoutsEnabled: false }),
    startPayoutSetup: async () => invoke<{ url: string | null }>("connect", { action: "onboard", returnUrl: returnHere() }),
    payoutDashboard: async () => invoke<{ url: string | null }>("connect", { action: "dashboard" }),

    promoToday: async (_userId: string) => (must(await sb.rpc("promo_today")) as number) ?? 0,
    posts: async (sort: PostSort, viewer: Viewer) => {
      const list = withEnabledAttachments(await feedRows((q) => q.is("parent_id", null).order("created_at", { ascending: false }).limit(200)));
      return sort === "forYou" ? forYou(list, viewer) : sortPosts(list, sort);
    },
    thread: async (id: string) => {
      const [post] = await feedRows((q) => q.eq("id", id));
      if (!post) throw new Error("not-found");
      const replies = await feedRows((q) => q.eq("parent_id", id).order("created_at", { ascending: true }));
      return { post, replies };
    },
    createPost: async ({ body, attachment, parentId }: { body: string; attachment?: PostAttachment; parentId?: string; user: { id: string; name: string; handle: string } }) => {
      const { id } = await invoke<{ id: string }>("content", { action: "createPost", body, attachment, parentId });
      const [post] = await feedRows((q) => q.eq("id", id));
      return post!;
    },
    togglePostLike: (id: string) => toggle("post_likes", { post_id: id }),
    toggleRepost: (id: string) => toggle("reposts", { post_id: id }),

    engagement: async (key: string): Promise<Engagement> => {
      const [r] = must(await sb.rpc("engagement", { p_key: key })) as { likes: number; views: number; shares: number; comments: number; liked: boolean }[];
      // Bookmarks are favourites kept on the device; there is no server count yet.
      return { likes: Number(r?.likes ?? 0), views: Number(r?.views ?? 0), shares: Number(r?.shares ?? 0), comments: Number(r?.comments ?? 0), bookmarks: 0, liked: !!r?.liked };
    },
    toggleLike: async (key: string) => ({ liked: await toggle("item_likes", { item_key: key }) }),
    recordView: async (key: string) => {
      await sb.rpc("record_view", { p_key: key });
      return { ok: true as const };
    },
    recordShare: async (key: string) => {
      // Guests can share too; only signed-in shares count toward ranking.
      if (await me()) await sb.rpc("record_share", { p_key: key });
      return { ok: true as const };
    },
    comments: async (key: string) => must(await sb.from("comment_feed").select("*").eq("item_key", key).order("created_at", { ascending: false }).limit(200)).map((r) => toComment(r as CommentRow)),
    postComment: async ({ key, body }: { key: string; body: string; user: { id: string; name: string; handle: string } }) => {
      const { id } = await invoke<{ id: string }>("content", { action: "postComment", key, body });
      return toComment(must(await sb.from("comment_feed").select("*").eq("id", id).single<CommentRow>()));
    },
    deleteComment: async ({ id }: { key: string; id: string }) => {
      must(await sb.from("comments").delete().eq("id", id));
      return { ok: true as const };
    },
    report: async ({ target, reason, detail, contact }: { target: ReportTarget; reason: ReportReason; detail: string; contact: string }) => {
      const u = await me();
      must(
        await sb.from("reports").insert({ reporter_id: u?.id ?? null, target_kind: target.kind, target_id: target.id, target_handle: target.handle, reason, detail: detail.trim(), contact: contact.trim() }),
      );
    },
    offers: async () => {
      if (!(await me())) return [];
      return must(await sb.from("offers").select("slug, amount, message, created_at, status").eq("buyer_id", await myId())).map((r) => toOffer(r as OfferRow));
    },
    makeOffer: async (o: { slug: string; amount: number; message: string }) => toOffer(await invoke<OfferRow>("content", { action: "makeOffer", ...o })),
  } satisfies Partial<Api>;
}
