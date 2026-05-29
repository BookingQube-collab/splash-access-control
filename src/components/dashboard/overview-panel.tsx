"use client";



import { format, parseISO } from "date-fns";
import { formatSlotTimeRange } from "@/lib/slot-time";

import { CalendarDays, ChevronRight } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import { ADMIN_CARD } from "@/components/admin/admin-theme";

import { DASHBOARD_SLOT_COLORS } from "@/lib/dashboard.types";

import type { DashboardSchedulePayload } from "@/lib/dashboard.types";

import {
  capacitySoldPercent,
  cn,
  formatCapacityPercent,
  sumOverviewGuestsBooked,
  sumOverviewTotalCapacity,
  todayYmd,
  type OverviewSlotCounts,
} from "@/lib/utils";

type SlotCount = OverviewSlotCounts & {
  id: string;
  name: string;
  starts_at: string;
  ends_at: string;
  remaining: number;
};



function initials(name: string): string {

  return name

    .split(/\s+/)

    .filter(Boolean)

    .slice(0, 2)

    .map((p) => p[0]?.toUpperCase() ?? "")

    .join("");

}



function RingProgress({ pct, size = 44, stroke = 4 }: { pct: number; size?: number; stroke?: number }) {

  const r = (size - stroke) / 2;

  const c = 2 * Math.PI * r;

  const offset = c - (Math.min(100, Math.max(0, pct)) / 100) * c;

  return (

    <svg width={size} height={size} className="-rotate-90">

      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e8e4dc" strokeWidth={stroke} />

      <circle

        cx={size / 2}

        cy={size / 2}

        r={r}

        fill="none"

        stroke="#00a8b5"

        strokeWidth={stroke}

        strokeDasharray={c}

        strokeDashoffset={offset}

        strokeLinecap="round"

      />

    </svg>

  );

}



function SemiGauge({ pct, premium }: { pct: number; premium?: boolean }) {
  const displayPct = formatCapacityPercent(Math.min(100, Math.max(0, pct)));

  const clamped = Math.min(100, Math.max(0, pct));

  const angle = (clamped / 100) * 180;

  const track = premium ? "#e2e8f0" : "#e8e4dc";

  const fill = premium ? "#14b8a6" : undefined;



  return (

    <div className="relative mx-auto h-32 w-56 overflow-hidden">

      <div

        className="absolute bottom-0 left-1/2 h-28 w-52 -translate-x-1/2 rounded-t-full border-[10px] border-b-0"

        style={{ borderColor: track }}

        aria-hidden

      />

      <div

        className={cn(

          "absolute bottom-0 left-1/2 h-28 w-52 origin-bottom -translate-x-1/2 rounded-t-full border-[10px] border-b-0 transition-transform duration-700",

          !premium && "border-primary",

        )}

        style={{

          borderColor: fill ?? undefined,

          transform: `translateX(-50%) rotate(${angle - 180}deg)`,

          ...(premium ? { borderTopColor: fill, borderLeftColor: fill, borderRightColor: fill } : {}),

        }}

        aria-hidden

      />

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-center">

        <p

          className={cn(

            "font-display text-3xl font-extrabold tabular-nums",

            premium ? "text-[#134e4a]" : "text-[#0a4a52]",

          )}

        >

          {displayPct}%

        </p>

        <p className={cn("text-xs", premium ? "text-[#64748b]" : "text-[#5a7a80]")}>capacity sold</p>

      </div>

    </div>

  );

}



export function OverviewPanel({

  slots,

  schedule,

  recentGuests,

  variant = "default",

  onRecentGuestClick,

  onViewAllGuests,

}: {

  slots: SlotCount[];

  schedule: DashboardSchedulePayload;

  recentGuests: { name: string; guests: number }[];

  variant?: "default" | "premium";

  onRecentGuestClick?: (guest: { name: string; guests: number }) => void;

  onViewAllGuests?: () => void;

}) {

  const premium = variant === "premium";

  const today = todayYmd();

  const totalCapacity = sumOverviewTotalCapacity(slots);
  const todayUsage = schedule.daySlotUsage.filter((u) => u.date === today);
  const totalGuestsBookedToday = todayUsage.reduce((a, u) => a + u.booked, 0);
  const totalInsideToday = todayUsage.reduce((a, u) => a + u.entered, 0);
  const totalGuestsBooked = totalGuestsBookedToday || sumOverviewGuestsBooked(slots);
  const totalInside = totalInsideToday || slots.reduce((a, s) => a + (s.entered ?? 0), 0);
  const soldPct = capacitySoldPercent(totalGuestsBooked, totalCapacity);
  const checkInPct =
    totalGuestsBooked > 0 ? Math.round((totalInside / totalGuestsBooked) * 100) : 0;

  const inProgress = schedule.slots

    .map((slot, i) => {

      const usage = todayUsage.find((u) => u.slot_id === slot.id);

      const checkedIn = usage?.entered ?? 0;

      const registered = usage?.booked ?? 0;

      const cap = usage?.capacity ?? slot.capacity;

      const pct = cap > 0 ? Math.round((checkedIn / cap) * 100) : 0;

      return { slot, pct, checkedIn, registered, cap, colorIndex: i };

    })

    .filter((x) => x.registered > 0 || x.checkedIn > 0 || x.pct > 0)

    .sort((a, b) => b.pct - a.pct)

    .slice(0, 5);



  const weekRegs = schedule.registrations

    .filter((r) => r.booking_date >= schedule.weekStart && r.booking_date <= schedule.weekEnd)

    .slice(0, 8);



  const guestList =

    recentGuests.length > 0

      ? recentGuests

      : weekRegs.map((r) => ({ name: r.customer_name, guests: r.guest_count }));



  const asideWidth = premium ? "w-full shrink-0 space-y-4 lg:w-[300px] xl:w-[340px]" : "w-full shrink-0 space-y-4 lg:w-[300px] xl:w-[320px]";



  return (

    <aside className={asideWidth}>

      <Panel title="Overall progress" premium={premium}>

        <SemiGauge pct={soldPct} premium={premium} />

        <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs">

          <Stat label="Guests" value={totalGuestsBooked} premium={premium} />

          <Stat label="Inside" value={totalInside} premium={premium} />

          <Stat label="Check-in rate" value={`${checkInPct}%`} premium={premium} />

          <Stat label="Capacity" value={totalCapacity} premium={premium} />

        </div>

      </Panel>



      <Panel title="In progress" premium={premium}>

        {inProgress.length === 0 ? (

          <div className={cn("flex items-start gap-2", premium && "rounded-xl bg-[#f8fafc] p-3")}>

            {premium && <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-[#0d9488]" />}

            <p className={cn("text-sm", premium ? "text-[#64748b]" : "text-[#5a7a80]")}>

              No bookings today for this event.

            </p>

          </div>

        ) : (

          <ul className="space-y-3">

            {inProgress.map(({ slot, pct, checkedIn, registered, cap }) => (

              <li key={slot.id} className="flex items-center gap-3">

                <div className="relative grid place-items-center">

                  <RingProgress pct={pct} />

                  <span className="absolute text-[10px] font-bold text-[#134e4a]">{pct}%</span>

                </div>

                <div className="min-w-0 flex-1">

                  <p className="truncate text-sm font-semibold text-[#134e4a]">{slot.name}</p>

                  <p className="text-xs text-[#64748b]">

                    {formatSlotTimeRange(slot.starts_at, slot.ends_at)} · {checkedIn}/{cap} checked in

                    {registered > checkedIn ? ` · ${registered} registered` : ""}

                  </p>

                </div>

              </li>

            ))}

          </ul>

        )}

      </Panel>



      <Panel

        title="Recent guests"

        premium={premium}

        action={

          premium && onViewAllGuests ? (

            <button

              type="button"

              onClick={onViewAllGuests}

              className="text-xs font-semibold text-[#0d9488] transition hover:text-[#0f766e]"

            >

              View all

            </button>

          ) : undefined

        }

      >

        {premium ? (

          <ul className="space-y-1">

            {guestList.slice(0, 6).map((g, i) => {

              const color = DASHBOARD_SLOT_COLORS[i % DASHBOARD_SLOT_COLORS.length];

              return (

                <li key={`${g.name}-${i}`}>

                  <button

                    type="button"

                    onClick={() => onRecentGuestClick?.(g)}

                    className="flex w-full items-center gap-3 rounded-xl px-1 py-2 text-left transition hover:bg-[#f8fafc]"

                  >

                    <Avatar className="h-10 w-10 border-2" style={{ borderColor: color.border }}>

                      <AvatarFallback

                        className="text-xs font-bold"

                        style={{ background: color.bg, color: color.accent }}

                      >

                        {initials(g.name)}

                      </AvatarFallback>

                    </Avatar>

                    <div className="min-w-0 flex-1">

                      <p className="truncate text-sm font-semibold text-[#134e4a]">{g.name}</p>

                      <p className="text-xs text-[#64748b]">

                        {g.guests} guest{g.guests !== 1 ? "s" : ""}

                      </p>

                    </div>

                    <ChevronRight className="h-4 w-4 shrink-0 text-[#94a3b8]" />

                  </button>

                </li>

              );

            })}

            {guestList.length === 0 && (

              <p className="text-sm text-[#64748b]">No registrations this week yet.</p>

            )}

          </ul>

        ) : (

          <div className="flex flex-wrap gap-2">

            {guestList.slice(0, 6).map((g, i) => {

              const color = DASHBOARD_SLOT_COLORS[i % DASHBOARD_SLOT_COLORS.length];

              return (

                <div key={`${g.name}-${i}`} className="flex items-center gap-2 rounded-full bg-[#FAF8F4] py-1 pl-1 pr-3">

                  <Avatar className="h-8 w-8 border-2" style={{ borderColor: color.border }}>

                    <AvatarFallback className="text-[10px] font-bold" style={{ background: color.bg, color: color.accent }}>

                      {initials(g.name)}

                    </AvatarFallback>

                  </Avatar>

                  <div className="min-w-0">

                    <p className="truncate text-xs font-semibold text-[#0a4a52]">{g.name.split(" ")[0]}</p>

                    <p className="text-[10px] text-[#5a7a80]">{g.guests} guest{g.guests !== 1 ? "s" : ""}</p>

                  </div>

                </div>

              );

            })}

            {guestList.length === 0 && (

              <p className="text-sm text-[#5a7a80]">No registrations this week yet.</p>

            )}

          </div>

        )}

      </Panel>

    </aside>

  );

}



function Panel({

  title,

  children,

  premium,

  action,

}: {

  title: string;

  children: React.ReactNode;

  premium?: boolean;

  action?: React.ReactNode;

}) {

  if (premium) {

    return (

      <section className={cn(ADMIN_CARD, "p-5")}>

        <div className="mb-4 flex items-center justify-between gap-2">

          <h3 className="font-display text-sm font-bold text-[#134e4a]">{title}</h3>

          {action}

        </div>

        {children}

      </section>

    );

  }



  return (

    <section className="rounded-[20px] border border-[#e8e4dc] bg-white p-4 shadow-sm">

      <h3 className="mb-3 font-display text-sm font-bold uppercase tracking-wider text-[#5a7a80]">{title}</h3>

      {children}

    </section>

  );

}



function Stat({ label, value, premium }: { label: string; value: string | number; premium?: boolean }) {

  return (

    <div

      className={cn(

        "rounded-xl px-2 py-2.5",

        premium ? "bg-[#f8fafc] ring-1 ring-[#f1f5f9]" : "bg-[#FAF8F4]",

      )}

    >

      <p className={cn("text-[10px] uppercase tracking-wider", premium ? "text-[#64748b]" : "text-[#5a7a80]")}>

        {label}

      </p>

      <p className={cn("font-display text-lg font-bold tabular-nums", premium ? "text-[#134e4a]" : "text-[#0a4a52]")}>

        {value}

      </p>

    </div>

  );

}

