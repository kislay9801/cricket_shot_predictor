"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { SessionProvider } from "./session";
import { LastAnalysisProvider } from "./lastAnalysis";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <LastAnalysisProvider>{children}</LastAnalysisProvider>
      </SessionProvider>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: "#FFFFFF",
            color: "#111827",
            border: "1px solid #E5E7EB",
            borderRadius: "12px",
            boxShadow:
              "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
            fontSize: "14px",
          },
          success: { iconTheme: { primary: "#059669", secondary: "#FFFFFF" } },
          error: { iconTheme: { primary: "#DC2626", secondary: "#FFFFFF" } },
        }}
      />
    </QueryClientProvider>
  );
}
