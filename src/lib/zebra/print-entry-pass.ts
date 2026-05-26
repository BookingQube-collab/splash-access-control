"use client";

import { format } from "date-fns";
import { formatSlotTimeRange } from "@/lib/slot-time";
import { isPastBookingYmd } from "@/lib/pass-active";
import { passUrl } from "@/lib/public-url";
import { formatYmd } from "@/lib/utils";
import { buildEntryPassZpl, formatBookingRef } from "@/lib/zebra/zpl-builder";
import type {
  EntryPassLabelData,
  LabelPrintTemplate,
  PrinterSettings,
} from "@/lib/zebra/types";
import type { BrowserPrintDevice } from "@/lib/zebra/browser-print";

export type PrintEntryPassInput = {
  customer_name: string;
  mobile: string;
  slot_name: string;
  slot_starts_at?: string;
  slot_ends_at?: string;
  booking_date?: string;
  guest_count: number;
  qr_token: string;
  registration_id: string;
  event_name?: string;
};

export type LabelPrintBundle = {
  printer: PrinterSettings;
  template: LabelPrintTemplate;
};

function formatLabelDate(bookingDate?: string, startsAt?: string): string {
  const raw = bookingDate || (startsAt ? startsAt.slice(0, 10) : "");
  if (!raw) return "";
  try {
    return format(new Date(`${raw}T12:00:00`), "MMM d, yyyy");
  } catch {
    return raw;
  }
}

export function toEntryPassLabelData(
  input: PrintEntryPassInput,
  eventName = "Summer Splash",
): EntryPassLabelData {
  return {
    customer_name: input.customer_name,
    mobile: input.mobile,
    slot_name: input.slot_name,
    date: formatLabelDate(input.booking_date, input.slot_starts_at),
    time: input.slot_starts_at
      ? formatSlotTimeRange(input.slot_starts_at, input.slot_ends_at)
      : "",
    guests: input.guest_count,
    booking_ref: formatBookingRef(input.registration_id),
    qr_token: input.qr_token,
    event_name: eventName,
    qr_url: passUrl(input.qr_token),
  };
}

function downloadZpl(zpl: string, filename = "entry-pass.zpl"): void {
  const blob = new Blob([zpl], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function browserPrintAvailable(): boolean {
  return typeof window !== "undefined" && !!window.BrowserPrint;
}

function sendViaBrowserPrint(zpl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!browserPrintAvailable()) {
      reject(new Error("Zebra Browser Print is not installed or not running"));
      return;
    }
    window.BrowserPrint!.getDefaultDevice(
      "printer",
      (device: BrowserPrintDevice | null) => {
        if (!device) {
          reject(new Error("No default Zebra printer found in Browser Print"));
          return;
        }
        device.send(
          zpl,
          () => resolve(),
          (err) => reject(err ?? new Error("Print failed")),
        );
      },
      (err) => reject(err ?? new Error("Browser Print error")),
    );
  });
}

async function sendViaNetworkProxy(zpl: string): Promise<void> {
  const { sendZplToNetworkPrinter } = await import("@/lib/label-print.functions");
  await sendZplToNetworkPrinter({ zpl });
}

export type PrintEntryPassResult =
  | { ok: true; method: "browser_print" | "network" }
  | { ok: false; reason: "disabled" | "error"; message: string; zpl?: string };

export async function printEntryPassLabel(
  input: PrintEntryPassInput,
  bundle: LabelPrintBundle,
): Promise<PrintEntryPassResult> {
  if (!bundle.printer.enabled) {
    return { ok: false, reason: "disabled", message: "Label printing is disabled in admin settings" };
  }

  const labelData = toEntryPassLabelData(input, bundle.template.layout_json?.show_event_name ? input.event_name : undefined);
  const zpl = buildEntryPassZpl(labelData, bundle.template, bundle.printer);

  try {
    if (bundle.printer.connection === "network" && bundle.printer.network_host.trim()) {
      await sendViaNetworkProxy(zpl);
      return { ok: true, method: "network" };
    }

    if (browserPrintAvailable()) {
      await sendViaBrowserPrint(zpl);
      return { ok: true, method: "browser_print" };
    }

    downloadZpl(zpl);
    return {
      ok: false,
      reason: "error",
      message:
        "Browser Print not detected — downloaded entry-pass.zpl. Install Zebra Browser Print and try again.",
      zpl,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Print failed";
    try {
      downloadZpl(zpl);
    } catch {
      /* noop */
    }
    return { ok: false, reason: "error", message, zpl };
  }
}

export async function fetchLabelPrintBundle(): Promise<LabelPrintBundle | null> {
  const { getLabelPrintBundle } = await import("@/lib/label-print.functions");
  const bundle = await getLabelPrintBundle();
  if (!bundle?.template) return null;
  return { printer: bundle.printer, template: bundle.template };
}

function printBookingYmd(input: PrintEntryPassInput): string | null {
  if (input.booking_date) return input.booking_date;
  if (input.slot_starts_at) {
    try {
      return formatYmd(new Date(input.slot_starts_at));
    } catch {
      return null;
    }
  }
  return null;
}

/** Print label when enabled; returns false if caller should fall back (e.g. QR modal). */
export async function tryPrintEntryPass(input: PrintEntryPassInput): Promise<boolean> {
  const bookingYmd = printBookingYmd(input);
  if (bookingYmd && isPastBookingYmd(bookingYmd)) {
    const { toast } = await import("sonner");
    toast.error("Cannot print passes for past booking dates");
    return false;
  }

  const bundle = await fetchLabelPrintBundle();
  if (!bundle?.printer.enabled || !bundle.template) return false;
  const result = await printEntryPassLabel(input, {
    printer: bundle.printer,
    template: bundle.template,
  });
  if (result.ok) return true;
  if (result.message) {
    const { toast } = await import("sonner");
    toast.message(result.message);
  }
  return result.reason !== "disabled";
}
