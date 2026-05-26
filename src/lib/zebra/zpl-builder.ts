import { presetDefaultLayout } from "@/lib/zebra/presets";
import type {
  EntryPassLabelData,
  LabelLayoutOptions,
  LabelPrintTemplate,
  PrinterSettings,
} from "@/lib/zebra/types";

function inchesToDots(inches: number, dpi: number): number {
  return Math.round(inches * dpi);
}

function fontHeight(size: LabelLayoutOptions["fontSize"]): number {
  if (size === "large") return 32;
  if (size === "small") return 18;
  return 24;
}

function lineHeight(size: LabelLayoutOptions["fontSize"]): number {
  if (size === "large") return 36;
  if (size === "small") return 22;
  return 28;
}

export function applyZplPlaceholders(zpl: string, data: EntryPassLabelData): string {
  return zpl
    .replace(/\{\{customer_name\}\}/g, data.customer_name)
    .replace(/\{\{mobile\}\}/g, data.mobile)
    .replace(/\{\{slot_name\}\}/g, data.slot_name)
    .replace(/\{\{date\}\}/g, data.date)
    .replace(/\{\{time\}\}/g, data.time)
    .replace(/\{\{guests\}\}/g, String(data.guests))
    .replace(/\{\{booking_ref\}\}/g, data.booking_ref)
    .replace(/\{\{qr_token\}\}/g, data.qr_token)
    .replace(/\{\{event_name\}\}/g, data.event_name)
    .replace(/\{\{qr_url\}\}/g, data.qr_url);
}

function detailLines(data: EntryPassLabelData, layout: LabelLayoutOptions): string[] {
  const lines: string[] = [data.customer_name];
  if (layout.show_mobile) lines.push(data.mobile);
  if (layout.show_slot) lines.push(data.slot_name);
  if (layout.show_date) lines.push(data.date);
  if (layout.show_time && data.time) lines.push(data.time);
  if (layout.show_guests) lines.push(`Guests: ${data.guests}`);
  if (layout.show_booking_ref) lines.push(`Ref: ${data.booking_ref}`);
  return lines;
}

function zplTextBlock(
  lines: string[],
  x: number,
  y: number,
  fontH: number,
  lineGap: number,
): string {
  return lines
    .map((line, i) => {
      const safe = line.replace(/[^\x20-\x7E]/g, "?");
      return `^FO${x},${y + i * lineGap}^A0N,${fontH},${fontH}^FD${safe}^FS`;
    })
    .join("\n");
}

function zplQr(data: string, x: number, y: number, magnification: number): string {
  const mag = Math.max(2, Math.min(10, magnification));
  return `^FO${x},${y}^BQN,2,${mag}^FDQA,${data}^FS`;
}

function buildClassic(
  data: EntryPassLabelData,
  layout: LabelLayoutOptions,
  w: number,
  h: number,
): string {
  const fontH = fontHeight(layout.fontSize);
  const gap = lineHeight(layout.fontSize);
  const qrMag = layout.fontSize === "large" ? 5 : 4;
  const qrSize = 120 + qrMag * 18;
  const lines = detailLines(data, layout);
  return [
    "^XA",
    "^CI28",
    zplQr(data.qr_url, 24, 24, qrMag),
    zplTextBlock(lines, qrSize + 32, 28, fontH, gap),
    "^XZ",
  ].join("\n");
}

function buildCompact(
  data: EntryPassLabelData,
  layout: LabelLayoutOptions,
  w: number,
  h: number,
): string {
  const fontH = fontHeight(layout.fontSize);
  const gap = lineHeight(layout.fontSize);
  const qrMag = 4;
  const qrY = layout.show_event_name ? 56 : 20;
  const lines = detailLines(data, layout);
  const textY = qrY + 150;
  const parts = ["^XA", "^CI28"];
  if (layout.show_event_name && data.event_name) {
    parts.push(`^FO20,12^A0N,28,28^FD${data.event_name.replace(/[^\x20-\x7E]/g, "?")}^FS`);
  }
  parts.push(zplQr(data.qr_url, Math.max(20, Math.floor(w / 2) - 80), qrY, qrMag));
  parts.push(zplTextBlock(lines, 20, textY, fontH, gap));
  parts.push("^XZ");
  return parts.join("\n");
}

function buildBoldHeader(
  data: EntryPassLabelData,
  layout: LabelLayoutOptions,
  w: number,
  h: number,
): string {
  const fontH = fontHeight(layout.fontSize);
  const gap = lineHeight(layout.fontSize);
  const title = (data.event_name || "Summer Splash").replace(/[^\x20-\x7E]/g, "?");
  const lines = detailLines(data, layout);
  return [
    "^XA",
    "^CI28",
    `^FO0,0^GB${w},48,48^FS`,
    `^FO16,10^A0N,28,28^FR^FD${title}^FS`,
    zplQr(data.qr_url, 24, 64, 4),
    zplTextBlock(lines, 180, 68, fontH, gap),
    "^XZ",
  ].join("\n");
}

function buildMinimal(data: EntryPassLabelData, layout: LabelLayoutOptions, w: number): string {
  const fontH = fontHeight(layout.fontSize);
  const cx = Math.floor(w / 2) - 90;
  return [
    "^XA",
    "^CI28",
    zplQr(data.qr_url, cx, 20, 6),
    `^FO20,200^A0N,${fontH + 4},${fontH + 4}^FD${data.customer_name.replace(/[^\x20-\x7E]/g, "?")}^FS`,
    `^FO20,240^A0N,${fontH},${fontH}^FD${data.date.replace(/[^\x20-\x7E]/g, "?")}^FS`,
    "^XZ",
  ].join("\n");
}

export function buildEntryPassZpl(
  data: EntryPassLabelData,
  template: Pick<LabelPrintTemplate, "preset_key" | "layout_json" | "zpl_template">,
  printer: Pick<PrinterSettings, "label_width_in" | "label_height_in" | "dpi">,
): string {
  if (template.zpl_template?.trim()) {
    return applyZplPlaceholders(template.zpl_template.trim(), data);
  }

  const layout: LabelLayoutOptions = {
    ...presetDefaultLayout(template.preset_key),
    ...(template.layout_json ?? {}),
  };

  const heightIn = layout.receipt_tall
    ? Math.max(printer.label_height_in, 6)
    : printer.label_height_in;

  const w = inchesToDots(printer.label_width_in, printer.dpi);
  const h = inchesToDots(heightIn, printer.dpi);

  const header = `^PW${w}\n^LL${h}\n`;

  let body: string;
  switch (template.preset_key) {
    case "compact":
      body = buildCompact(data, layout, w, h);
      break;
    case "bold_header":
      body = buildBoldHeader(data, layout, w, h);
      break;
    case "minimal":
      body = buildMinimal(data, layout, w);
      break;
    case "classic":
    default:
      body = buildClassic(data, layout, w, h);
      break;
  }

  return body.replace("^XA", `^XA\n${header}`);
}

export function formatBookingRef(registrationId: string): string {
  return registrationId.replace(/-/g, "").slice(0, 8).toUpperCase();
}
