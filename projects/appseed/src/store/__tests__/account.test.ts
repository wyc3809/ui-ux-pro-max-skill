import { queryClient } from "@/api/client";
import { useBlocks } from "../blocks";
import { useFavorites } from "../favorites";
import { useHistory } from "../history";
import { useSeenPosts } from "../seenPosts";
import { useSession } from "../session";

describe("account boundaries", () => {
  it("wipes every per-person store and the query cache on sign-out", () => {
    useSession.getState().signIn({ id: "u1", name: "A", handle: "a", email: null, provider: "email", createdAt: "2026-10-28" });
    useBlocks.getState().block("someone");
    useFavorites.getState().toggle("pocket-ledger");
    useHistory.getState().add("expo supabase");
    useSeenPosts.getState().mark("p1");
    queryClient.setQueryData(["purchases"], ["pocket-ledger"]);

    useSession.getState().signOut();

    expect(useSession.getState().user).toBeNull();
    expect(useBlocks.getState().handles).toEqual([]);
    expect(useFavorites.getState().slugs).toEqual([]);
    expect(useHistory.getState().queries).toEqual([]);
    expect(useSeenPosts.getState().ids).toEqual([]);
    expect(queryClient.getQueryData(["purchases"])).toBeUndefined();
  });

  it("marks cached account data stale on sign-in so resumed actions refetch it", () => {
    queryClient.setQueryData(["purchases"], []);
    useSession.getState().signIn({ id: "u2", name: "B", handle: "b", email: null, provider: "email", createdAt: "2026-10-28" });
    expect(queryClient.getQueryState(["purchases"])?.isInvalidated).toBe(true);
  });
});
