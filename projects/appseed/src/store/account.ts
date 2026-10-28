import { queryClient } from "@/api/client";
import { useBlocks } from "./blocks";
import { useFavorites } from "./favorites";
import { clearAllDrafts } from "./formDrafts";
import { useHistory } from "./history";
import { useSeenPosts } from "./seenPosts";
import { useUploadDraft } from "./uploadDraft";

/**
 * Account boundaries. Signing in refetches everything the server knows about the new account (purchases,
 * offers) so a resumed action never runs on a guest's stale cache; signing out or deleting the account wipes
 * the cache and every per-person store on the device so the next person starts clean.
 */
export function onSignedIn() {
  queryClient.invalidateQueries();
}

export function resetAccountData() {
  queryClient.clear();
  useBlocks.setState({ handles: [] });
  useFavorites.setState({ slugs: [] });
  useSeenPosts.setState({ ids: [] });
  useHistory.setState({ queries: [] });
  useUploadDraft.getState().reset();
  clearAllDrafts();
}
