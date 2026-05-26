"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { motion } from "framer-motion";
import {
  Check,
  Mail,
  Printer,
  Search,
  Send,
  Ticket,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { PosRegistration } from "@/components/pos/pos-customer-section";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { IntlPhoneInput } from "@/components/phone-input";
import { isPastRegistrationBooking, passBookingDate } from "@/lib/pass-active";
import { resendPassTicket, searchByMobile } from "@/lib/summersplash.functions";
import {
  POS_CUSTOMER_LOOKUP_STALE_MS,
  posCustomerMobileQueryKey,
} from "@/hooks/use-pos-customer-lookup";
import { passUrl } from "@/lib/public-url";
import { formatSlotDisplayLabel } from "@/lib/slot-time";
import { cn, formatActionError, hasMobileLookupInput, parseYmd } from "@/lib/utils";

const PAST_REPRINT_MSG = "Reprint is not available for past booking dates";

function passBookingLabel(r: PosRegistration): string {
  try {
    return format(parseYmd(passBookingDate(r)), "EEE, MMM d, yyyy");
  } catch {
    return "—";
  }
}

function passSlotLabel(r: PosRegistration): string {
  return formatSlotDisplayLabel(r.slots?.name ?? "Guest pass", r.slots?.starts_at, r.slots?.ends_at);
}

function statusTone(status: string): string {
  const s = status.toLowerCase();
  if (s === "active" || s === "inside") return "bg-[#e6f7f8] text-[#0a7a84]";
  if (s === "exited") return "bg-[#f0f0ee] text-[#5a7a80]";
  return "bg-[#fdecec] text-[#c93a3f]";
}

function passStatusLabel(r: PosRegistration): string {
  if (isPastRegistrationBooking(r)) return "Past";
  return r.status;
}

function passStatusTone(r: PosRegistration): string {
  if (isPastRegistrationBooking(r)) return "bg-red-50 text-red-700 ring-1 ring-red-200/80";
  return statusTone(r.status);
}

export function PosPhoneSearchDialog({
  open,
  onOpenChange,
  onReprint,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReprint: (r: PosRegistration) => void;
}) {
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState("");
  const [results, setResults] = useState<PosRegistration[]>([]);
  const [selected, setSelected] = useState<PosRegistration | null>(null);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [reprinting, setReprinting] = useState(false);
  /** Last submitted lookup — restored after search (PhoneInput can desync on layout reflow). */
  const phoneQueryRef = useRef("");

  useEffect(() => {
    if (busy || !phoneQueryRef.current) return;
    setPhone((prev) => (prev.trim() === "" ? phoneQueryRef.current : prev));
  }, [busy]);

  const reset = useCallback(() => {
    setResults([]);
    setSelected(null);
    setSearched(false);
    setBusy(false);
    setResending(false);
    setReprinting(false);
  }, []);

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const runSearch = async () => {
    const q = phone.trim();
    if (!hasMobileLookupInput(q)) {
      toast.error("Enter a valid phone number");
      return;
    }
    phoneQueryRef.current = q;
    setBusy(true);
    setSearched(true);
    setSelected(null);
    try {
      const r = await queryClient.fetchQuery({
        queryKey: posCustomerMobileQueryKey(q),
        queryFn: () => searchByMobile({ mobile: q }),
        staleTime: POS_CUSTOMER_LOOKUP_STALE_MS,
      });
      const list = (r.results ?? []) as PosRegistration[];
      setResults(list);
      if (list.length === 0) toast.info("No passes found for this number");
    } catch (e: unknown) {
      toast.error(formatActionError(e) || "Search failed");
      setResults([]);
    } finally {
      setBusy(false);
      setPhone(phoneQueryRef.current);
    }
  };

  const pickPass = (r: PosRegistration) => {
    setSelected(r);
  };

  const handleResend = async () => {
    if (!selected) return;
    setResending(true);
    try {
      await resendPassTicket({ registration_id: selected.id });
      const url = passUrl(selected.qr_token);
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Ticket resent — pass link copied");
      } catch {
        toast.success("Ticket resent to guest systems");
      }
    } catch (e: unknown) {
      toast.error(formatActionError(e) || "Resend failed");
    } finally {
      setResending(false);
    }
  };

  const handleReprint = async () => {
    if (!selected) return;
    if (isPastRegistrationBooking(selected)) {
      toast.error(PAST_REPRINT_MSG);
      return;
    }
    setReprinting(true);
    try {
      await onReprint(selected);
    } finally {
      setReprinting(false);
    }
  };

  const ready = hasMobileLookupInput(phone);
  const selectedIsPast = selected ? isPastRegistrationBooking(selected) : false;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent hideClose className="max-w-lg border-0 bg-transparent p-0 shadow-none">
        <DialogTitle className="sr-only">Find passes</DialogTitle>
        <DialogDescription className="sr-only">
          Search by mobile to find guest passes
        </DialogDescription>
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          className="overflow-hidden rounded-3xl bg-white shadow-[0_24px_60px_-20px_rgba(10,74,82,0.22)]"
        >
          <motion.div layout className="border-b border-[#dce8ea] bg-[#e6f7f8]/50 px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <motion.div layout className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#00a8b5] text-white shadow-[0_8px_20px_-6px_rgba(0,168,181,0.45)]">
                  <Search className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#00a8b5]">
                    Find passes
                  </p>
                  <h3 className="font-display text-lg font-extrabold text-[#0a4a52]">
                    Search by mobile
                  </h3>
                </div>
              </motion.div>
              <button
                type="button"
                onClick={() => handleOpenChange(false)}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-[#5a7a80] ring-1 ring-[#dce8ea] hover:bg-[#f3f7f8]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>

          <div className="space-y-4 px-5 py-4">
            <div
              className="flex gap-2"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void runSearch();
                }
              }}
            >
              <div className="min-w-0 flex-1">
                <IntlPhoneInput
                  value={phone}
                  onChange={setPhone}
                  defaultCountry="QA"
                  placeholder="Enter phone number"
                  className="pos-page-phone"
                />
              </div>
              <button
                type="button"
                disabled={!ready || busy}
                onClick={() => void runSearch()}
                className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-[#00a8b5] px-4 text-[11px] font-bold uppercase tracking-wide text-white shadow-[0_8px_20px_-6px_rgba(0,168,181,0.5)] transition hover:bg-[#009199] disabled:opacity-50"
              >
                <Search className="h-3.5 w-3.5" />
                {busy ? "…" : "Search"}
              </button>
            </div>

            {searched && !busy && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#00a8b5]"
              >
                {results.length === 0
                  ? "No passes found"
                  : `${results.length} pass${results.length === 1 ? "" : "es"} found`}
              </motion.p>
            )}

            {results.length > 0 && (
              <motion.ul
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="max-h-[min(52vh,360px)] space-y-2 overflow-y-auto pr-0.5"
              >
                {results.map((r) => {
                  const isSelected = selected?.id === r.id;
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => pickPass(r)}
                        className={cn(
                          "flex w-full items-start gap-3 rounded-2xl border px-3.5 py-3 text-left transition",
                          isSelected
                            ? "border-[#00a8b5] bg-[#e6f7f8]/90 ring-1 ring-[#00a8b5]/30"
                            : "border-[#dce8ea] bg-[#f7fafb] hover:border-[#00a8b5]/35 hover:bg-[#eefafb]",
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold",
                            isSelected
                              ? "bg-[#00a8b5] text-white"
                              : "bg-white text-[#00a8b5] ring-1 ring-[#00a8b5]/15",
                          )}
                        >
                          {isSelected ? (
                            <Check className="h-4 w-4" strokeWidth={3} />
                          ) : (
                            r.customer_name.charAt(0).toUpperCase()
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-sm font-bold text-[#0a4a52]">
                              {r.customer_name}
                            </span>
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                                passStatusTone(r),
                              )}
                            >
                              {passStatusLabel(r)}
                            </span>
                          </span>
                          <span className="mt-0.5 block text-[11px] text-[#5a7a80]">
                            {passBookingLabel(r)}
                          </span>
                          <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-[#5a7a80]">
                            <Ticket className="h-3 w-3 shrink-0 text-[#00a8b5]" />
                            {passSlotLabel(r)}
                            <span className="text-[#dce8ea]">·</span>
                            {r.guest_count} guest{r.guest_count === 1 ? "" : "s"}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </motion.ul>
            )}

            {selected && (
              <motion.div
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-2 border-t border-[#dce8ea] pt-3 sm:flex-row"
              >
                <button
                  type="button"
                  disabled={resending}
                  onClick={() => void handleResend()}
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#e6f7f8] text-sm font-bold text-[#00a8b5] ring-1 ring-[#00a8b5]/25 transition hover:bg-[#d4f2f4] disabled:opacity-60"
                >
                  <Send className="h-4 w-4" />
                  {resending ? "Sending…" : "Resend ticket"}
                </button>
                <button
                  type="button"
                  disabled={!selected || reprinting || selectedIsPast}
                  title={selectedIsPast ? PAST_REPRINT_MSG : undefined}
                  onClick={() => {
                    if (!selected || selectedIsPast) return;
                    void handleReprint();
                  }}
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#00a8b5] text-sm font-bold text-white shadow-[0_10px_28px_-8px_rgba(0,168,181,0.45)] transition hover:bg-[#009199] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Printer className="h-4 w-4" />
                  {reprinting ? "Printing…" : "Reprint"}
                </button>
              </motion.div>
            )}

            {selected?.email && (
              <p className="flex items-center justify-center gap-1.5 text-center text-[10px] text-[#5a7a80]">
                <Mail className="h-3 w-3 text-[#00a8b5]" />
                {selected.email}
              </p>
            )}
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
