"use client";

import { ADMIN_CARD } from "@/components/admin/admin-theme";
import { cn } from "@/lib/utils";

export function AdminReportsCard({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <article className={cn(ADMIN_CARD, "flex flex-col p-5 sm:p-6", className)}>
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
          {title ? (
            <h3 className="font-display text-base font-bold text-[#134e4a]">{title}</h3>
          ) : (
            <span />
          )}
          {action}
        </div>
      )}
      {children}
    </article>
  );
}

export function AdminReportsStatBlocks({
  stats,
  columns = 3,
}: {
  stats: { label: string; value: string }[];
  columns?: 2 | 3;
}) {
  return (
    <div
      className={cn(
        "mt-4 grid gap-3 border-t border-[#f1f5f9] pt-4",
        columns === 2 ? "grid-cols-2" : "grid-cols-3",
      )}
    >
      {stats.map((s) => (
        <div key={s.label} className="rounded-[14px] bg-[#f8fafc] px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">
            {s.label}
          </p>
          <p className="mt-0.5 font-display text-lg font-extrabold tabular-nums text-[#134e4a]">
            {s.value}
          </p>
        </div>
      ))}
    </div>
  );
}

export function AdminReportsEmpty({ message }: { message: string }) {
  return (
    <p className="flex min-h-[180px] items-center justify-center text-center text-sm text-[#94a3b8]">
      {message}
    </p>
  );
}
