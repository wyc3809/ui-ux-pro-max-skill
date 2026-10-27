import { useMemo } from "react";
import { findListing } from "@/api/mockServer";
import { usePurchases } from "@/api/queries";
import type { PostAttachment } from "@/api/types";
import type { Viewer } from "@/lib/feed";
import { useFavorites } from "@/store/favorites";
import { useHistory } from "@/store/history";
import { useSeenPosts } from "@/store/seenPosts";
import { useSession } from "@/store/session";

const KINDS = ["template", "prompt", "buyout", "launch"] as const;

/** Favourites are stored as "kind:slug", or a bare slug for templates. */
function parseSaved(key: string): PostAttachment {
  const [head, ...rest] = key.split(":");
  return (KINDS as readonly string[]).includes(head!) && rest.length ? { kind: head as PostAttachment["kind"], slug: rest.join(":") } : { kind: "template", slug: key };
}

/**
 * The viewer profile the For you feed ranks with: creators behind what they saved or bought, words they
 * searched for, kinds of listing they engage with and posts they opened. Signed out = no personalisation.
 */
export function useViewer(): Viewer {
  const user = useSession((s) => s.user);
  const saved = useFavorites((s) => s.slugs);
  const queries = useHistory((s) => s.queries);
  const seen = useSeenPosts((s) => s.ids);
  const { data: purchases } = usePurchases();
  return useMemo(() => {
    if (!user) return { authors: [], interests: [], kinds: [], seen: [] };
    const items = [...saved.map(parseSaved), ...(purchases ?? []).map((slug) => ({ kind: "template" as const, slug }))];
    const authors = [...new Set(items.map((i) => findListing(i.kind, i.slug)?.owner).filter((x): x is string => !!x))];
    const interests = [...new Set(queries.flatMap((q) => q.toLowerCase().split(/\s+/)).filter((w) => w.length > 1))];
    return { userId: user.id, authors, interests, kinds: [...new Set(items.map((i) => i.kind))], seen };
  }, [user, saved, queries, seen, purchases]);
}
