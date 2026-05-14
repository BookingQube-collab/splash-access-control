import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LogOut, Waves } from "lucide-react";

export function RoleGuard({ role, loginPath, children, nav }: {
  role: AppRole;
  loginPath: string;
  children: React.ReactNode;
  nav?: React.ReactNode;
}) {
  const { loading, session, hasRole, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!session) navigate({ to: loginPath });
    else if (!hasRole(role)) navigate({ to: loginPath });
  }, [loading, session, hasRole, role, loginPath, navigate, location.pathname]);

  if (loading || !session || !hasRole(role)) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Checking access…</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <Link to="/" className="flex items-center gap-2">
            <Waves className="h-5 w-5 text-primary" />
            <span className="font-display font-bold">SummerSplash</span>
          </Link>
          <div className="flex items-center gap-2">
            {nav}
            <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate({ to: loginPath }); }}>
              <LogOut className="mr-1 h-4 w-4" /> Sign out
            </Button>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
