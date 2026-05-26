"use client";

import { createContext, useCallback, useContext, useMemo, useRef } from "react";
import type { AdminTabKey } from "@/components/admin/admin-shell";

type AdminNavigationContextValue = {
  navigateToTab: (tab: AdminTabKey) => void;
  navigateToBookings: (search?: string) => void;
  consumeBookingsSearch: () => string | undefined;
};

const AdminNavigationContext = createContext<AdminNavigationContextValue | null>(null);

export function AdminNavigationProvider({
  onTabChange,
  children,
}: {
  onTabChange: (tab: AdminTabKey) => void;
  children: React.ReactNode;
}) {
  const pendingBookingsSearch = useRef<string | undefined>(undefined);

  const navigateToTab = useCallback(
    (tab: AdminTabKey) => {
      onTabChange(tab);
    },
    [onTabChange],
  );

  const navigateToBookings = useCallback(
    (search?: string) => {
      pendingBookingsSearch.current = search?.trim() || undefined;
      onTabChange("registrations");
    },
    [onTabChange],
  );

  const consumeBookingsSearch = useCallback(() => {
    const search = pendingBookingsSearch.current;
    pendingBookingsSearch.current = undefined;
    return search;
  }, []);

  const value = useMemo(
    () => ({ navigateToTab, navigateToBookings, consumeBookingsSearch }),
    [navigateToTab, navigateToBookings, consumeBookingsSearch],
  );

  return (
    <AdminNavigationContext.Provider value={value}>{children}</AdminNavigationContext.Provider>
  );
}

export function useAdminNavigation(): AdminNavigationContextValue {
  const ctx = useContext(AdminNavigationContext);
  if (!ctx) {
    throw new Error("useAdminNavigation must be used within AdminNavigationProvider");
  }
  return ctx;
}
