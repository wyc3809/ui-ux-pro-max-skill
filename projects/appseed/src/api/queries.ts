import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { RangeDays } from "@/lib/analytics";
import type { Viewer } from "@/lib/feed";
import type { PostSort } from "@/lib/posts";
import type { Period } from "@/lib/ranking";
import { toggleVote } from "@/lib/launch";
import { api, type SearchParams } from "./mockServer";
import type { Comment, Engagement, Launch, Post, PostAttachment } from "./types";

export const qk = {
  templates: ["templates"] as const,
  template: (slug: string) => ["template", slug] as const,
  creator: (handle: string) => ["creator", handle] as const,
  search: (p: SearchParams) => ["search", p] as const,
  purchases: ["purchases"] as const,
  studio: ["studio"] as const,
  prompts: ["prompts"] as const,
  prompt: (slug: string) => ["prompt", slug] as const,
  promptPurchases: ["prompt-purchases"] as const,
  buyouts: ["buyouts"] as const,
  buyout: (slug: string) => ["buyout", slug] as const,
  offers: ["offers"] as const,
  launches: ["launches"] as const,
  launch: (slug: string) => ["launch", slug] as const,
  github: ["github"] as const,
  engagement: (key: string) => ["engagement", key] as const,
  comments: (key: string) => ["comments", key] as const,
  githubRepos: ["github-repos"] as const,
  analytics: (range: RangeDays, slug: string | null) => ["analytics", range, slug ?? "all"] as const,
  leaderboard: (period: Period) => ["leaderboard", period] as const,
  posts: (sort: PostSort, viewer: string) => ["posts", sort, viewer] as const,
  thread: (id: string) => ["thread", id] as const,
};

const HOUR = 60 * 60 * 1000;

export const useTemplates = () => useQuery({ queryKey: qk.templates, queryFn: api.templates, staleTime: 10 * 60 * 1000 });
export const useTemplate = (slug: string) => useQuery({ queryKey: qk.template(slug), queryFn: () => api.template(slug), staleTime: HOUR });
export const useCreator = (handle: string) => useQuery({ queryKey: qk.creator(handle), queryFn: () => api.creator(handle) });
export const useSearch = (p: SearchParams) =>
  useQuery({ queryKey: qk.search(p), queryFn: () => api.search(p), placeholderData: (prev) => prev });
export const usePurchases = () => useQuery({ queryKey: qk.purchases, queryFn: api.purchases });
export const useStudio = () => useQuery({ queryKey: qk.studio, queryFn: api.studio });
/** Keeps the previous report on screen while a new range or listing loads, so numbers roll instead of blanking. */
export const useAnalytics = (range: RangeDays, slug: string | null) =>
  useQuery({ queryKey: qk.analytics(range, slug), queryFn: () => api.analytics(range, slug), placeholderData: (prev) => prev, staleTime: 5 * 60 * 1000 });

/** Ownership comes from the server only — the client never flips it locally (§14.6). */
export function useOwned(slug: string): boolean {
  const { data } = usePurchases();
  return data?.includes(slug) ?? false;
}

export function usePurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.purchase,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.purchases }),
  });
}

export const usePrompts = () => useQuery({ queryKey: qk.prompts, queryFn: api.prompts, staleTime: 10 * 60 * 1000 });
export const usePrompt = (slug: string) => useQuery({ queryKey: qk.prompt(slug), queryFn: () => api.prompt(slug), staleTime: HOUR });
export const usePromptPurchases = () => useQuery({ queryKey: qk.promptPurchases, queryFn: api.promptPurchases });
export const useBuyouts = () => useQuery({ queryKey: qk.buyouts, queryFn: api.buyouts });
export const useBuyout = (slug: string) => useQuery({ queryKey: qk.buyout(slug), queryFn: () => api.buyout(slug) });
export const useOffers = () => useQuery({ queryKey: qk.offers, queryFn: api.offers });
export const useLaunches = () => useQuery({ queryKey: qk.launches, queryFn: api.launches });
/** Keeps the previous board on screen while another period loads, so rows reorder instead of blanking. */
export const useLeaderboard = (period: Period) => useQuery({ queryKey: qk.leaderboard(period), queryFn: () => api.leaderboard(period), placeholderData: (prev) => prev });
export const useLaunch = (slug: string) => useQuery({ queryKey: qk.launch(slug), queryFn: () => api.launch(slug) });

/** Same rule as templates: prompt ownership comes from the server only. */
export function useOwnsPrompt(slug: string): boolean {
  const { data } = usePromptPurchases();
  return data?.includes(slug) ?? false;
}

export function usePurchasePrompt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.purchasePrompt,
    onSuccess: (_r, slug) => {
      qc.invalidateQueries({ queryKey: qk.promptPurchases });
      qc.invalidateQueries({ queryKey: qk.prompt(slug) });
      qc.invalidateQueries({ queryKey: qk.prompts });
    },
  });
}

export function useMakeOffer() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.makeOffer, onSuccess: () => qc.invalidateQueries({ queryKey: qk.offers }) });
}

type VotedLaunch = Launch & { voted: boolean };

/** Optimistic upvote: the count rolls and the arrow fills on tap; rolled back if the server refuses. */
type Board = Awaited<ReturnType<typeof api.leaderboard>>;

export function useVote() {
  const qc = useQueryClient();
  const flip = <T extends VotedLaunch>(l: T): T => {
    const { count, voted } = toggleVote(l.upvotes, l.voted);
    return { ...l, upvotes: count, voted };
  };
  return useMutation({
    mutationFn: api.vote,
    onMutate: async (slug: string) => {
      await qc.cancelQueries({ queryKey: qk.launches });
      const prevList = qc.getQueryData<VotedLaunch[]>(qk.launches);
      const prevOne = qc.getQueryData<VotedLaunch | null>(qk.launch(slug));
      qc.setQueryData<VotedLaunch[]>(qk.launches, (list) => list?.map((l) => (l.slug === slug ? flip(l) : l)));
      qc.setQueryData<VotedLaunch | null>(qk.launch(slug), (l) => (l ? flip(l) : l));
      // The vote shows at once on the board; the order is recomputed by the server when it settles.
      qc.setQueriesData<Board>({ queryKey: ["leaderboard"] }, (b) =>
        b ? { board: b.board.map((l) => (l.slug === slug ? flip(l) : l)), sponsored: b.sponsored?.slug === slug ? flip(b.sponsored) : b.sponsored } : b,
      );
      return { prevList, prevOne };
    },
    onError: (_e, slug, ctx) => {
      qc.setQueryData(qk.launches, ctx?.prevList);
      qc.setQueryData(qk.launch(slug), ctx?.prevOne);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["leaderboard"] }),
  });
}

export const useGithubAccount = () => useQuery({ queryKey: qk.github, queryFn: api.githubAccount });
export const useGithubRepos = (enabled: boolean) => useQuery({ queryKey: qk.githubRepos, queryFn: api.githubRepos, enabled });

export function useConnectGithub() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.connectGithub, onSuccess: (acct) => qc.setQueryData(qk.github, acct) });
}

export function useDisconnectGithub() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.disconnectGithub,
    onSuccess: () => {
      qc.setQueryData(qk.github, null);
      qc.removeQueries({ queryKey: qk.githubRepos });
    },
  });
}

export const useScanRepo = () => useMutation({ mutationFn: api.scanRepo });
export const useUploadZip = () => useMutation({ mutationFn: api.uploadZip });

export const useEngagement = (key: string) => useQuery({ queryKey: qk.engagement(key), queryFn: () => api.engagement(key) });
export const useComments = (key: string) => useQuery({ queryKey: qk.comments(key), queryFn: () => api.comments(key) });

/** Optimistic like: the heart fills and the count rolls on tap; rolled back if the server refuses. */
export function useToggleLike(key: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.toggleLike(key),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: qk.engagement(key) });
      const prev = qc.getQueryData<Engagement>(qk.engagement(key));
      qc.setQueryData<Engagement>(qk.engagement(key), (e) => (e ? { ...e, liked: !e.liked, likes: e.likes + (e.liked ? -1 : 1) } : e));
      return { prev };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(qk.engagement(key), ctx?.prev),
  });
}

/** Count a share the moment it's handed off; the number ticks up straight away. */
export function useRecordShare(key: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.recordShare(key),
    onMutate: () => qc.setQueryData<Engagement>(qk.engagement(key), (e) => (e ? { ...e, shares: e.shares + 1 } : e)),
  });
}

export function usePostComment(key: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { body: string; user: { id: string; name: string; handle: string } }) => api.postComment({ key, ...v }),
    onSuccess: (c) => {
      qc.setQueryData<Comment[]>(qk.comments(key), (list) => [c, ...(list ?? [])]);
      qc.setQueryData<Engagement>(qk.engagement(key), (e) => (e ? { ...e, comments: e.comments + 1 } : e));
    },
  });
}

export function useDeleteComment(key: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteComment({ key, id }),
    onMutate: (id) => {
      const prev = qc.getQueryData<Comment[]>(qk.comments(key));
      qc.setQueryData<Comment[]>(qk.comments(key), (list) => list?.filter((c) => c.id !== id));
      qc.setQueryData<Engagement>(qk.engagement(key), (e) => (e ? { ...e, comments: Math.max(0, e.comments - 1) } : e));
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      qc.setQueryData(qk.comments(key), ctx?.prev);
      qc.invalidateQueries({ queryKey: qk.engagement(key) });
    },
  });
}

/** The viewer is part of the key so signing in or out re-ranks For you. */
export const usePosts = (sort: PostSort, viewer: Viewer) =>
  useQuery({ queryKey: qk.posts(sort, viewer.userId ?? "anon"), queryFn: () => api.posts(sort, viewer), placeholderData: (prev) => prev });
export const useThread = (id: string) => useQuery({ queryKey: qk.thread(id), queryFn: () => api.thread(id) });

type Thread = { post: Post; replies: Post[] };

/** Applies a change to a post wherever it is cached: both feed orders and any open thread. */
function patchPostCaches(qc: ReturnType<typeof useQueryClient>, id: string, fn: (p: Post) => Post) {
  qc.setQueriesData<Post[]>({ queryKey: ["posts"] }, (list) => list?.map((p) => (p.id === id ? fn(p) : p)));
  qc.setQueriesData<Thread>({ queryKey: ["thread"] }, (t) => (t ? { post: t.post.id === id ? fn(t.post) : t.post, replies: t.replies.map((r) => (r.id === id ? fn(r) : r)) } : t));
}

/** Optimistic like or repost on a post; rolled back by refetching if the server refuses. */
export function usePostToggle(kind: "like" | "repost") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => (kind === "like" ? api.togglePostLike(id) : api.toggleRepost(id)),
    onMutate: (id) =>
      patchPostCaches(qc, id, (p) =>
        kind === "like" ? { ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) } : { ...p, reposted: !p.reposted, reposts: p.reposts + (p.reposted ? -1 : 1) },
      ),
    onError: () => qc.invalidateQueries({ queryKey: ["posts"] }),
  });
}

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { body: string; attachment?: PostAttachment; parentId?: string; user: { id: string; name: string; handle: string } }) => api.createPost(v),
    onSuccess: (post) => {
      qc.invalidateQueries({ queryKey: ["posts"] });
      if (post.parentId) qc.invalidateQueries({ queryKey: qk.thread(post.parentId) });
    },
  });
}

export function useReportPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.reportPost(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["posts"] });
      qc.invalidateQueries({ queryKey: ["thread"] });
    },
  });
}
