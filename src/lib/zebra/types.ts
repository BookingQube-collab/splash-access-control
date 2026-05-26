export type PrinterConnection = "browser_print" | "network";

export type LabelDpi = 203 | 300;

export type PrinterSettings = {
  enabled: boolean;
  connection: PrinterConnection;
  network_host: string;
  network_port: number;
  label_width_in: number;
  label_height_in: number;
  dpi: LabelDpi;
};

export type LabelLayoutOptions = {
  show_mobile?: boolean;
  show_slot?: boolean;
  show_date?: boolean;
  show_time?: boolean;
  show_guests?: boolean;
  show_booking_ref?: boolean;
  show_event_name?: boolean;
  fontSize?: "small" | "medium" | "large";
  receipt_tall?: boolean;
};

export type LabelPrintTemplate = {
  id: string;
  name: string;
  preset_key: string;
  is_default: boolean;
  layout_json: LabelLayoutOptions;
  zpl_template: string | null;
};

export type EntryPassLabelData = {
  customer_name: string;
  mobile: string;
  slot_name: string;
  date: string;
  time: string;
  guests: number;
  booking_ref: string;
  qr_token: string;
  event_name: string;
  qr_url: string;
};

export const DEFAULT_PRINTER_SETTINGS: PrinterSettings = {
  enabled: false,
  connection: "browser_print",
  network_host: "",
  network_port: 9100,
  label_width_in: 4,
  label_height_in: 2,
  dpi: 203,
};

export const LABEL_PLACEHOLDERS = [
  "{{customer_name}}",
  "{{mobile}}",
  "{{slot_name}}",
  "{{date}}",
  "{{time}}",
  "{{guests}}",
  "{{booking_ref}}",
  "{{qr_token}}",
  "{{event_name}}",
  "{{qr_url}}",
] as const;
