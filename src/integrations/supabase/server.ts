import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import type { Database } from "./types";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase URL or publishable key");
  }

  return createServerClient<Database>(url, key, {
    global: { fetch: fetchWithTimeout() },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Component — cookie writes may be ignored
        }
      },
    },
  });
}
