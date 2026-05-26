"use client";

import { ListFilter, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export function ScannerSearchRow({
  value,
  onChange,
  disabled,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex shrink-0 items-center gap-1.5", className)}>
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#a3a3a8]" />
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="Search by phone number"
          className="w-full rounded-full border border-[#e5e5ea] bg-white py-2 pl-9 pr-3 text-xs font-normal text-[#1a2b4a] outline-none placeholder:text-[#a3a3a8] focus:border-[#ff7e67]/45 focus:ring-2 focus:ring-[#ff7e67]/12 disabled:opacity-50"
        />
      </div>
      <button
        type="button"
        aria-label="Filter"
        disabled={disabled}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#e5e5ea] bg-white text-[#6b7280] transition hover:border-[#d4d4d8] hover:bg-[#fafafa] disabled:opacity-50"
      >
        <ListFilter className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
    </div>
  );
}
