"use client";

import { useMemo, useState } from "react";
import { Check, Clock, History } from "lucide-react";
import { ScannerSearchRow } from "@/components/scanner/scanner-search-row";
import { SCANNER_CORAL, SCANNER_NAVY } from "@/components/scanner/scanner-theme";
import {
  formatDisplayPhone,
  formatGuestCountLabel,
  formatScanTime,
  pastelInitialsClass,
  recentScanPrimaryName,
  recentScanTimeRange,
  slotInitials,
  type RecentScanItem,
} from "@/components/scanner/scanner-types";
import { cn } from "@/lib/utils";

function phoneMatches(scan: RecentScanItem, query: string): boolean {
  const q = query.replace(/\D/g, "");
  if (!q) return true;
  const phone = (scan.phone ?? "").replace(/\D/g, "");
  return phone.includes(q);
}

export function ScannerMobileRecentView({
  scans,
  loading,
}: {
  scans: RecentScanItem[];
  loading?: boolean;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () => scans.filter((s) => phoneMatches(s, search.trim())),
    [scans, search],
  );

  return (
    <div className="flex flex-col gap-3 pb-2">
      <section className="rounded-[1.25rem] border border-white/80 bg-white p-4 shadow-[0_6px_24px_rgba(10,37,64,0.08)]">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-base font-bold" style={{ color: SCANNER_NAVY }}>
            Recent scans
          </h2>
          <span
            className="grid h-9 w-9 place-items-center rounded-full"
            style={{ backgroundColor: "#FFF5F0" }}
          >
            <History className="h-4 w-4" strokeWidth={2} style={{ color: SCANNER_CORAL }} />
          </span>
        </div>

        <ScannerSearchRow value={search} onChange={setSearch} className="mb-3" />

        {loading && scans.length === 0 ? (
          <div className="space-y-2 py-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-[#f5f5f7]" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-10 text-center text-sm" style={{ color: `${SCANNER_NAVY}88` }}>
            {search.trim() ? "No scans match this number." : "No scans today yet."}
          </p>
        ) : (
          <ul className="divide-y divide-[#f0f2f5]">
            {filtered.map((scan) => (
              <RecentScanRow key={scan.id} scan={scan} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function RecentScanRow({ scan }: { scan: RecentScanItem }) {
  const primary = recentScanPrimaryName(scan);
  const timeRange = recentScanTimeRange(scan);
  const scannedAt = formatScanTime(scan.scannedAt);

  return (
    <li className="flex items-center gap-2.5 py-3 first:pt-0">
      <div
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-full text-[10px] font-semibold",
          pastelInitialsClass(primary),
        )}
      >
        {slotInitials(primary)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold" style={{ color: SCANNER_NAVY }}>
          {scan.slotName}
        </p>
        <p className="truncate text-xs" style={{ color: `${SCANNER_NAVY}88` }}>
          {formatDisplayPhone(scan.phone)}
        </p>
        {timeRange ? (
          <p className="mt-0.5 flex items-center gap-1 truncate text-[10px]" style={{ color: `${SCANNER_NAVY}66` }}>
            <Clock className="h-2.5 w-2.5 shrink-0" strokeWidth={2} />
            {timeRange}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <div className="flex items-center gap-1.5">
          {scan.guestCount != null && scan.guestCount > 0 && (
            <span className="inline-flex rounded-full bg-[#e8f4ff] px-2 py-0.5 text-[10px] font-medium text-[#3d6a9e]">
              {formatGuestCountLabel(scan.guestCount)}
            </span>
          )}
          <span className="grid h-5 w-5 place-items-center rounded-full bg-[#2db87a] text-white">
            <Check className="h-3 w-3" strokeWidth={3} />
          </span>
        </div>
        {scannedAt ? (
          <span className="text-[10px] font-medium" style={{ color: `${SCANNER_NAVY}66` }}>
            {scannedAt}
          </span>
        ) : null}
      </div>
    </li>
  );
}
