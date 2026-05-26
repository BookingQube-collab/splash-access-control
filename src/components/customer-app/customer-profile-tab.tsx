"use client";

import { LogOut, Phone, User } from "lucide-react";

export function CustomerProfileTab({
  mobile,
  displayName,
  passCount,
  onSignOut,
}: {
  mobile: string;
  displayName: string;
  passCount: number;
  onSignOut: () => void;
}) {
  const initial = displayName[0]?.toUpperCase() ?? "G";

  return (
    <div className="space-y-4 px-4 pb-28 pt-2">
      <p className="font-display text-lg font-extrabold text-[#102A43]">Profile</p>

      <div className="rounded-[20px] bg-white p-5 shadow-[0_10px_30px_rgba(16,42,67,0.08)] ring-1 ring-black/[0.04]">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#c4b5fd] font-display text-xl font-extrabold text-[#4c1d95] shadow-inner">
            {initial}
          </span>
          <div className="min-w-0">
            <p className="font-display text-lg font-extrabold text-[#102A43]">{displayName}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-[#102A43]/55">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{mobile}</span>
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3 rounded-2xl bg-[#f3f4f6] px-4 py-3">
          <User className="h-5 w-5 text-[#00A9BC]" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#102A43]/45">Passes on this number</p>
            <p className="font-display text-base font-extrabold text-[#102A43]">{passCount}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onSignOut}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#00A9BC] bg-white py-3.5 text-sm font-bold text-[#00A9BC] transition hover:bg-[#00A9BC]/5"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}
