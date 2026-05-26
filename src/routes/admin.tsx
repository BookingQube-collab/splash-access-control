"use client";

import dynamic from "next/dynamic";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RoleGuard } from "@/components/role-guard";
import { AdminNavigationProvider } from "@/components/admin/admin-navigation";
import {
  AdminShell,
  parseAdminTabParam,
  type AdminTabKey,
} from "@/components/admin/admin-shell";
import { AdminOverviewSection } from "@/components/admin/admin-overview-section";
import { ADMIN_CARD } from "@/components/admin/admin-theme";
import { cn } from "@/lib/utils";

function AdminTabLoading() {
  return (
    <div className={cn(ADMIN_CARD, "py-16 text-center text-sm text-[#64748b]")}>
      Loading…
    </div>
  );
}

const AdminBookingsSection = dynamic(
  () =>
    import("@/components/admin/admin-bookings-section").then((m) => ({
      default: m.AdminBookingsSection,
    })),
  { loading: AdminTabLoading },
);

const AdminEventsSection = dynamic(
  () =>
    import("@/components/admin/admin-events-section").then((m) => ({
      default: m.AdminEventsSection,
    })),
  { loading: AdminTabLoading },
);

const AdminSlotsSection = dynamic(
  () =>
    import("@/components/admin/admin-slots-section").then((m) => ({
      default: m.AdminSlotsSection,
    })),
  { loading: AdminTabLoading },
);

const AdminGuestsSection = dynamic(
  () =>
    import("@/components/admin/admin-guests-section").then((m) => ({
      default: m.AdminGuestsSection,
    })),
  { loading: AdminTabLoading },
);

const AdminReportsTab = dynamic(
  () =>
    import("@/components/admin/admin-reports-tab").then((m) => ({
      default: m.AdminReportsTab,
    })),
  { loading: AdminTabLoading },
);

const AdminSettingsTab = dynamic(
  () =>
    import("@/components/admin/admin-settings-tab").then((m) => ({
      default: m.AdminSettingsTab,
    })),
  { loading: AdminTabLoading },
);

export default function AdminPage() {
  return (
    <RoleGuard role="admin" bare>
      <Suspense
        fallback={
          <div className={cn(ADMIN_CARD, "m-8 py-16 text-center text-sm text-[#64748b]")}>Loading…</div>
        }
      >
        <Admin />
      </Suspense>
    </RoleGuard>
  );
}

function scrollToAdminSchedule() {
  document.getElementById("admin-schedule")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function Admin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<AdminTabKey>(() => parseAdminTabParam(searchParams.get("tab")));

  useEffect(() => {
    setTab(parseAdminTabParam(searchParams.get("tab")));
  }, [searchParams]);

  useEffect(() => {
    if (tab !== "overview" || searchParams.get("scroll") !== "schedule") return;
    const t = window.setTimeout(scrollToAdminSchedule, 80);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("scroll");
    const qs = params.toString();
    router.replace(qs ? `/admin?${qs}` : "/admin", { scroll: false });
    return () => window.clearTimeout(t);
  }, [tab, searchParams, router]);

  const onTabChange = useCallback(
    (key: AdminTabKey) => {
      setTab(key);
      const params = new URLSearchParams(searchParams.toString());
      params.delete("scroll");
      if (key === "overview") params.delete("tab");
      else params.set("tab", key);
      const qs = params.toString();
      router.replace(qs ? `/admin?${qs}` : "/admin", { scroll: false });
    },
    [router, searchParams],
  );

  return (
    <AdminNavigationProvider onTabChange={onTabChange}>
      <AdminShell tab={tab} onTabChange={onTabChange}>
        {tab === "overview" && <AdminOverviewSection />}
        {tab === "events" && <AdminEventsSection />}
        {tab === "slots" && <AdminSlotsSection />}
        {tab === "registrations" && <AdminBookingsSection />}
        {tab === "reports" && <AdminReportsTab />}
        {tab === "users" && <AdminGuestsSection />}
        {tab === "settings" && <AdminSettingsTab />}
      </AdminShell>
    </AdminNavigationProvider>
  );
}
