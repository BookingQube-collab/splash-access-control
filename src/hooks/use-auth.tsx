"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
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

type AuthContextValue = AuthState & {
  signOut: () => Promise<void>;
  hasRole: (r: AppRole) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [rolesLoaded, setRolesLoaded] = useState(false);
  const rolesUserIdRef = useRef<string | null>(null);
  const rolesLoadedRef = useRef(false);

  useEffect(() => {
    const loadRoles = (userId: string, options?: { background?: boolean }) => {
      const sameUser = rolesUserIdRef.current === userId;
      if (!options?.background && !sameUser) {
        setRolesLoaded(false);
        rolesLoadedRef.current = false;
      }
      rolesUserIdRef.current = userId;

      return supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .then(({ data }) => {
          setRoles(((data ?? []) as { role: AppRole }[]).map((r) => r.role));
          setRolesLoaded(true);
          rolesLoadedRef.current = true;
        });
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (s?.user) {
        const background =
          event === "TOKEN_REFRESHED" ||
          (rolesUserIdRef.current === s.user.id && rolesLoadedRef.current);
        void loadRoles(s.user.id, { background });
      } else {
        rolesUserIdRef.current = null;
        rolesLoadedRef.current = true;
        setRoles([]);
        setRolesLoaded(true);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        void loadRoles(data.session.user.id).then(() => setLoading(false));
      } else {
        rolesLoadedRef.current = true;
        setRolesLoaded(true);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only bootstrap
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const hasRole = useCallback(
    (r: AppRole) => roles.includes(r) || roles.includes("admin"),
    [roles],
  );

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    roles,
    loading,
    rolesLoaded,
    signOut,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
