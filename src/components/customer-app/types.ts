import type { getMyPasses } from "@/lib/summersplash.functions";

export type CustomerPass = Awaited<ReturnType<typeof getMyPasses>>["passes"][number];

export type AppTab = "today" | "calendar" | "timeline";

export const PHONE_STORAGE_KEY = "ss_customer_phone";

export const CARD_PALETTES = [
  { bg: "bg-[#e8f5a8]", text: "text-[#2d3a0f]", accent: "bg-[#c5e86a]" },
  { bg: "bg-[#d4c4f7]", text: "text-[#2a1f4a]", accent: "bg-[#b89ef0]" },
  { bg: "bg-[#b8e8d4]", text: "text-[#0f3d2a]", accent: "bg-[#7dd4b0]" },
  { bg: "bg-[#b8d4f7]", text: "text-[#0f2a4a]", accent: "bg-[#8ab8f0]" },
  { bg: "bg-[#fff3a8]", text: "text-[#4a3d0f]", accent: "bg-[#ffe066]" },
  { bg: "bg-[#f7c4d4]", text: "text-[#4a1f2a]", accent: "bg-[#f0a0b8]" },
] as const;
