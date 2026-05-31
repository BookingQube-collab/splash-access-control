"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { userHasRoleAccess } from "@/lib/staff-auth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { SummerSplashLogo } from "@/components/brand/summer-splash-logo";
import { UNIFIED_LOGIN_PATH } from "@/lib/staff-auth";

type RoleGuardProps = {
  loginPath?: string;
  children: React.ReactNode;
  nav?: React.ReactNode;
  /** When true, render children without the default header chrome — the route brings its own. */
  bare?: boolean;
} & (
  | { role: AppRole; checkAccess?: never }
  | { role?: never; checkAccess: (roles: AppRole[]) => boolean }
);

export function RoleGuard({
  role,
  checkAccess,
  loginPath = UNIFIED_LOGIN_PATH,
  children,
  nav,
  bare,
}: RoleGuardProps) {
  const { loading, rolesLoaded, session, roles, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const allowed = useMemo(
    () => (checkAccess ? checkAccess(roles) : userHasRoleAccess(roles, role)),
    [roles, role, checkAccess],
  );
  const accessGranted = Boolean(session && allowed && rolesLoaded);
  const wasGrantedRef = useRef(false);
  if (accessGranted) wasGrantedRef.current = true;

  useEffect(() => {
    if (!session) wasGrantedRef.current = false;
  }, [session]);

  useEffect(() => {
    if (loading || !rolesLoaded) return;
    if (!session) router.push(loginPath);
    else if (!allowed) router.push(loginPath);
  }, [loading, rolesLoaded, session, allowed, role, loginPath, router, pathname]);

  const showInitialGate = !wasGrantedRef.current && (loading || !rolesLoaded || !session || !allowed);
  const showStickyContent = wasGrantedRef.current && session && allowed;

  if (showInitialGate) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Checking access…
      </div>
    );
  }

  if (!showStickyContent && (!session || !allowed)) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Checking access…
      </div>
    );
  }

  if (bare) return <>{children}</>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <SummerSplashLogo href="/" size="sm" />
          <div className="flex items-center gap-2">
            {nav}
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await signOut();
                router.push(loginPath);
              }}
            >
              <LogOut className="mr-1 h-4 w-4" /> Sign out
            </Button>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
