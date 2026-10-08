"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiError } from "@/lib/api-client";

function createClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Frequently visited vault data stays fresh for 45s: revisits inside
        // the window cost zero requests. Same browser = same user (session
        // cookies), so user data can never leak across accounts here.
        staleTime: 45_000,
        gcTime: 5 * 60_000,
        // Don't hammer the API on client errors or expired sessions.
        retry: (count, error) =>
          count < 2 && error instanceof ApiError && error.status >= 500,
        refetchOnWindowFocus: false,
      },
    },
  });
}

// Client-side query cache for the whole app shell. Mutations elsewhere
// invalidate via queryClient.invalidateQueries (see lib/queries invalidation
// notes on each mutation call site).
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(createClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
