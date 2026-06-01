import { keepPreviousData, type UseQueryOptions } from "@tanstack/react-query";

/** List/catalog data (events, slots, regs) — safe to show stale for tab switches. */
export const ADMIN_LIST_STALE_MS = 60_000;

/** Reports aggregates — refetch on explicit refresh or filter apply. */
export const ADMIN_REPORTS_STALE_MS = 60_000;

/** Guest/user directory — moderate freshness. */
export const ADMIN_USERS_STALE_MS = 30_000;

/** Overview live stats — still polled, but avoid refetch-on-mount churn. */
export const ADMIN_OVERVIEW_STALE_MS = 30_000;
export const ADMIN_OVERVIEW_REFETCH_MS = 15_000;

/** Bookings list/stats — poll while the tab is mounted; pause when the browser tab is hidden. */
export const ADMIN_BOOKINGS_REFETCH_MS = 15_000;

export const adminListQueryDefaults = {
  staleTime: ADMIN_LIST_STALE_MS,
  gcTime: 5 * 60_000,
  refetchOnWindowFocus: false,
  placeholderData: keepPreviousData,
} as const;

export const adminReportsQueryDefaults = {
  staleTime: ADMIN_REPORTS_STALE_MS,
  gcTime: 5 * 60_000,
  refetchOnWindowFocus: false,
  placeholderData: keepPreviousData,
} as const;

export const adminUsersQueryDefaults = {
  staleTime: ADMIN_USERS_STALE_MS,
  gcTime: 5 * 60_000,
  refetchOnWindowFocus: false,
  placeholderData: keepPreviousData,
} as const;

export const adminOverviewQueryDefaults = {
  staleTime: ADMIN_OVERVIEW_STALE_MS,
  refetchInterval: ADMIN_OVERVIEW_REFETCH_MS,
  refetchOnWindowFocus: false,
  placeholderData: keepPreviousData,
} as const;

export const adminBookingsQueryDefaults = {
  ...adminListQueryDefaults,
  refetchInterval: ADMIN_BOOKINGS_REFETCH_MS,
  refetchIntervalInBackground: false,
  refetchOnWindowFocus: true,
} as const;

export function adminEventsQueryOptions<TData = Awaited<ReturnType<typeof import("@/lib/admin.functions").adminListEvents>>>(
  queryFn: () => Promise<TData>,
): Pick<UseQueryOptions<TData>, "queryKey" | "queryFn" | "staleTime" | "gcTime" | "refetchOnWindowFocus" | "placeholderData"> {
  return {
    queryKey: ["a-events"],
    queryFn,
    ...adminListQueryDefaults,
  };
}

export function adminSlotsQueryOptions<TData>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<TData>,
): Pick<UseQueryOptions<TData>, "queryKey" | "queryFn" | "staleTime" | "gcTime" | "refetchOnWindowFocus" | "placeholderData"> {
  return {
    queryKey,
    queryFn,
    ...adminListQueryDefaults,
  };
}
