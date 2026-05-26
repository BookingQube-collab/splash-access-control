"use client";

import { Fragment, useState } from "react";
import { addDays, format, parseISO, startOfMonth } from "date-fns";
import {
  Car,
  ChevronLeft,
  ChevronRight,
  Clock,
  Info,
  Star,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import { DASHBOARD_SLOT_COLORS } from "@/lib/dashboard.types";
import type { DashboardRegistrationCard, DashboardSchedulePayload, DashboardSlotRow } from "@/lib/dashboard.types";
import { formatSlotTimeRange } from "@/lib/slot-time";
import { cn, formatYmd, parseYmd } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScheduleFullMonthDialog } from "@/components/dashboard/schedule-full-month-dialog";

function slotTimeLabel(slot: DashboardSlotRow): string {
  return formatSlotTimeRange(slot.starts_at, slot.ends_at);
}

function slotRowIcon(name: string): LucideIcon {
  const n = name.toLowerCase();
  if (n.includes("park")) return Car;
  if (n.includes("night")) return Star;
  if (n.includes("general") || n.includes("guest")) return User;
  return Clock;
}

function slotRowIconStyle(name: string): { circleBg: string; iconColor: string } {
  const n = name.toLowerCase();
  if (n.includes("park")) return { circleBg: "bg-[#ccfbf1]", iconColor: "text-[#0f766e]" };
  if (n.includes("night")) return { circleBg: "bg-[#ede9fe]", iconColor: "text-[#7c3aed]" };
  if (n.includes("general") || (n.includes("guest") && !n.includes("park")))
    return { circleBg: "bg-[#dbeafe]", iconColor: "text-[#2563eb]" };
  return { circleBg: "bg-[#f1f5f9]", iconColor: "text-[#64748b]" };
}

function guestCountCardTone(count: number): { card: string; number: string; label: string } {
  if (count >= 10) {
    return {
      card: "bg-[#dcfce7]",
      number: "text-[#14532d]",
      label: "text-[#166534]",
    };
  }
  if (count >= 5) {
    return {
      card: "bg-[#ecfdf5]",
      number: "text-[#166534]",
      label: "text-[#15803d]",
    };
  }
  return {
    card: "bg-[#f0fdf4]",
    number: "text-[#166534]",
    label: "text-[#15803d]",
  };
}

export type ScheduleFullMonthProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: DashboardSchedulePayload | undefined;
  monthStart: string;
  onMonthChange: (monthStart: string) => void;
  countsLoading?: boolean;
};

export function ScheduleGrid({
  schedule,
  countsLoading,
  onWeekChange,
  onEventChange,
  variant = "default",
  fullMonth,
}: {
  schedule: DashboardSchedulePayload;
  countsLoading?: boolean;
  onWeekChange: (weekStart: string) => void;
  onEventChange: (eventId: string) => void;
  variant?: "default" | "premium";
  fullMonth?: ScheduleFullMonthProps;
}) {
  const premium = variant === "premium";
  const [fullOpenLocal, setFullOpenLocal] = useState(false);
  const fullOpen = fullMonth?.open ?? fullOpenLocal;
  const setFullOpen = fullMonth?.onOpenChange ?? setFullOpenLocal;
  const { event, weekDays, slots, registrations, weekStart, weekEnd, events, selectedEventId } = schedule;

  const usageByKey = new Map(
    schedule.daySlotUsage.map((u) => [`${u.date}:${u.slot_id}`, u]),
  );

  const regsByCell = new Map<string, DashboardRegistrationCard[]>();
  for (const r of registrations) {
    const key = `${r.booking_date}:${r.slot_id}`;
    const list = regsByCell.get(key) ?? [];
    list.push(r);
    regsByCell.set(key, list);
  }

  const canPrev = event ? weekStart > event.start_date : false;
  const canNext = event ? weekEnd < event.end_date : false;

  const rangeLabel =
    weekDays.length > 0
      ? `${format(parseYmd(weekDays[0]), "MMM d")} – ${format(parseYmd(weekDays[weekDays.length - 1]), "MMM d, yyyy")}`
      : "No dates";

  const shellClass = premium
    ? "min-w-0 flex-1 rounded-[24px] border border-[#e2e8f0] bg-white p-5 shadow-[0_4px_24px_-4px_rgba(15,118,110,0.08)] sm:p-6"
    : "min-w-0 flex-1 rounded-[20px] border border-[#e8e4dc] bg-white p-4 shadow-sm sm:p-6";

  return (
    <section className={shellClass}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <TitleBlock eventName={event?.name} premium={premium} />
        <div className="flex flex-wrap items-center gap-2">
          {!premium && events.length > 1 && (
            <Select value={selectedEventId ?? undefined} onValueChange={onEventChange}>
              <SelectTrigger className="h-9 w-[180px] rounded-full border-[#dce8ea] bg-[#FAF8F4] text-sm">
                <SelectValue placeholder="Event" />
              </SelectTrigger>
              <SelectContent>
                {events.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <WeekNav
            rangeLabel={rangeLabel}
            canPrev={canPrev}
            canNext={canNext}
            premium={premium}
            onPrev={() => onWeekChange(formatYmd(addDays(parseYmd(weekStart), -7)))}
            onNext={() => onWeekChange(formatYmd(addDays(parseYmd(weekStart), 7)))}
          />
          {premium && (
            <button
              type="button"
              onClick={() => {
                if (fullMonth) {
                  fullMonth.onMonthChange(formatYmd(startOfMonth(parseYmd(schedule.weekStart))));
                }
                setFullOpen(true);
              }}
              className="rounded-full border border-[#e2e8f0] bg-white px-4 py-2 text-xs font-semibold text-[#0f766e] shadow-sm transition hover:border-[#99f6e4] hover:bg-[#f0fdfa]"
            >
              View full schedule
            </button>
          )}
          {countsLoading && (
            <span className={cn("text-xs", premium ? "text-[#64748b]" : "text-[#5a7a80]")}>Updating…</span>
          )}
        </div>
      </div>

      {slots.length === 0 || weekDays.length === 0 ? (
        <div
          className={cn(
            "rounded-2xl px-6 py-16 text-center",
            premium ? "bg-[#f8fafc] text-[#64748b]" : "bg-[#FAF8F4] text-[#5a7a80]",
          )}
        >
          No slots or dates in this range. Select another week or configure slots in admin.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div
            className={cn(
              "grid min-w-[720px] gap-px",
              premium ? "rounded-2xl border border-[#e2e8f0] bg-[#e2e8f0]" : "rounded-xl border border-[#e8e4dc] bg-[#e8e4dc]",
            )}
            style={{
              gridTemplateColumns: premium
                ? `minmax(200px, 220px) repeat(${weekDays.length}, minmax(100px, 1fr))`
                : `140px repeat(${weekDays.length}, minmax(100px, 1fr))`,
            }}
          >
            <div className={cn(premium ? "bg-[#f8fafc]" : "bg-[#f3efe6]", premium ? "p-3" : "p-2")} />
            {weekDays.map((d) => (
              <DayColumnHeader key={d} day={d} premium={premium} />
            ))}
            {slots.map((slot) => (
              <SlotGridRow
                key={slot.id}
                slot={slot}
                weekDays={weekDays}
                usageByKey={usageByKey}
                regsByCell={regsByCell}
                premium={premium}
              />
            ))}
          </div>
        </div>
      )}

      {premium && (
        <div className="mt-4 flex items-start gap-2 text-xs text-[#64748b]">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#94a3b8]" />
          <p>
            Bookings show total guests per slot window. Empty cells mean no reservations. Use week arrows to
            navigate the event calendar.
          </p>
        </div>
      )}

      {premium && fullMonth && (
        <ScheduleFullMonthDialog
          open={fullOpen}
          onOpenChange={setFullOpen}
          schedule={fullMonth.schedule}
          countsLoading={fullMonth.countsLoading ?? countsLoading}
          monthStart={fullMonth.monthStart}
          onMonthChange={fullMonth.onMonthChange}
        />
      )}
    </section>
  );
}

function TitleBlock({ eventName, premium }: { eventName?: string; premium?: boolean }) {
  return (
    <div>
      <h2
        className={cn(
          "font-display font-bold",
          premium ? "text-xl text-[#134e4a]" : "text-xl text-[#0a4a52]",
        )}
      >
        Schedule
      </h2>
      <p className={cn("text-sm", premium ? "text-[#64748b]" : "text-[#5a7a80]")}>
        {eventName ?? "No active event"}
      </p>
    </div>
  );
}

function WeekNav({
  rangeLabel,
  canPrev,
  canNext,
  onPrev,
  onNext,
  premium,
}: {
  rangeLabel: string;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  premium?: boolean;
}) {
  const wrap = premium
    ? "inline-flex items-center gap-0.5 rounded-full border border-[#e2e8f0] bg-[#f8fafc] px-1 py-0.5 shadow-sm"
    : "inline-flex items-center gap-1 rounded-full border border-[#dce8ea] bg-[#FAF8F4] px-1 py-0.5";

  return (
    <div className={wrap}>
      <button
        type="button"
        disabled={!canPrev}
        onClick={onPrev}
        className="grid h-9 w-9 place-items-center rounded-full text-[#134e4a] transition hover:bg-white disabled:opacity-30"
        aria-label="Previous week"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="px-2 text-sm font-semibold text-[#134e4a] tabular-nums">{rangeLabel}</span>
      <button
        type="button"
        disabled={!canNext}
        onClick={onNext}
        className="grid h-9 w-9 place-items-center rounded-full text-[#134e4a] transition hover:bg-white disabled:opacity-30"
        aria-label="Next week"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function DayColumnHeader({ day, premium }: { day: string; premium?: boolean }) {
  const isToday = day === formatYmd(new Date());
  return (
    <div
      className={cn(
        "p-2 text-center text-xs font-semibold uppercase tracking-wide",
        premium
          ? isToday
            ? "bg-[#ccfbf1] text-[#0f766e]"
            : "bg-[#f8fafc] text-[#475569]"
          : isToday
            ? "bg-[#f3efe6] text-primary"
            : "bg-[#f3efe6] text-[#0a4a52]",
      )}
    >
      <div>{format(parseYmd(day), "EEE")}</div>
      <div
        className={cn(
          "mt-0.5 font-display text-base tabular-nums",
          premium && isToday && "font-extrabold",
        )}
      >
        {format(parseYmd(day), "d")}
      </div>
    </div>
  );
}

export function SlotGridRow({
  slot,
  weekDays,
  usageByKey,
  regsByCell,
  premium,
}: {
  slot: DashboardSlotRow;
  weekDays: string[];
  usageByKey: Map<string, { booked: number; capacity: number }>;
  regsByCell: Map<string, DashboardRegistrationCard[]>;
  premium?: boolean;
}) {
  const palette = DASHBOARD_SLOT_COLORS[slot.color_index % DASHBOARD_SLOT_COLORS.length];
  const RowIcon = slotRowIcon(slot.name);
  const iconStyle = slotRowIconStyle(slot.name);

  return (
    <Fragment>
      <div
        className={cn(
          "bg-white",
          premium ? "flex items-center gap-3 px-4 py-5" : "flex flex-col justify-center p-3",
        )}
      >
        {premium ? (
          <>
            <span
              className={cn(
                "grid h-10 w-10 shrink-0 place-items-center rounded-full",
                iconStyle.circleBg,
              )}
              aria-hidden
            >
              <RowIcon className={cn("h-4 w-4", iconStyle.iconColor)} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold leading-tight text-[#134e4a]">{slot.name}</p>
              <p className="mt-0.5 text-xs text-[#64748b]">{slotTimeLabel(slot)}</p>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs font-bold leading-tight text-[#134e4a]">{slot.name}</p>
            <p className="text-[10px] text-[#64748b]">{slotTimeLabel(slot)}</p>
          </>
        )}
      </div>
      {weekDays.map((day) => {
        const key = `${day}:${slot.id}`;
        const usage = usageByKey.get(key);
        const cellRegs = regsByCell.get(key) ?? [];
        const pct = usage && usage.capacity > 0 ? Math.round((usage.booked / usage.capacity) * 100) : 0;
        const isToday = day === formatYmd(new Date());
        const totalGuests =
          usage?.booked ??
          cellRegs.reduce((sum, reg) => sum + reg.guest_count, 0);

        return (
          <div
            key={key}
            className={cn(
              "bg-white",
              premium
                ? cn(
                    "flex min-h-[104px] items-center justify-center p-3",
                    isToday && "bg-[#f0fdfa]/40",
                  )
                : "min-h-[88px] p-1.5",
            )}
          >
            {premium ? (
              totalGuests > 0 ? (
                <GuestCountCard count={totalGuests} />
              ) : (
                <span className="text-sm text-[#94a3b8]" aria-label="No bookings">
                  —
                </span>
              )
            ) : (
              <div className="flex h-full flex-col gap-1">
                {cellRegs.length === 0 ? (
                  <EmptyCell usage={usage} />
                ) : (
                  cellRegs.slice(0, 3).map((reg) => (
                    <RegistrationCard key={reg.id} reg={reg} slot={slot} palette={palette} />
                  ))
                )}
                {cellRegs.length > 3 && (
                  <p className="text-center text-[10px] font-semibold text-[#64748b]">
                    +{cellRegs.length - 3} more
                  </p>
                )}
                {cellRegs.length > 0 && usage && usage.capacity > 0 && (
                  <p className="text-right text-[9px] font-medium opacity-70">{pct}% full</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </Fragment>
  );
}

function GuestCountCard({ count }: { count: number }) {
  const tone = guestCountCardTone(count);
  return (
    <div
      className={cn(
        "flex w-full max-w-[92px] flex-col items-center justify-center rounded-xl px-3 py-3 text-center",
        tone.card,
      )}
    >
      <span className={cn("font-display text-2xl font-bold leading-none tabular-nums", tone.number)}>
        {count}
      </span>
      <span className={cn("mt-1 text-[10px] font-medium", tone.label)}>Total Guests</span>
    </div>
  );
}

function EmptyCell({ usage }: { usage?: { booked: number } }) {
  return (
    <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-[#e8e4dc] text-[10px] text-[#5a7a80]/60">
      {usage && usage.booked > 0 ? (
        <span className="text-xs font-semibold text-[#64748b]">{usage.booked} guests</span>
      ) : (
        "—"
      )}
    </div>
  );
}

function RegistrationCard({
  reg,
  slot,
  palette,
}: {
  reg: DashboardRegistrationCard;
  slot: DashboardSlotRow;
  palette: (typeof DASHBOARD_SLOT_COLORS)[number];
}) {
  return (
    <div
      className="rounded-xl border px-2 py-1.5 shadow-sm"
      style={{
        backgroundColor: palette.bg,
        borderColor: palette.border,
        color: palette.accent,
      }}
    >
      <p className="truncate text-[10px] font-bold uppercase tracking-wide opacity-80">{slot.name}</p>
      <p className="truncate text-xs font-semibold">{reg.customer_name}</p>
      <div className="mt-1 flex items-center justify-between gap-1 text-[10px]">
        <span>{slotTimeLabel(slot)}</span>
        <span className="inline-flex items-center gap-0.5 rounded-full bg-white/60 px-1.5 py-0.5 font-bold">
          <Users className="h-2.5 w-2.5" />
          {reg.guest_count}
        </span>
      </div>
    </div>
  );
}
