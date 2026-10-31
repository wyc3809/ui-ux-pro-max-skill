import { api } from "@/api/backend";
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
  // The account's blocks follow it across devices (null = the demo server, where the device list is the truth).
  // Saved items too: the account's list, plus anything saved on this device before the server knew it.
  api
    .myFavorites()
    .then((server) => {
      if (!server) return;
      const local = useFavorites.getState().slugs;
      for (const k of local.filter((k) => !server.includes(k))) api.setFavorite(k, true).catch(() => {});
      useFavorites.setState({ slugs: [...new Set([...local, ...server])] });
    })
    .catch(() => {});
  api
    .myBlocks()
    .then((handles) => handles && useBlocks.setState({ handles }))
    .catch(() => {});
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
