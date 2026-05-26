import { cache } from "react";
import { createSupabaseServerClient } from "@/integrations/supabase/server";
import {
  AUTH_SESSION_CHECK_FAILED,
  AUTH_SIGN_IN_AGAIN,
  isAuthNetworkError,
  isAuthSessionMissing,
} from "@/lib/auth-errors";

async function resolveAuthUser(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  try {
    return await supabase.auth.getUser();
  } catch (error) {
    if (isAuthNetworkError(error)) {
      throw new Error(AUTH_SESSION_CHECK_FAILED);
    }
    throw error;
  }
}

export const getAuthContext = cache(async function getAuthContext() {
  const supabase = await createSupabaseServerClient();

  let result = await resolveAuthUser(supabase);
  let { data: { user }, error } = result;

  if ((error || !user) && error && isAuthNetworkError(error)) {
    result = await resolveAuthUser(supabase);
    ({ data: { user }, error } = result);
  }

  if (error) {
    if (isAuthNetworkError(error)) {
      throw new Error(AUTH_SESSION_CHECK_FAILED);
    }
    if (isAuthSessionMissing(error)) {
      throw new Error(AUTH_SIGN_IN_AGAIN);
    }
    throw new Error(AUTH_SIGN_IN_AGAIN);
  }

  if (!user) {
    throw new Error(AUTH_SIGN_IN_AGAIN);
  }

  return { supabase, userId: user.id };
});
