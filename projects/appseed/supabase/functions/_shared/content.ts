import { validateHandle } from "./rules/auth.ts";
import { TERMS_VERSION } from "./rules/contact.ts";
import { screenText } from "./rules/moderation.ts";
import { POST_MAX, PROMO_PER_DAY, validatePost } from "./rules/posts.ts";
import { BIO_MAX, normalizeSocial, SOCIALS, type SocialLinks } from "./rules/socialLinks.ts";

/**
 * Everything a person writes that others read goes through here (docs/DESIGN.md §33): the same rules the app
 * shows while typing (src/lib, copied to ./rules), then a content_* database function that re-checks what
 * only the database can check atomically (terms version, daily promotion limit, listing ownership).
 * Errors are codes the app already translates (t.error with the moderation / discuss / auth prefixes).
 */
export type ContentInput =
  | { action: "completeProfile"; handle: string; name: string; termsVersion: number }
  | { action: "saveProfile"; name: string; bio: string; links: SocialLinks }
  | { action: "createPost"; body: string; parentId?: string; attachment?: { kind: "template" | "prompt" | "buyout" | "launch"; slug: string } }
  | { action: "postComment"; key: string; body: string }
  | { action: "makeOffer"; slug: string; amount: number; message: string }
  | { action: "deleteAccount" };

export interface ContentDb {
  rpc<T>(fn: string, args: Record<string, unknown>): Promise<T>;
  /** Soft-deletes the auth user so they cannot sign in again; sales records keep their foreign keys. */
  deleteAuthUser(userId: string): Promise<void>;
}

export class ContentError extends Error {}

/** Codes the database raises that are the person's to fix, so they go back as 400 rather than 500. */
export const USER_ERRORS = new Set(["termsRequired", "profileRequired", "profileExists", "handleTaken", "promoLimit", "notYourListing", "notFound"]);

const fail = (code: string): never => {
  throw new ContentError(code);
};
const screen = (text: string) => {
  const r = screenText(text);
  if (!r.ok) fail(r.reason);
};
const str = (v: unknown) => (typeof v === "string" ? v : "");

function cleanLinks(input: unknown): SocialLinks {
  const out: SocialLinks = {};
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  for (const key of Object.keys(raw)) if (!(SOCIALS as readonly string[]).includes(key)) fail("invalidHandle");
  for (const kind of SOCIALS) {
    const r = normalizeSocial(kind, str(raw[kind]));
    if ("error" in r) fail(r.error);
    else if (r.value) out[kind] = r.value;
  }
  return out;
}

export async function handleContent(db: ContentDb, userId: string, input: ContentInput): Promise<unknown> {
  switch (input.action) {
    case "completeProfile": {
      const handle = str(input.handle);
      const name = str(input.name).trim();
      const handleError = validateHandle(handle);
      if (handleError) fail(handleError);
      if (!name || name.length > 50) fail("nameRequired");
      screen(name);
      return db.rpc("content_complete_profile", { p_user: userId, p_handle: handle, p_name: name, p_terms: Number(input.termsVersion) || 0, p_min_terms: TERMS_VERSION });
    }
    case "saveProfile": {
      const name = str(input.name).trim();
      const bio = str(input.bio).trim();
      if (!name || name.length > 50) fail("nameRequired");
      if (bio.length > BIO_MAX) fail("bioTooLong");
      screen(`${name} ${bio}`);
      return db.rpc("content_save_profile", { p_user: userId, p_name: name, p_bio: bio, p_links: cleanLinks(input.links) });
    }
    case "createPost": {
      const body = str(input.body);
      // The promotion count is the database's job (it is atomic there); format rules run here.
      const error = validatePost(body, { promo: false, promoToday: 0 });
      if (error) fail(error);
      screen(body);
      const a = input.parentId ? undefined : input.attachment;
      return {
        id: await db.rpc<string>("content_create_post", {
          p_user: userId,
          p_body: body,
          p_parent: input.parentId ?? null,
          p_kind: a?.kind ?? null,
          p_slug: a?.slug ?? null,
          p_min_terms: TERMS_VERSION,
          p_promo_limit: PROMO_PER_DAY,
        }),
      };
    }
    case "postComment": {
      const body = str(input.body).trim();
      if (!body) fail("empty");
      if (body.length > POST_MAX) fail("tooLong");
      screen(body);
      return { id: await db.rpc<string>("content_post_comment", { p_user: userId, p_key: str(input.key), p_body: body, p_min_terms: TERMS_VERSION }) };
    }
    case "makeOffer": {
      const message = str(input.message).trim();
      // The app sends whole HK dollars; the database stores cents like every other amount.
      if (!Number.isInteger(input.amount) || input.amount <= 0) fail("invalidAmount");
      if (message.length > 500) fail("tooLong");
      if (message) screen(message);
      return db.rpc("content_make_offer", { p_user: userId, p_slug: str(input.slug), p_amount: input.amount * 100, p_message: message, p_min_terms: TERMS_VERSION });
    }
    case "deleteAccount": {
      await db.rpc("content_delete_account", { p_user: userId });
      await db.deleteAuthUser(userId);
      return { ok: true };
    }
    default:
      return fail("unknownAction");
  }
}
