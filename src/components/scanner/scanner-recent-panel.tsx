"use client";

import { useMemo, useState } from "react";
import { Check, ChevronRight, Clock, History } from "lucide-react";
import { ScannerSearchRow } from "@/components/scanner/scanner-search-row";
import { cn } from "@/lib/utils";
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

const VISIBLE_ROWS = 5;
const ROW_HEIGHT_PX = 58;

function phoneMatches(scan: RecentScanItem, query: string): boolean {
  const q = query.replace(/\D/g, "");
  if (!q) return true;
  const phone = (scan.phone ?? "").replace(/\D/g, "");
  return phone.includes(q);
}

export function ScannerRecentPanel({
  scans,
  loading,
}: {
  scans: RecentScanItem[];
  loading?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [showAllDialog, setShowAllDialog] = useState(false);

  const filtered = useMemo(
    () => scans.filter((s) => phoneMatches(s, search.trim())),
    [scans, search],
  );
  const visible = filtered.slice(0, VISIBLE_ROWS);

  return (
    <>
      <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-[#ebebef] bg-white p-4 shadow-[0_2px_12px_rgba(15,39,74,0.06)]">
        <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-[#1a2b4a]">Recent scans</h2>
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#f5f5f7] text-[#ff7e67]">
            <History className="h-3.5 w-3.5" strokeWidth={2} />
          </span>
        </div>

        <ScannerSearchRow value={search} onChange={setSearch} className="mb-3" />

        <div className="min-h-0 flex-1 overflow-hidden">
          {loading && scans.length === 0 ? (
            <div className="space-y-2 py-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-[52px] animate-pulse rounded-lg bg-[#f5f5f7]" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <p className="py-6 text-center text-xs text-[#8a8a94]">
              {search.trim() ? "No scans match this number." : "No scans today yet."}
            </p>
          ) : (
            <div className="overflow-hidden">
              {visible.map((scan) => (
                <RecentScanRow key={scan.id} scan={scan} />
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => filtered.length > 0 && setShowAllDialog(true)}
          className="mt-3 shrink-0 inline-flex w-full items-center justify-center gap-1 rounded-xl bg-[#e8f4ff] py-2.5 text-xs font-medium text-[#3d6a9e] transition hover:bg-[#dceeff] disabled:opacity-50"
          disabled={filtered.length === 0}
        >
          View all scans
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </section>

      {showAllDialog && (
        <ScansOverlay scans={filtered} onClose={() => setShowAllDialog(false)} />
      )}
    </>
  );
}

function RecentScanRow({ scan }: { scan: RecentScanItem }) {
  const primary = recentScanPrimaryName(scan);
  const timeRange = recentScanTimeRange(scan);
  const scannedAt = formatScanTime(scan.scannedAt);

  return (
    <div
      className="flex items-center gap-2 border-b border-[#f0f0f2] py-2 last:border-b-0"
      style={{ minHeight: ROW_HEIGHT_PX }}
    >
      <div
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center rounded-full text-[10px] font-semibold",
          pastelInitialsClass(primary),
        )}
      >
        {slotInitials(primary)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold text-[#1a2b4a]">{scan.slotName}</p>
        <p className="truncate text-[11px] text-[#6b7280]">{formatDisplayPhone(scan.phone)}</p>
        {timeRange ? (
          <p className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-[#9ca3af]">
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
          <span className="text-[10px] font-medium text-[#9ca3af]">{scannedAt}</span>
        ) : null}
      </div>
    </div>
  );
}

function ScansOverlay({ scans, onClose }: { scans: RecentScanItem[]; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4"
      role="dialog"
      aria-modal
      aria-label="All recent scans"
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-full max-w-md overflow-hidden rounded-2xl border border-[#ebebef] bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-[#ebebef] px-4 py-3">
          <h3 className="text-sm font-bold text-[#1a2b4a]">All recent scans</h3>
        </div>
        <div className="max-h-[60vh] overflow-y-auto px-3 py-2">
          {scans.map((scan) => (
            <RecentScanRow key={scan.id} scan={scan} />
          ))}
        </div>
        <div className="border-t border-[#ebebef] p-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-[#e8f4ff] py-2.5 text-xs font-medium text-[#3d6a9e] hover:bg-[#dceeff]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
