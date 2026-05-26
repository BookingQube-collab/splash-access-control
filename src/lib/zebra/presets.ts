import type { LabelLayoutOptions } from "@/lib/zebra/types";

export type LabelPresetKey = "classic" | "compact" | "bold_header" | "minimal" | "custom";

export const LABEL_PRESET_META: {
  key: LabelPresetKey;
  name: string;
  description: string;
  defaultLayout: LabelLayoutOptions;
}[] = [
  {
    key: "classic",
    name: "Classic",
    description: "QR on the left, guest details on the right",
    defaultLayout: {
      show_mobile: true,
      show_slot: true,
      show_date: true,
      show_time: true,
      show_guests: true,
      show_booking_ref: true,
      show_event_name: false,
      fontSize: "medium",
    },
  },
  {
    key: "compact",
    name: "Compact",
    description: "QR on top, details stacked below",
    defaultLayout: {
      show_mobile: true,
      show_slot: true,
      show_date: true,
      show_time: true,
      show_guests: true,
      show_booking_ref: true,
      show_event_name: false,
      fontSize: "small",
      receipt_tall: false,
    },
  },
  {
    key: "bold_header",
    name: "Bold header",
    description: "Event name banner, QR, then details",
    defaultLayout: {
      show_mobile: true,
      show_slot: true,
      show_date: true,
      show_time: true,
      show_guests: true,
      show_booking_ref: true,
      show_event_name: true,
      fontSize: "large",
    },
  },
  {
    key: "minimal",
    name: "Minimal",
    description: "Large QR with name and date only",
    defaultLayout: {
      show_mobile: false,
      show_slot: false,
      show_date: true,
      show_time: false,
      show_guests: false,
      show_booking_ref: false,
      show_event_name: false,
      fontSize: "medium",
    },
  },
];

export function presetDefaultLayout(key: string): LabelLayoutOptions {
  return LABEL_PRESET_META.find((p) => p.key === key)?.defaultLayout ?? LABEL_PRESET_META[0].defaultLayout;
}
