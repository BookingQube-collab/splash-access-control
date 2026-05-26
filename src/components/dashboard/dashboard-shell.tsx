"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Bell,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Plus,
  ScanLine,
  Settings,
  ShoppingBag,
} from "lucide-react";
import { SummerSplashLogoMark } from "@/components/brand/summer-splash-logo";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

const SIDEBAR_BG = "#25282e";
const CREAM = "#FAF8F4";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  match?: (path: string) => boolean;
  adminOnly?: boolean;
};

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-5 w-5" />, match: (p) => p === "/dashboard" },
  { href: "/admin", label: "Calendar", icon: <CalendarDays className="h-5 w-5" />, adminOnly: true },
  { href: "/admin", label: "Events", icon: <ClipboardList className="h-5 w-5" />, adminOnly: true },
  { href: "/admin", label: "Registrations", icon: <ClipboardList className="h-5 w-5" />, adminOnly: true },
  { href: "/admin", label: "Reports", icon: <BarChart3 className="h-5 w-5" />, adminOnly: true },
];

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function DashboardShell({
  displayName,
  headerExtra,
  addHref,
  children,
}: {
  displayName: string;
  headerExtra?: React.ReactNode;
  addHref: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut, hasRole } = useAuth();
  const isAdmin = hasRole("admin");

  const staffLinks = [
    hasRole("scanner") && { href: "/scanner", label: "Scanner", icon: <ScanLine className="h-5 w-5" /> },
    hasRole("pos") && { href: "/pos", label: "POS", icon: <ShoppingBag className="h-5 w-5" /> },
  ].filter(Boolean) as { href: string; label: string; icon: React.ReactNode }[];

  return (
    <div className="flex min-h-screen" style={{ background: CREAM }}>
      <aside
        className="fixed inset-y-0 left-0 z-30 flex w-[72px] flex-col items-center py-5 lg:w-[88px]"
        style={{ background: SIDEBAR_BG }}
      >
        <SummerSplashLogoMark href="/dashboard" className="mb-8" />

        <nav className="flex flex-1 flex-col items-center gap-2">
          {NAV.filter((n) => !n.adminOnly || isAdmin).map((item) => {
            const active = item.match ? item.match(pathname ?? "") : pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                title={item.label}
                className={cn(
                  "grid h-11 w-11 place-items-center rounded-xl transition-colors",
                  active ? "bg-white/15 text-white" : "text-white/45 hover:bg-white/8 hover:text-white/80",
                )}
              >
                {item.icon}
              </Link>
            );
          })}
          {staffLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className="grid h-11 w-11 place-items-center rounded-xl text-white/45 transition-colors hover:bg-white/8 hover:text-white/80"
            >
              {item.icon}
            </Link>
          ))}
        </nav>

        <div className="flex flex-col items-center gap-2">
          {isAdmin && (
            <Link
              href="/admin"
              title="Settings"
              className="grid h-11 w-11 place-items-center rounded-xl text-white/45 transition-colors hover:bg-white/8 hover:text-white/80"
            >
              <Settings className="h-5 w-5" />
            </Link>
          )}
          <button
            type="button"
            title="Sign out"
            onClick={async () => {
              await signOut();
              router.push("/login");
            }}
            className="grid h-11 w-11 place-items-center rounded-xl text-white/45 transition-colors hover:bg-white/8 hover:text-white/80"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </aside>

      <div className="ml-[72px] flex min-h-screen min-w-0 flex-1 flex-col lg:ml-[88px]" style={{ background: CREAM }}>
        <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4 border-b border-[#e8e4dc] bg-[#FAF8F4]/95 px-5 py-4 backdrop-blur-md sm:px-8">
          <div>
            <p className="text-sm text-[#5a7a80]">{getGreeting()},</p>
            <h1 className="font-display text-2xl font-bold tracking-tight text-[#0a4a52] sm:text-3xl">{displayName}</h1>
          </div>

          <div className="flex items-center gap-2">
            {headerExtra}
            <Button
              asChild
              className="h-10 rounded-full bg-[#0a4a52] px-5 font-semibold text-white shadow-md hover:bg-[#0a4a52]/90"
            >
              <Link href={addHref}>
                <Plus className="mr-1.5 h-4 w-4" />
                Add
              </Link>
            </Button>
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-full border border-[#dce8ea] bg-white text-[#5a7a80]"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
            </button>
            <Link
              href={isAdmin ? "/admin" : "/dashboard"}
              className="grid h-10 w-10 place-items-center rounded-full border border-[#dce8ea] bg-white text-[#5a7a80]"
              aria-label="Settings"
            >
              <Settings className="h-4 w-4" />
            </Link>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-6 p-5 sm:p-8 lg:flex-row">{children}</div>
      </div>
    </div>
  );
}
