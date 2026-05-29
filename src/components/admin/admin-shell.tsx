"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  Clock4,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  Radio,
  ScanLine,
  Settings,
  Users2,
  X,
} from "lucide-react";
import { SummerSplashLogo, SummerSplashLogoMark } from "@/components/brand/summer-splash-logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ADMIN_PAGE_BG } from "@/components/admin/admin-theme";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { adminPrefetchCatalog } from "@/lib/admin.functions";
import { ADMIN_LIST_STALE_MS } from "@/lib/admin-query";

const SIDEBAR_W = 72;

export type AdminTabKey =
  | "overview"
  | "events"
  | "slots"
  | "registrations"
  | "reports"
  | "users"
  | "settings";

export const ADMIN_TAB_KEYS: AdminTabKey[] = [
  "overview",
  "events",
  "slots",
  "registrations",
  "reports",
  "users",
  "settings",
];

const ADMIN_TAB_STORAGE_KEY = "splash-admin-tab";

export function parseAdminTabParam(value: string | null | undefined): AdminTabKey {
  if (value && ADMIN_TAB_KEYS.includes(value as AdminTabKey)) return value as AdminTabKey;
  return "overview";
}

export function readStoredAdminTab(): AdminTabKey | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = sessionStorage.getItem(ADMIN_TAB_STORAGE_KEY);
    if (stored && ADMIN_TAB_KEYS.includes(stored as AdminTabKey)) return stored as AdminTabKey;
  } catch {
    /* private mode / blocked storage */
  }
  return null;
}

export function persistAdminTab(tab: AdminTabKey) {
  if (typeof window === "undefined") return;
  try {
    if (tab === "overview") sessionStorage.removeItem(ADMIN_TAB_STORAGE_KEY);
    else sessionStorage.setItem(ADMIN_TAB_STORAGE_KEY, tab);
  } catch {
    /* ignore */
  }
}

export function adminTabFromSearchParams(
  searchParams: Pick<URLSearchParams, "get">,
): AdminTabKey {
  const fromUrl = searchParams.get("tab");
  if (fromUrl) return parseAdminTabParam(fromUrl);
  return readStoredAdminTab() ?? "overview";
}

export function buildAdminHref(tab: AdminTabKey, extra?: Record<string, string>) {
  const params = new URLSearchParams();
  if (tab !== "overview") params.set("tab", tab);
  for (const [key, value] of Object.entries(extra ?? {})) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `/admin?${qs}` : "/admin";
}

const NAV: { key: AdminTabKey; label: string; icon: React.ReactNode }[] = [
  { key: "overview", label: "Overview", icon: <LayoutDashboard className="h-5 w-5 shrink-0" /> },
  { key: "events", label: "Events", icon: <CalendarDays className="h-5 w-5 shrink-0" /> },
  { key: "slots", label: "Schedule", icon: <Clock4 className="h-5 w-5 shrink-0" /> },
  { key: "registrations", label: "Bookings", icon: <ListChecks className="h-5 w-5 shrink-0" /> },
  { key: "reports", label: "Reports", icon: <BarChart3 className="h-5 w-5 shrink-0" /> },
  { key: "users", label: "Guests", icon: <Users2 className="h-5 w-5 shrink-0" /> },
  { key: "settings", label: "Settings", icon: <Settings className="h-5 w-5 shrink-0" /> },
];

function scrollToSchedule() {
  document.getElementById("admin-schedule")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function initialsFromEmail(email?: string | null): string {
  if (!email) return "A";
  const local = email.split("@")[0] ?? "";
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  return (local.slice(0, 2) || "A").toUpperCase();
}

export function AdminShell({
  tab,
  onTabChange,
  children,
}: {
  tab: AdminTabKey;
  onTabChange: (tab: AdminTabKey) => void;
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    void queryClient.prefetchQuery({
      queryKey: ["a-catalog"],
      queryFn: async () => {
        const catalog = await adminPrefetchCatalog();
        queryClient.setQueryData(["a-events"], { events: catalog.events });
        queryClient.setQueryData(["a-slots"], { slots: catalog.slots });
        return catalog;
      },
      staleTime: ADMIN_LIST_STALE_MS,
    });
  }, [queryClient]);

  const displayEmail = user?.email ?? "Admin";
  const avatarLabel = useMemo(() => initialsFromEmail(user?.email), [user?.email]);

  const handleTabChange = useCallback(
    (key: AdminTabKey) => {
      onTabChange(key);
      setMobileOpen(false);
    },
    [onTabChange],
  );

  const goToLiveSchedule = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      handleTabChange("overview");
      if (pathname === "/admin") {
        e.preventDefault();
        router.replace(buildAdminHref("overview", { scroll: "schedule" }), { scroll: false });
      }
    },
    [handleTabChange, pathname, router],
  );

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const adminHomeHref = buildAdminHref(tab);

  const navButton = (n: (typeof NAV)[number]) => {
    const active = tab === n.key;
    return (
      <button
        key={n.key}
        type="button"
        title={n.label}
        onClick={() => handleTabChange(n.key)}
        className={cn(
          "grid h-11 w-11 place-items-center rounded-full transition-all duration-200",
          active
            ? "bg-[#0d9488] text-white shadow-[0_4px_14px_-2px_rgba(13,148,136,0.45)]"
            : "text-[#64748b] hover:bg-[#f0fdfa] hover:text-[#0f766e]",
        )}
      >
        {n.icon}
      </button>
    );
  };

  const sidebarInner = (
    <>
      <button
        type="button"
        onClick={() => handleTabChange("overview")}
        className="mb-6 transition hover:scale-[1.02]"
        aria-label="Summer Splash home"
      >
        <SummerSplashLogoMark />
      </button>
      <nav className="flex flex-1 flex-col items-center gap-2">{NAV.map(navButton)}</nav>
      <button
        type="button"
        onClick={signOut}
        title="Sign out"
        className="mt-4 grid h-11 w-11 place-items-center rounded-2xl text-[#64748b] transition hover:bg-[#fef2f2] hover:text-[#dc2626]"
        aria-label="Sign out"
      >
        <LogOut className="h-5 w-5" />
      </button>
    </>
  );

  return (
    <div className="flex min-h-screen font-[family-name:var(--font-body)]" style={{ background: ADMIN_PAGE_BG }}>
      <aside
        className="fixed inset-y-0 left-0 z-30 hidden flex-col items-center border-r border-[#e2e8f0] bg-white px-3 py-6 shadow-[4px_0_24px_-8px_rgba(15,23,42,0.06)] lg:flex"
        style={{ width: SIDEBAR_W }}
      >
        {sidebarInner}
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/30 lg:hidden"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-[#e2e8f0] bg-white px-4 py-6 lg:hidden"
            >
              <div className="mb-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="grid h-9 w-9 place-items-center rounded-lg text-[#64748b] hover:bg-[#f1f5f9]"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex flex-col items-center gap-2">{NAV.map(navButton)}</div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div
        className="flex min-h-screen min-w-0 flex-1 flex-col transition-[margin-left] duration-200 max-lg:ml-0 lg:ml-[72px]"
      >
        <header className="sticky top-0 z-20 border-b border-[#e2e8f0] bg-white/95 px-4 py-3 shadow-[0_1px_0_rgba(15,23,42,0.04)] backdrop-blur-md sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="grid h-10 w-10 place-items-center rounded-xl border border-[#e2e8f0] bg-white text-[#134e4a] lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <Link href={adminHomeHref} className="flex items-center">
                <SummerSplashLogo size="sm" />
              </Link>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {tab === "overview" ? (
                <button
                  type="button"
                  onClick={scrollToSchedule}
                  className="inline-flex items-center gap-2 rounded-full border border-[#99f6e4] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#0f766e] shadow-sm transition hover:bg-[#f0fdfa]"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#14b8a6] opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[#14b8a6]" />
                  </span>
                  Live schedule
                </button>
              ) : (
                <Link
                  href={buildAdminHref("overview", { scroll: "schedule" })}
                  onClick={goToLiveSchedule}
                  className="inline-flex items-center gap-2 rounded-full border border-[#99f6e4] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#0f766e] shadow-sm transition hover:bg-[#f0fdfa]"
                >
                  <Radio className="h-3 w-3 text-[#14b8a6]" />
                  Live schedule
                </Link>
              )}
              <a
                href="/scanner"
                className="inline-flex items-center gap-1.5 rounded-full border border-[#e2e8f0] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#334155] shadow-sm transition hover:border-[#cbd5e1] hover:bg-[#f8fafc]"
              >
                <ScanLine className="h-3.5 w-3.5 text-[#64748b]" />
                Scanner
              </a>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-full border border-[#e2e8f0] bg-white py-1 pl-1 pr-2 shadow-sm transition hover:bg-[#f8fafc]"
                  >
                    <Avatar className="h-8 w-8 border border-[#e2e8f0]">
                      <AvatarFallback className="bg-[#ccfbf1] text-xs font-bold text-[#0f766e]">
                        {avatarLabel}
                      </AvatarFallback>
                    </Avatar>
                    <ChevronDown className="h-4 w-4 text-[#64748b]" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <div className="px-2 py-1.5 text-xs text-[#64748b]">{displayEmail}</div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleTabChange("settings")}>Settings</DropdownMenuItem>
                  <DropdownMenuItem onClick={signOut} className="text-[#dc2626] focus:text-[#dc2626]">
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="mt-3 flex gap-1 overflow-x-auto scrollbar-none lg:hidden">
            {NAV.map((n) => (
              <button
                key={n.key}
                type="button"
                onClick={() => handleTabChange(n.key)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                  tab === n.key ? "bg-[#0d9488] text-white" : "bg-[#f1f5f9] text-[#64748b]",
                )}
              >
                {n.label}
              </button>
            ))}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
