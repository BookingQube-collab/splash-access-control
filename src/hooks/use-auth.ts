import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import type { AppRole } from "@/lib/staff-auth";

export type { AppRole };

export interface AuthState {
  session: Session | null;
  user: User | null;
  roles: AppRole[];
  loading: boolean;
  /** False until the first role lookup finishes for the current session (or there is no session). */
  rolesLoaded: boolean;
}

export function useAuth(): AuthState & {
  signOut: () => Promise<void>;
  hasRole: (r: AppRole) => boolean;
} {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [rolesLoaded, setRolesLoaded] = useState(false);

  useEffect(() => {
    const loadRoles = (userId: string) => {
      setRolesLoaded(false);
      return supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .then(({ data }) => {
          setRoles(((data ?? []) as { role: AppRole }[]).map((r) => r.role));
          setRolesLoaded(true);
        });
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) {
        void loadRoles(s.user.id);
      } else {
        setRoles([]);
        setRolesLoaded(true);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        void loadRoles(data.session.user.id).then(() => setLoading(false));
      } else {
        setRolesLoaded(true);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    session,
    user: session?.user ?? null,
    roles,
    loading,
    rolesLoaded,
    signOut: async () => { await supabase.auth.signOut(); },
    hasRole: (r) => roles.includes(r) || roles.includes("admin"),
  };
}
