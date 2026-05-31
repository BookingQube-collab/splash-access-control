"use server";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { isEmailLikeStaffIdentifier, normalizeStaffUsername } from "@/lib/staff-auth";

/** Resolve email or username to the auth email used for signInWithPassword. */
export async function resolveStaffLoginEmail(
  identifier: string,
): Promise<{ email: string } | { error: string }> {
  const raw = identifier.trim();
  if (!raw) {
    return { error: "Enter your email or username" };
  }

  if (isEmailLikeStaffIdentifier(raw)) {
    return { email: raw };
  }

  const username = normalizeStaffUsername(raw);
  if (!username) {
    return { error: "Invalid email or password" };
  }

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("email")
    .eq("username", username)
    .maybeSingle();

  if (error) {
    console.error("[staff-login] username lookup failed:", error.message);
    return { error: "Could not sign in. Try again." };
  }

  const email = data?.email?.trim();
  if (!email) {
    return { error: "Invalid email or password" };
  }

  return { email };
}
