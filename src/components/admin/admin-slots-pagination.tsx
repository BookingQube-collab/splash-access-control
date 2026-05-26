"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ADMIN_TEAL } from "@/components/admin/admin-theme";

export function AdminSlotsPagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, total);

  const pages = buildPageList(safePage, totalPages);

  return (
    <div className="flex flex-col gap-3 border-t border-[#f1f5f9] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <p className="text-sm text-[#64748b]">
        Showing <span className="font-semibold text-[#334155]">{from}</span> to{" "}
        <span className="font-semibold text-[#334155]">{to}</span> of{" "}
        <span className="font-semibold text-[#334155]">{total}</span> slot{total === 1 ? "" : "s"}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          className="grid h-9 w-9 place-items-center rounded-lg border border-[#e2e8f0] bg-white text-[#64748b] transition hover:bg-[#f8fafc] disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`e-${i}`} className="px-1 text-sm text-[#94a3b8]">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={cn(
                "grid h-9 min-w-9 place-items-center rounded-lg px-2 text-sm font-semibold transition",
                p === safePage
                  ? "text-white shadow-sm"
                  : "border border-[#e2e8f0] bg-white text-[#64748b] hover:bg-[#f8fafc]",
              )}
              style={p === safePage ? { background: ADMIN_TEAL } : undefined}
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
          className="grid h-9 w-9 place-items-center rounded-lg border border-[#e2e8f0] bg-white text-[#64748b] transition hover:bg-[#f8fafc] disabled:opacity-40"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function buildPageList(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  if (current > 3) out.push("…");
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
    out.push(p);
  }
  if (current < total - 2) out.push("…");
  out.push(total);
  return out;
}
