"use client";

import { useQuery } from "@tanstack/react-query";
import { adminGetSupabaseEnv } from "@/lib/admin.functions";
import { AUTH_SESSION_CHECK_FAILED, AUTH_SIGN_IN_AGAIN } from "@/lib/auth-errors";

export const SUPABASE_ENV_QUERY_KEY = ["a-supabase-env"] as const;

function actionErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const msg = (error as { message: unknown }).message;
    if (typeof msg === "string") return msg;
  }
  return "";
}

/** Shared React Query for Admin → Settings Supabase env (server action + .env merge). */
export function useSupabaseEnvQuery() {
  return useQuery({
    queryKey: SUPABASE_ENV_QUERY_KEY,
    queryFn: () => adminGetSupabaseEnv(),
    retry: (failureCount, error) => {
      const msg = actionErrorMessage(error);
      if (msg === AUTH_SESSION_CHECK_FAILED && failureCount < 1) return true;
      if (msg === AUTH_SIGN_IN_AGAIN) return false;
      return failureCount < 1;
    },
    staleTime: 30_000,
  });
}
