"use client";

import { format } from "date-fns";
import { motion } from "framer-motion";
import { Calendar, CalendarDays, ChevronRight, Ticket, Users } from "lucide-react";
import type { CustomerPass } from "./types";
import {
  computeStats,
  formatSlotTime,
  isUpcomingPass,
  passBookingDate,
  passesOnDate,
  passStart,
} from "./utils";
import { parseYmd, todayYmd } from "@/lib/utils";

function passTypeCaps(p: CustomerPass): string {
  const raw = p.slot_name?.trim() || p.event_name?.trim() || "General guest";
  return raw.replace(/\s+/g, " ").toUpperCase();
}

export function CustomerOverviewTab({
  passes,
  firstName,
  onOpenPass,
}: {
  passes: CustomerPass[];
  firstName: string;
  onOpenPass: (p: CustomerPass) => void;
}) {
  const stats = computeStats(passes);
  const today = todayYmd();
  const todayList = passesOnDate(passes, today)
    .filter((p) => isUpcomingPass(p))
    .sort((a, b) => passStart(a).getTime() - passStart(b).getTime());
  const primary = todayList[0] ?? stats.nextUpcoming ?? null;

  const todayBadge = `Today, ${format(new Date(), "MMM d")}`;

  return (
    <div className="space-y-5 px-4 pb-28 pt-1 font-[family-name:var(--font-body)]">
      <section>
        <h2 className="font-display text-[1.85rem] font-extrabold leading-tight tracking-tight text-[#102A43] drop-shadow-sm">
          Hey 👋 <span className="capitalize">{firstName}</span>
        </h2>
        <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[11px] font-bold text-[#102A43] shadow-[0_4px_16px_rgba(16,42,67,0.1)] ring-1 ring-black/[0.05]">
          <Calendar className="h-3.5 w-3.5 text-[#00A9BC]" />
          {todayBadge}
        </span>
      </section>

      <div className="flex flex-col gap-3">
        {primary ? (
          <motion.button
            type="button"
            layout
            onClick={() => onOpenPass(primary)}
            className="flex w-full items-stretch gap-3 rounded-[20px] bg-[#c5ebe8] p-[1.05rem] text-left shadow-[0_10px_30px_rgba(16,42,67,0.1)] ring-1 ring-white/60 transition active:scale-[0.99]"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-[#00A9BC] shadow-sm">
              <Users className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#00A9BC]">{passTypeCaps(primary)}</p>
              <p className="mt-1 font-display text-2xl font-extrabold text-[#102A43]">{formatSlotTime(primary)}</p>
              <p className="mt-0.5 text-xs font-medium text-[#102A43]/55">
                {primary.guest_count} guest{primary.guest_count === 1 ? "" : "s"}
              </p>
            </div>
            <ChevronRight className="mt-2 h-5 w-5 shrink-0 self-start text-[#102A43]/30" />
          </motion.button>
        ) : (
          <div className="rounded-[20px] bg-[#c5ebe8] p-5 text-[#102A43] shadow-[0_10px_30px_rgba(16,42,67,0.08)] ring-1 ring-white/60">
            <p className="text-sm font-bold">No upcoming slot today</p>
            <p className="mt-1 text-xs opacity-80">Book a slot or check the Calendar tab.</p>
          </div>
        )}

        {stats.nextUpcoming && isUpcomingPass(stats.nextUpcoming) ? (
          <motion.button
            type="button"
            layout
            onClick={() => onOpenPass(stats.nextUpcoming!)}
            className="w-full rounded-[20px] bg-[#fff3c4] p-[1.05rem] text-left text-[#6b5a12] shadow-[0_10px_30px_rgba(16,42,67,0.1)] ring-1 ring-white/55 transition active:scale-[0.99]"
          >
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#f5d76a]/55 text-[#6b5a12]">
                <CalendarDays className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#6b5a12]/70">Today&apos;s planning</p>
                <p className="mt-1 font-display text-lg font-extrabold text-[#4a3d0f]">{stats.nextUpcoming.slot_name}</p>
                <p className="mt-1 text-xs font-medium text-[#4a3d0f]/85">
                  {format(parseYmd(passBookingDate(stats.nextUpcoming)), "EEE")} ·{" "}
                  {format(parseYmd(passBookingDate(stats.nextUpcoming)), "MMM d")} · {formatSlotTime(stats.nextUpcoming)}
                </p>
                <span className="mt-3 inline-flex items-center gap-0.5 text-xs font-bold text-[#00A9BC]">
                  View pass <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>
          </motion.button>
        ) : null}

        <div className="rounded-[20px] bg-[#ffd4e0] p-[1.05rem] text-[#4a1f2a] shadow-[0_10px_30px_rgba(16,42,67,0.1)] ring-1 ring-white/55">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#ffb8d0]/70 text-[#4a1f2a]">
              <Ticket className="h-5 w-5" />
            </span>
            <div className="flex min-w-0 flex-1 items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#4a1f2a]/55">Your bookings</p>
                <p className="mt-1 font-display text-3xl font-extrabold">{stats.bookedPct}%</p>
                <p className="mt-0.5 text-xs font-medium text-[#4a1f2a]/75">
                  {stats.upcoming.length} upcoming · {passes.length} total
                </p>
              </div>
              <div className="relative h-[4.5rem] w-[4.5rem] shrink-0">
                <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="#f0a0b8" strokeWidth="3" />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    stroke="#4a1f2a"
                    strokeWidth="3"
                    strokeDasharray={`${stats.bookedPct} 100`}
                    strokeLinecap="round"
                    pathLength={100}
                  />
                </svg>
                <span className="absolute inset-0 grid place-items-center font-display text-sm font-extrabold text-[#4a1f2a]">
                  {stats.upcoming.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
