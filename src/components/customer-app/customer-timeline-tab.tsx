"use client";

import { format, isSameDay } from "date-fns";
import { motion } from "framer-motion";
import type { CustomerPass } from "./types";
import { CARD_PALETTES } from "./types";
import {
  blockStyle,
  passesOnDate,
  passBookingDate,
  formatSlotTime,
  timelineAxisHours,
  timelineTrackHeightPx,
  TIMELINE_ROW_PX,
  weekDaysAround,
} from "./utils";
import { parseYmd } from "@/lib/utils";

const HOUR_LABELS = timelineAxisHours();

export function CustomerTimelineTab({
  passes,
  selectedDate,
  onSelectDate,
  onOpenPass,
}: {
  passes: CustomerPass[];
  selectedDate: string;
  onSelectDate: (d: string) => void;
  onOpenPass: (p: CustomerPass) => void;
}) {
  const week = weekDaysAround(selectedDate);
  const dayPasses = passesOnDate(passes, selectedDate);

  return (
    <div className="px-4 pb-28 pt-2">
      <motion.div className="mb-4 flex justify-between gap-1 rounded-[1.25rem] bg-white/85 p-1.5 shadow-[0_8px_24px_rgba(16,42,67,0.08)] ring-1 ring-white/60 backdrop-blur-sm">
        {week.map((day) => {
          const ymd = format(day, "yyyy-MM-dd");
          const active = ymd === selectedDate;
          const hasPass = passes.some((p) => passBookingDate(p) === ymd);
          return (
            <button
              key={ymd}
              type="button"
              onClick={() => onSelectDate(ymd)}
              className={`flex flex-1 flex-col items-center rounded-xl py-2 transition ${
                active ? "bg-[#00A9BC] text-white shadow-md" : "text-[#102A43]/55 hover:bg-[#102A43]/5"
              }`}
            >
              <span className="text-[10px] font-bold uppercase">{format(day, "EEE")}</span>
              <span className="font-display text-lg font-extrabold">{format(day, "d")}</span>
              {hasPass && (
                <span
                  className={`mt-0.5 h-1 w-1 rounded-full ${
                    active ? "bg-white" : "bg-[#00A9BC]/80"
                  }`}
                />
              )}
            </button>
          );
        })}
      </motion.div>

      <p className="mb-3 font-display text-lg font-extrabold text-[#102A43] drop-shadow-sm">
        {isSameDay(parseYmd(selectedDate), new Date()) ? "Today" : format(parseYmd(selectedDate), "EEEE")}
      </p>

      {dayPasses.length === 0 ? (
        <p className="rounded-[20px] bg-white/70 p-6 text-center text-sm text-[#102A43]/70 ring-1 ring-white/60 backdrop-blur-sm">
          No passes on this day.
        </p>
      ) : (
        <div className="relative flex gap-3">
          <div className="w-12 shrink-0 pt-1">
            {HOUR_LABELS.map((h) => (
              <div
                key={h}
                style={{ height: TIMELINE_ROW_PX }}
                className="text-[10px] font-bold text-[#102A43]/45"
              >
                {h === 12 ? "12 PM" : h < 12 ? `${h} AM` : `${h - 12} PM`}
              </div>
            ))}
          </div>
          <motion.div
            className="relative flex-1 rounded-[20px] bg-white/55 ring-1 ring-white/70 backdrop-blur-sm"
            style={{ minHeight: timelineTrackHeightPx() }}
          >
            {HOUR_LABELS.map((h, i) => (
              <motion.div
                key={h}
                className="absolute left-0 right-0 border-t border-[#102A43]/10"
                style={{ top: i * TIMELINE_ROW_PX }}
              />
            ))}
            {dayPasses.map((p, i) => {
              const { top, height } = blockStyle(p);
              const pal = CARD_PALETTES[i % CARD_PALETTES.length];
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onOpenPass(p)}
                  style={{ top, height: Math.max(height, 48) }}
                  className={`absolute left-2 right-2 overflow-hidden rounded-2xl ${pal.bg} ${pal.text} p-3 text-left shadow-lg`}
                >
                  <p className="text-[10px] font-bold uppercase opacity-70">{formatSlotTime(p)}</p>
                  <p className="font-display text-sm font-extrabold leading-tight">{p.slot_name}</p>
                  <p className="mt-1 text-[10px] opacity-75">{p.guest_count} guests</p>
                </button>
              );
            })}
          </motion.div>
        </div>
      )}
    </div>
  );
}
