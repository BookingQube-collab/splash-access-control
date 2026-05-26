import { passUrl } from "@/lib/public-url";
import type { EntryPassLabelData } from "@/lib/zebra/types";

/** Sample pass used in admin label template preview and test print. */
export const SAMPLE_LABEL_DATA: EntryPassLabelData = {
  customer_name: "Alex Guest",
  mobile: "+974 5000 0000",
  slot_name: "Morning Wave",
  date: "May 17, 2026",
  time: "10:00 AM – 12:00 PM",
  guests: 2,
  booking_ref: "A1B2C3D4",
  qr_token: "00000000-0000-4000-8000-000000000001",
  event_name: "Summer Splash",
  qr_url: passUrl("00000000-0000-4000-8000-000000000001"),
};
