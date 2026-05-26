/** Pastel card colors per slot row (mockup palette). */
export const DASHBOARD_SLOT_COLORS = [
  { bg: "#D8F3E3", border: "#9FD4B6", accent: "#2d6a4f" },
  { bg: "#FCE4EF", border: "#F0B8D0", accent: "#9d4b6b" },
  { bg: "#FFF4D6", border: "#F5DFA0", accent: "#8a6d1a" },
  { bg: "#D6EEF8", border: "#A8D4EC", accent: "#1d5a7a" },
  { bg: "#E8E0F8", border: "#C4B5E8", accent: "#5b4b8a" },
  { bg: "#FFE8DC", border: "#FFCDB8", accent: "#9a4a2a" },
] as const;

export type DashboardSlotRow = {
  id: string;
  name: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  color_index: number;
};

export type DashboardRegistrationCard = {
  id: string;
  slot_id: string;
  booking_date: string;
  customer_name: string;
  guest_count: number;
  status: string;
};

export type DashboardDaySlotUsage = {
  date: string;
  slot_id: string;
  booked: number;
  entered: number;
  capacity: number;
};

export type DashboardSchedulePayload = {
  events: { id: string; name: string; start_date: string; end_date: string; days: number }[];
  selectedEventId: string | null;
  event: { id: string; name: string; start_date: string; end_date: string } | null;
  weekStart: string;
  weekEnd: string;
  weekDays: string[];
  slots: DashboardSlotRow[];
  registrations: DashboardRegistrationCard[];
  daySlotUsage: DashboardDaySlotUsage[];
};
