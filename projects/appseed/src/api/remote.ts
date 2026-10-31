import type { SupabaseClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import type { AuthProvider } from "@/lib/auth";
import { normalizeEmail } from "@/lib/auth";
import { TERMS_VERSION } from "@/lib/contact";
import { forYou, type Viewer } from "@/lib/feed";
import type { ReportReason, ReportTarget } from "@/lib/moderation";
import { sortPosts, type PostSort } from "@/lib/posts";
import type { SocialLinks } from "@/lib/socialLinks";
import type { api as demoApi } from "./mockServer";
import { invoke } from "./supabase";
import type { AuthResult, Comment, Creator, Engagement, Offer, Post, PostAttachment, User } from "./types";

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
      // Native Google sign-in needs the OAuth client set up in the Supabase project (DESIGN §33, still to do).
      throw new Error("googleUnavailable");
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
      await invoke("content", { action: "deleteAccount" });
      await sb.auth.signOut();
      return { ok: true as const };
    },

    creator: async (handle: string) => {
      const base = await demo.creator(handle);
      const { data } = await sb.from("profiles").select("handle, name, bio, links, avatar_hue").eq("handle", handle).maybeSingle<ProfileRow & { avatar_hue: number }>();
      return data ? { ...base, creator: toCreator(data, base.creator) } : base;
    },
    saveProfile: async ({ handle, name, bio, links }: { handle: string; name: string; bio: string; links: SocialLinks }) => {
      const p = await invoke<ProfileRow & { avatar_hue: number }>("content", { action: "saveProfile", name, bio, links });
      return toCreator(p, (await demo.creator(handle)).creator);
    },
    // Free items are claimed on the server. Paid ones need RevenueCat (app) or Stripe Checkout (web), not wired yet.
    purchase: async (slug: string) => {
      const r = await sb.rpc("claim_free", { p_slug: slug });
      if (r.error) throw new Error(r.error.message === "notFree" ? "paymentsNotConfigured" : r.error.message);
      return { ok: true as const };
    },
    purchasePrompt: async (slug: string) => {
      const r = await sb.rpc("claim_free", { p_slug: slug });
      if (r.error) throw new Error(r.error.message === "notFree" ? "paymentsNotConfigured" : r.error.message);
      return { ok: true as const };
    },
    purchases: () => ownedSlugs("template"),
    promptPurchases: () => ownedSlugs("prompt"),
    // RevenueCat's syncPurchases() runs here once the SDK is in; ownership itself is read from the server.
    restorePurchases: async () => ({ templates: (await ownedSlugs("template")).length, prompts: (await ownedSlugs("prompt")).length }),

    promoToday: async (_userId: string) => (must(await sb.rpc("promo_today")) as number) ?? 0,
    posts: async (sort: PostSort, viewer: Viewer) => {
      const list = await feedRows((q) => q.is("parent_id", null).order("created_at", { ascending: false }).limit(200));
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
