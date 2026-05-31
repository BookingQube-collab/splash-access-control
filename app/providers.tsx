"use client";

import dynamic from "next/dynamic";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AuthChangeEvent } from "@supabase/supabase-js";

const Toaster = dynamic(
  () => import("@/components/ui/sonner").then((m) => ({ default: m.Toaster })),
  { ssr: false },
);
import { supabase } from "@/integrations/supabase/client";
import { isSupabaseConfigured, SupabaseConfigRequired } from "@/components/supabase-config-required";
import { ThemeClassSync } from "@/components/theme-class-sync";
import { AuthProvider } from "@/hooks/use-auth";

/** Auth events that should refresh server components and invalidate client queries. */
const SESSION_MUTATING_EVENTS = new Set<AuthChangeEvent>([
  "SIGNED_IN",
  "SIGNED_OUT",
  "USER_UPDATED",
]);

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );
  const router = useRouter();
  const configured = isSupabaseConfigured();

  useEffect(() => {
    if (!configured) return;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (!SESSION_MUTATING_EVENTS.has(event)) return;
      router.refresh();
      void queryClient.invalidateQueries();
    });
    return () => subscription.unsubscribe();
  }, [configured, queryClient, router]);

  if (!configured) {
    return <SupabaseConfigRequired />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeClassSync />
        {children}
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
