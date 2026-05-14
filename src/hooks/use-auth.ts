import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type AppRole = "admin" | "dashboard" | "pos" | "scanner";

export interface AuthState {
  session: Session | null;
  user: User | null;
  roles: AppRole[];
  loading: boolean;
}

export function useAuth(): AuthState & {
  signOut: () => Promise<void>;
  hasRole: (r: AppRole) => boolean;
} {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) {
        // defer role fetch
        setTimeout(() => {
          supabase.from("user_roles").select("role").eq("user_id", s.user.id).then(({ data }) => {
            setRoles(((data ?? []) as { role: AppRole }[]).map((r) => r.role));
          });
        }, 0);
      } else {
        setRoles([]);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        supabase.from("user_roles").select("role").eq("user_id", data.session.user.id).then(({ data: r }) => {
          setRoles(((r ?? []) as { role: AppRole }[]).map((x) => x.role));
          setLoading(false);
        });
      } else {
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
    signOut: async () => { await supabase.auth.signOut(); },
    hasRole: (r) => roles.includes(r) || roles.includes("admin"),
  };
}
