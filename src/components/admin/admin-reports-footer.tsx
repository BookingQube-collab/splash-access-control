"use client";

import { Info, RefreshCw } from "lucide-react";
import { formatReportsUpdatedLabel } from "@/components/admin/admin-reports-utils";
import { cn } from "@/lib/utils";

export function AdminReportsFooter({
  onRefresh,
  isRefreshing,
  dataUpdatedAt,
}: {
  onRefresh: () => void;
  isRefreshing?: boolean;
  dataUpdatedAt?: number;
}) {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-4 px-1 pt-2">
      <p className="flex max-w-xl items-start gap-2 text-xs text-[#94a3b8]">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#cbd5e1]" />
        All data is based on the selected filters and date range. Switch to Server mode and
        apply filters to refresh totals from the database.
      </p>
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-[#94a3b8]">
          {formatReportsUpdatedLabel(dataUpdatedAt)}
        </span>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className={cn(
            "inline-flex h-9 items-center gap-2 rounded-[12px] border border-[#e2e8f0] bg-white px-3.5 text-xs font-semibold text-[#334155] transition hover:bg-[#f8fafc] disabled:opacity-60",
          )}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
          Refresh
        </button>
      </div>
    </footer>
  );
}
