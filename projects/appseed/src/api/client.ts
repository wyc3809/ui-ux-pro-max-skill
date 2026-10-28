import { QueryClient } from "@tanstack/react-query";

/** The one query cache, shared by the provider and by account changes that must refresh or wipe it. */
export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, staleTime: 60_000, refetchOnWindowFocus: false } },
});
