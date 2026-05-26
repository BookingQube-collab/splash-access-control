"use client";

import { QrCode } from "lucide-react";
import { SAMPLE_LABEL_DATA } from "@/lib/zebra/sample-label-data";
import type { LabelLayoutOptions } from "@/lib/zebra/types";
import { cn } from "@/lib/utils";

type Props = {
  presetKey: string;
  layout: LabelLayoutOptions;
};

function QrPlaceholder({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center rounded-lg bg-[#0a4a52]/10",
        className,
      )}
    >
      <QrCode className="h-1/2 w-1/2 text-[#0a4a52]/50" />
    </div>
  );
}

function DetailLines({ layout }: { layout: LabelLayoutOptions }) {
  const lines: string[] = [];
  if (layout.show_mobile) lines.push(SAMPLE_LABEL_DATA.mobile);
  if (layout.show_slot) lines.push(SAMPLE_LABEL_DATA.slot_name);
  if (layout.show_date) lines.push(SAMPLE_LABEL_DATA.date);
  if (layout.show_time && SAMPLE_LABEL_DATA.time) lines.push(SAMPLE_LABEL_DATA.time);
  if (layout.show_guests) lines.push(`Guests: ${SAMPLE_LABEL_DATA.guests}`);
  if (layout.show_booking_ref) lines.push(`Ref: ${SAMPLE_LABEL_DATA.booking_ref}`);

  if (lines.length === 0) return null;

  return (
    <div className="space-y-0.5 text-center text-[10px] text-muted-foreground sm:text-left">
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  );
}

export function LabelTemplateVisualPreview({ presetKey, layout }: Props) {
  const key = presetKey;
  const name = SAMPLE_LABEL_DATA.customer_name;
  const showEvent = !!layout.show_event_name && !!SAMPLE_LABEL_DATA.event_name;

  if (key === "minimal") {
    return (
      <div className="mx-auto flex w-full max-w-[220px] flex-col items-center rounded-xl bg-white p-4 shadow-sm">
        <QrPlaceholder className="h-28 w-28" />
        <p className="mt-3 text-center text-sm font-bold text-[#0a4a52]">{name}</p>
        {layout.show_date && (
          <p className="text-center text-xs text-muted-foreground">{SAMPLE_LABEL_DATA.date}</p>
        )}
      </div>
    );
  }

  if (key === "bold_header") {
    return (
      <div className="mx-auto w-full max-w-[220px] overflow-hidden rounded-xl bg-white shadow-sm">
        {showEvent && (
          <div className="bg-[#0a4a52] px-3 py-2 text-center text-xs font-bold text-white">
            {SAMPLE_LABEL_DATA.event_name}
          </div>
        )}
        <div className="flex gap-3 p-4">
          <QrPlaceholder className="h-20 w-20" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-[#0a4a52]">{name}</p>
            <DetailLines layout={layout} />
          </div>
        </div>
      </div>
    );
  }

  if (key === "classic") {
    return (
      <div className="mx-auto flex w-full max-w-[220px] gap-3 rounded-xl bg-white p-4 shadow-sm">
        <QrPlaceholder className="h-20 w-20" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[#0a4a52]">{name}</p>
          <DetailLines layout={layout} />
        </div>
      </div>
    );
  }

  // compact (default) and custom fall back to stacked layout
  return (
    <div className="mx-auto flex w-full max-w-[220px] flex-col items-center rounded-xl bg-white p-4 shadow-sm">
      {showEvent && (
        <p className="mb-2 w-full text-center text-xs font-bold text-[#0a4a52]">
          {SAMPLE_LABEL_DATA.event_name}
        </p>
      )}
      <QrPlaceholder className="h-24 w-24" />
      <p className="mt-3 text-center text-sm font-bold text-[#0a4a52]">{name}</p>
      <DetailLines layout={layout} />
    </div>
  );
}
