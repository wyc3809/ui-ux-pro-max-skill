import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toggleVote } from "@/lib/launch";
import { api, type SearchParams } from "./mockServer";
import type { Launch } from "./types";

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
};

const HOUR = 60 * 60 * 1000;

export const useTemplates = () => useQuery({ queryKey: qk.templates, queryFn: api.templates, staleTime: 10 * 60 * 1000 });
export const useTemplate = (slug: string) => useQuery({ queryKey: qk.template(slug), queryFn: () => api.template(slug), staleTime: HOUR });
export const useCreator = (handle: string) => useQuery({ queryKey: qk.creator(handle), queryFn: () => api.creator(handle) });
export const useSearch = (p: SearchParams) =>
  useQuery({ queryKey: qk.search(p), queryFn: () => api.search(p), placeholderData: (prev) => prev });
export const usePurchases = () => useQuery({ queryKey: qk.purchases, queryFn: api.purchases });
export const useStudio = () => useQuery({ queryKey: qk.studio, queryFn: api.studio });

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
export function useVote() {
  const qc = useQueryClient();
  const flip = (l: VotedLaunch) => ({ ...l, ...(({ count, voted }) => ({ upvotes: count, voted }))(toggleVote(l.upvotes, l.voted)) });
  return useMutation({
    mutationFn: api.vote,
    onMutate: async (slug: string) => {
      await qc.cancelQueries({ queryKey: qk.launches });
      const prevList = qc.getQueryData<VotedLaunch[]>(qk.launches);
      const prevOne = qc.getQueryData<VotedLaunch | null>(qk.launch(slug));
      qc.setQueryData<VotedLaunch[]>(qk.launches, (list) => list?.map((l) => (l.slug === slug ? flip(l) : l)));
      qc.setQueryData<VotedLaunch | null>(qk.launch(slug), (l) => (l ? flip(l) : l));
      return { prevList, prevOne };
    },
    onError: (_e, slug, ctx) => {
      qc.setQueryData(qk.launches, ctx?.prevList);
      qc.setQueryData(qk.launch(slug), ctx?.prevOne);
    },
  });
}
