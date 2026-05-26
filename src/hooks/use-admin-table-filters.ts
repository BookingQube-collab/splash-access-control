"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type AdminFilterMode,
  type AdminTableFilters,
  emptyAdminTableFilters,
  hasActiveFilters,
} from "@/lib/admin-filters.types";

export type AdminFilterChip = {
  key: keyof AdminTableFilters | "mode";
  label: string;
};

export type UseAdminTableFiltersOptions<T> = {
  mode?: AdminFilterMode;
  rows: T[];
  filterRow: (row: T, filters: AdminTableFilters, search: string) => boolean;
  onServerApply?: (filters: AdminTableFilters) => void;
  resolveChips?: (filters: AdminTableFilters) => AdminFilterChip[];
};

export function useAdminTableFilters<T>({
  mode: initialMode = "local",
  rows,
  filterRow,
  onServerApply,
  resolveChips,
}: UseAdminTableFiltersOptions<T>) {
  const [mode, setMode] = useState<AdminFilterMode>(initialMode);
  const [filters, setFilters] = useState<AdminTableFilters>(emptyAdminTableFilters);
  const [serverFilters, setServerFilters] = useState<AdminTableFilters>(emptyAdminTableFilters);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(filters.search.trim()), 200);
    return () => window.clearTimeout(t);
  }, [filters.search]);

  const patchFilters = useCallback((patch: Partial<AdminTableFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  const activeForDisplay = mode === "server" ? serverFilters : filters;
  const searchForLocal = debouncedSearch;

  const filteredRows = useMemo(() => {
    if (mode === "server") return rows;
    const local = { ...filters, search: searchForLocal };
    return rows.filter((row) => filterRow(row, local, searchForLocal));
  }, [mode, rows, filters, searchForLocal, filterRow]);

  const applyServerFilter = useCallback(() => {
    setServerFilters(filters);
    onServerApply?.(filters);
  }, [filters, onServerApply]);

  const clearServerFilters = useCallback(() => {
    const empty = emptyAdminTableFilters();
    setFilters(empty);
    setServerFilters(empty);
    onServerApply?.(empty);
  }, [onServerApply]);

  const clearAll = useCallback(() => {
    const empty = emptyAdminTableFilters();
    setFilters(empty);
    setServerFilters(empty);
    if (mode === "server") onServerApply?.(empty);
  }, [mode, onServerApply]);

  const removeChip = useCallback(
    (key: keyof AdminTableFilters) => {
      const patch = { [key]: key === "search" ? "" : "" } as Partial<AdminTableFilters>;
      const next = { ...activeForDisplay, ...patch };
      setFilters(next);
      if (mode === "server") {
        setServerFilters(next);
        onServerApply?.(next);
      }
    },
    [activeForDisplay, mode, onServerApply],
  );

  const chips = useMemo(() => {
    if (resolveChips) return resolveChips(activeForDisplay);
    const out: AdminFilterChip[] = [];
    if (activeForDisplay.search.trim()) {
      out.push({ key: "search", label: `Search: ${activeForDisplay.search.trim()}` });
    }
    if (activeForDisplay.eventId) out.push({ key: "eventId", label: `Event` });
    if (activeForDisplay.slotId) out.push({ key: "slotId", label: `Slot` });
    if (activeForDisplay.status) out.push({ key: "status", label: `Status` });
    if (activeForDisplay.dateFrom) {
      out.push({ key: "dateFrom", label: `From ${activeForDisplay.dateFrom}` });
    }
    if (activeForDisplay.dateTo) {
      out.push({ key: "dateTo", label: `To ${activeForDisplay.dateTo}` });
    }
    return out;
  }, [activeForDisplay, resolveChips]);

  return {
    mode,
    setMode,
    filters,
    setFilters: patchFilters,
    serverFilters,
    filteredRows,
    applyServerFilter,
    clearServerFilters,
    clearAll,
    removeChip,
    chips,
    hasActive: hasActiveFilters(activeForDisplay),
  };
}
