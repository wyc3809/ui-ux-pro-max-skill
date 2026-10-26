import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type SearchParams } from "./mockServer";

export const qk = {
  templates: ["templates"] as const,
  template: (slug: string) => ["template", slug] as const,
  creator: (handle: string) => ["creator", handle] as const,
  search: (p: SearchParams) => ["search", p] as const,
  purchases: ["purchases"] as const,
  studio: ["studio"] as const,
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
