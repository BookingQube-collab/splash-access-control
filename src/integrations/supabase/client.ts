import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }

  return createBrowserClient<Database>(url, key, {
    auth: {
      // Requires GoTrue PASSKEY_ENABLED on the project (Authentication → Passkeys in dashboard).
      experimental: { passkey: true },
    },
  });
}

let _supabase: ReturnType<typeof createSupabaseBrowserClient> | undefined;

export const supabase = new Proxy({} as ReturnType<typeof createSupabaseBrowserClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseBrowserClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});
