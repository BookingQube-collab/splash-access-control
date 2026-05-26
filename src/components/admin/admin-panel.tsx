"use client";

import { cn } from "@/lib/utils";

export function AdminPanel({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-[#e8e4dc] bg-white p-6 shadow-sm",
        className,
      )}
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold text-[#0a4a52]">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
