"use client";

import { format } from "date-fns";
import {
  Calendar,
  Car,
  Clock,
  Crown,
  Droplets,
  Moon,
  Music,
  Ticket,
  User,
  UtensilsCrossed,
} from "lucide-react";
import {
  REGISTER_CARD_CLASS,
  REGISTER_CONTENT_CLASS,
} from "@/components/public/register-beach-layout";
import { RegisterDatePicker } from "@/components/public/register-date-picker";
import { formatSlotTimeRange, isSlotPastForDate, slotUnavailableLabel } from "@/lib/slot-time";
import { cn, parseYmd } from "@/lib/utils";

export type RegisterSlot = {
  id: string;
  name: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  remaining: number;
};

const SLOT_ICONS = [Car, User, Moon] as const;

const AMENITIES = [
  { icon: Droplets, label: "10+ Water Attractions" },
  { icon: Music, label: "Live DJ & Music" },
  { icon: UtensilsCrossed, label: "Food & Beverages" },
  { icon: Crown, label: "VIP Experiences" },
] as const;

function slotIcon(index: number) {
  return SLOT_ICONS[index % SLOT_ICONS.length];
}

export function DateLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-[#5a7a80]">
      <span className="inline-flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-[#00a8b5]" />
        Available
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-[#9ca3af]" />
        Fully booked
      </span>
    </div>
  );
}

export function RegisterBookingCard({
  eventStart,
  eventEnd,
  activeDate,
  onSelectDate,
  fullyBookedDates,
  slots,
  slotId,
  onSelectSlot,
  onRegisterClick,
  registerDisabled,
}: {
  eventStart: string;
  eventEnd: string;
  activeDate: string;
  onSelectDate: (ymd: string) => void;
  fullyBookedDates?: string[];
  slots: RegisterSlot[];
  slotId: string;
  onSelectSlot: (id: string) => void;
  onRegisterClick: () => void;
  registerDisabled?: boolean;
}) {
  const dateTitle = format(parseYmd(activeDate), "EEEE, MMMM d");

  return (
    <section id="booking-card" className={cn(REGISTER_CONTENT_CLASS, "mt-5 pb-32 sm:mt-6")}>
      <div className={cn(REGISTER_CARD_CLASS, "p-6 sm:p-8 lg:p-10")}>
        {/* Section 1 */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#00a8b5]/10 text-[#00a8b5]">
              <Calendar className="h-4 w-4" />
            </span>
            <h2 className="font-display text-lg font-bold text-[#0a4a52] sm:text-xl">
              1. Pick a date
            </h2>
          </div>
          <DateLegend />
        </div>

        <div className="mt-6">
          <RegisterDatePicker
            eventStart={eventStart}
            eventEnd={eventEnd}
            selected={activeDate}
            onSelect={onSelectDate}
            fullyBookedDates={fullyBookedDates}
          />
        </div>

        {/* Section 2 */}
        <div className="mt-10 border-t border-[#e5e7eb] pt-10">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#00a8b5]/10 text-[#00a8b5]">
                <Clock className="h-4 w-4" />
              </span>
              <h2 className="font-display text-lg font-bold text-[#0a4a52] sm:text-xl">
                2. Pick a slot on {dateTitle}
              </h2>
            </div>
            <p className="text-xs font-medium text-[#5a7a80] sm:pt-2">
              All times in local time
            </p>
          </div>

          {slots.length === 0 ? (
            <p className="mt-6 rounded-2xl bg-[#f3f4f6] px-4 py-6 text-sm text-[#5a7a80]">
              No slots configured yet.
            </p>
          ) : slots.every((s) => s.remaining <= 0) ? (
            <div className="mt-6 rounded-2xl border border-[#ff7e67]/30 bg-[#ff7e67]/10 px-4 py-6 text-center">
              <p className="font-display text-lg font-bold text-[#ff7e67]">All slots are full</p>
              <p className="mt-1 text-xs text-[#5a7a80]">Try another date or check back later.</p>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {slots.map((s, i) => {
                const full = s.remaining <= 0;
                const past = isSlotPastForDate(s, activeDate);
                const unavailable = full || past;
                const endedLabel = past ? slotUnavailableLabel(s, activeDate) : null;
                const selected = slotId === s.id;
                const booked = s.capacity - s.remaining;
                const pct = Math.min(
                  100,
                  Math.round((booked / Math.max(1, s.capacity)) * 100),
                );
                const Icon = slotIcon(i);
                return (
                  <button
                    key={s.id}
                    type="button"
                    disabled={unavailable}
                    onClick={() => !unavailable && onSelectSlot(s.id)}
                    className={cn(
                      "flex flex-col rounded-2xl border bg-white p-5 text-left transition",
                      selected
                        ? "border-2 border-[#00a8b5] shadow-[0_0_0_1px_rgba(0,168,181,0.15)]"
                        : "border border-[#e5e7eb] hover:border-[#00a8b5]/50",
                      unavailable && "cursor-not-allowed opacity-50",
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-11 w-11 place-items-center rounded-full",
                        i === 0 && "bg-[#00a8b5]/12 text-[#00a8b5]",
                        i === 1 && "bg-[#ff7e67]/12 text-[#ff7e67]",
                        i === 2 && "bg-indigo-500/12 text-indigo-600",
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="mt-3 font-display text-base font-bold leading-tight text-[#0a4a52]">
                      {s.name}
                    </div>
                    <p className="mt-1 text-xs font-medium text-[#5a7a80]">
                      {formatSlotTimeRange(s.starts_at, s.ends_at)}
                    </p>
                    <div className="mt-4 flex items-center justify-between gap-2 text-[11px] font-medium text-[#5a7a80]">
                      <span>Capacity</span>
                      <span className="text-[#0a4a52]">
                        {booked}/{s.capacity}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-[#e5e7eb]">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          full ? "bg-[#ff7e67]" : "bg-[#00a8b5]",
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    {full ? (
                      <span className="mt-3 inline-flex w-fit rounded-full bg-[#f3f4f6] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#9ca3af]">
                        Sold out
                      </span>
                    ) : past && endedLabel ? (
                      <span className="mt-3 inline-flex w-fit rounded-full bg-[#f3f4f6] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#9ca3af]">
                        {endedLabel}
                      </span>
                    ) : (
                      <span className="mt-3 inline-flex w-fit rounded-full bg-[#00a8b5] px-3 py-1 text-xs font-bold text-white">
                        {s.remaining} spot{s.remaining === 1 ? "" : "s"} left
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <button
            type="button"
            disabled={registerDisabled || !slotId}
            onClick={onRegisterClick}
            className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#00a8b5] py-4 text-base font-bold text-white shadow-[0_12px_32px_rgba(0,168,181,0.35)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Ticket className="h-5 w-5" />
            Register &amp; Get Pass
          </button>
        </div>
      </div>

      <div className="relative z-10 mx-auto mt-8 max-w-4xl rounded-full border border-white/90 bg-white px-4 py-3.5 shadow-[0_20px_60px_rgba(0,0,0,0.12)] sm:px-8 sm:py-4">
        <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 sm:gap-x-10">
          {AMENITIES.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-2 text-xs font-semibold text-[#0a4a52] sm:text-sm">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[#00a8b5]/10 text-[#00a8b5]">
                <Icon className="h-4 w-4 shrink-0" />
              </span>
              {label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}