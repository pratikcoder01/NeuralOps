"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApolloProvider } from "@apollo/client/react";
import { apolloClient } from "@/lib/graphql/client";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 2,
            staleTime: 30_000,
            refetchOnWindowFocus: true,
          },
          mutations: {
            retry: 1,
          },
        },
      })
  );

  return (
    <ApolloProvider client={apolloClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </ApolloProvider>
  );
}
