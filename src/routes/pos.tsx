"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, LogOut, Maximize2, Minimize2, Search, X } from "lucide-react";
import { toast } from "sonner";
import { RoleGuard } from "@/components/role-guard";
import { PosScannerModeSwitch } from "@/components/staff/pos-scanner-mode-switch";
import { PosBeachShell } from "@/components/pos/pos-beach-shell";
import { SummerSplashLogo } from "@/components/brand/summer-splash-logo";
import { PosCustomerSection, type PosRegistration } from "@/components/pos/pos-customer-section";
import { PosGuestsSection } from "@/components/pos/pos-guests-section";
import { PosPickSlotSection } from "@/components/pos/pos-pick-slot-section";
import { PosSection, type SlotRow } from "@/components/pos/pos-shared";
import { PosSlotTypeCards } from "@/components/pos/pos-slot-type-cards";
import { PosTrustFooter } from "@/components/pos/pos-trust-footer";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { isPastRegistrationBooking, passBookingDate } from "@/lib/pass-active";
import { isSlotPastForDate, pickDefaultPosSlotId } from "@/lib/slot-time";
import { getPublicEvent, posRegister } from "@/lib/summersplash.functions";
import { usePosCustomerLookup } from "@/hooks/use-pos-customer-lookup";
import { tryPrintEntryPass } from "@/lib/zebra/print-entry-pass";
import {
  allowedBookingDates,
  clampBookingDate,
  eventDateRange,
  firstDatesInRange,
  hasMobileLookupInput,
  phoneIdentityKey,
  POS_STRIP_DAY_COUNT,
  todayYmd,
} from "@/lib/utils";

import { useAuth } from "@/hooks/use-auth";
import { canAccessPosModule } from "@/lib/staff-auth";
import type { Html5Qrcode } from "html5-qrcode";

const QrPassModal = dynamic(
  () => import("@/components/qr-pass-modal").then((m) => ({ default: m.QrPassModal })),
  { ssr: false },
);

const PosPhoneSearchDialog = dynamic(
  () =>
    import("@/components/pos/pos-phone-search-dialog").then((m) => ({
      default: m.PosPhoneSearchDialog,
    })),
  { ssr: false },
);

const PosConfirmDialog = dynamic(
  () => import("@/components/pos/pos-confirm-dialog").then((m) => ({ default: m.PosConfirmDialog })),
  { ssr: false },
);

const POS_AUTO_SCAN_AFTER_REGISTER_KEY = "pos-auto-scan-after-register";
const POS_DEFAULT_GUEST_KEY = "pos-default-guest-details";

const POS_DEFAULT_GUEST = {
  mobile: "+97430077074",
  name: "E3",
  email: "rajan@eeeqa.com",
} as const;

function readAutoScanAfterRegisterPref(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(POS_AUTO_SCAN_AFTER_REGISTER_KEY) === "true";
  } catch {
    return false;
  }
}

function writeAutoScanAfterRegisterPref(on: boolean) {
  try {
    window.localStorage.setItem(POS_AUTO_SCAN_AFTER_REGISTER_KEY, on ? "true" : "false");
  } catch {
    /* noop */
  }
}

function readDefaultGuestPref(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const v = window.localStorage.getItem(POS_DEFAULT_GUEST_KEY);
    if (v === null) return true;
    return v === "true";
  } catch {
    return true;
  }
}

function writeDefaultGuestPref(on: boolean) {
  try {
    window.localStorage.setItem(POS_DEFAULT_GUEST_KEY, on ? "true" : "false");
  } catch {
    /* noop */
  }
}

function applyDefaultGuestFields(
  setName: (v: string) => void,
  setMobile: (v: string) => void,
  setEmail: (v: string) => void,
  refs: {
    nameEditedRef: { current: boolean };
    emailEditedRef: { current: boolean };
    lastLookupKeyRef: { current: string };
  },
) {
  refs.nameEditedRef.current = true;
  refs.emailEditedRef.current = true;
  refs.lastLookupKeyRef.current = phoneIdentityKey(POS_DEFAULT_GUEST.mobile);
  setName(POS_DEFAULT_GUEST.name);
  setMobile(POS_DEFAULT_GUEST.mobile);
  setEmail(POS_DEFAULT_GUEST.email);
}

export default function POSPage() {
  return (
    <RoleGuard checkAccess={canAccessPosModule} bare>
      <POS />
    </RoleGuard>
  );
}

function POS() {
  const { signOut } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [bookingDate, setBookingDate] = useState<string | undefined>(undefined);
  const lastEventIdRef = useRef<string | null>(null);
  const userPickedDateRef = useRef(false);

  const { data, refetch } = useQuery({
    queryKey: ["pos-event", bookingDate ?? "auto"],
    queryFn: () => getPublicEvent(bookingDate ? { date: bookingDate } : {}),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    refetchInterval: 5000,
    refetchOnWindowFocus: false,
  });

  const defaultBookingDate = useMemo(() => {
    if (data?.bookingDate) return data.bookingDate;
    if (!data?.event) return undefined;
    const { start, end } = eventDateRange(data.event);
    return clampBookingDate(todayYmd(), start, end);
  }, [data?.bookingDate, data?.event]);

  const activeDate = bookingDate ?? defaultBookingDate;

  // Bind bookingDate on first load / event change; never overwrite a user-picked date on refetch.
  useEffect(() => {
    if (!data?.event || !defaultBookingDate) return;
    const eventId = data.event.id;
    const eventChanged =
      lastEventIdRef.current !== null && lastEventIdRef.current !== eventId;
    lastEventIdRef.current = eventId;
    if (eventChanged) {
      userPickedDateRef.current = false;
      setBookingDate(defaultBookingDate);
      setSlotId("");
      return;
    }
    if (!userPickedDateRef.current && bookingDate === undefined) {
      setBookingDate(defaultBookingDate);
    }
  }, [data?.event?.id, defaultBookingDate, bookingDate, data?.event]);

  const slots = useMemo(() => (data?.slots ?? []) as SlotRow[], [data?.slots]);

  const prefetchDate = useCallback(
    (d: string) => {
      void queryClient.prefetchQuery({
        queryKey: ["pos-event", d],
        queryFn: () => getPublicEvent({ date: d }),
        staleTime: 30_000,
      });
    },
    [queryClient],
  );

  useEffect(() => {
    if (!data?.event) return;
    const today = todayYmd();
    const { allowedStart, allowedEnd } = allowedBookingDates(
      data.event.start_date,
      data.event.end_date,
      today,
    );
    firstDatesInRange(allowedStart, allowedEnd, POS_STRIP_DAY_COUNT).forEach((d) => prefetchDate(d));
  }, [data?.event, prefetchDate]);

  useEffect(() => {
    if (!data?.event || !activeDate) return;
    const { dates } = allowedBookingDates(data.event.start_date, data.event.end_date);
    const idx = dates.indexOf(activeDate);
    if (idx < 0) return;
    if (dates[idx - 1]) prefetchDate(dates[idx - 1]);
    if (dates[idx + 1]) prefetchDate(dates[idx + 1]);
  }, [activeDate, data?.event, prefetchDate]);

  const [slotId, setSlotId] = useState("");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [guests, setGuests] = useState(1);

  const nameEditedRef = useRef(false);
  const emailEditedRef = useRef(false);
  /** Last phone key we auto-filled from (or cleared on empty search). */
  const lastLookupKeyRef = useRef("");

  const {
    debouncedMobile,
    flush: flushMobileLookupDebounce,
    mobileQuery,
    fetchMobileNow,
    tokenLookup,
    customerFieldsLoading,
  } = usePosCustomerLookup(mobile);

  const [passSearchOpen, setPassSearchOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [lastToken, setLastToken] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [passModalAutoDismiss, setPassModalAutoDismiss] = useState(false);
  const [modalMeta, setModalMeta] = useState<{ name?: string; slot?: string; guests?: number }>({});

  const [scanOpen, setScanOpen] = useState(false);
  const [scanInput, setScanInput] = useState("");

  const [isFs, setIsFs] = useState(false);
  const [autoScanAfterRegister, setAutoScanAfterRegister] = useState(false);
  const [defaultGuestDetails, setDefaultGuestDetails] = useState(true);

  useEffect(() => {
    setAutoScanAfterRegister(readAutoScanAfterRegisterPref());
    setDefaultGuestDetails(readDefaultGuestPref());
  }, []);

  const onAutoScanAfterRegisterChange = (on: boolean) => {
    setAutoScanAfterRegister(on);
    writeAutoScanAfterRegisterPref(on);
  };

  const onDefaultGuestDetailsChange = (on: boolean) => {
    setDefaultGuestDetails(on);
    writeDefaultGuestPref(on);
    if (on) {
      applyDefaultGuestFields(setName, setMobile, setEmail, {
        nameEditedRef,
        emailEditedRef,
        lastLookupKeyRef,
      });
    } else {
      setName("");
      setMobile("");
      setEmail("");
      setGuests(1);
      nameEditedRef.current = false;
      emailEditedRef.current = false;
      lastLookupKeyRef.current = "";
    }
  };

  useEffect(() => {
    if (!defaultGuestDetails) return;
    applyDefaultGuestFields(setName, setMobile, setEmail, {
      nameEditedRef,
      emailEditedRef,
      lastLookupKeyRef,
    });
  }, [defaultGuestDetails]);

  useEffect(() => {
    const onChange = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    if (!modalOpen || !passModalAutoDismiss) return;
    const timer = window.setTimeout(() => {
      setModalOpen(false);
      setPassModalAutoDismiss(false);
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [modalOpen, passModalAutoDismiss]);

  const displayName = name.trim() || "Guest";

  const applyCustomer = (r: PosRegistration, opts?: { silent?: boolean }) => {
    nameEditedRef.current = true;
    emailEditedRef.current = true;
    lastLookupKeyRef.current = phoneIdentityKey(r.mobile);
    setName(r.customer_name?.trim() ?? "");
    setMobile(r.mobile);
    setEmail(r.email?.trim() ?? "");
    setGuests(Math.max(1, r.guest_count || 1));
    if (!opts?.silent) toast.success(`Loaded ${r.customer_name}`);
  };

  const clearLookupAutoFields = () => {
    if (!nameEditedRef.current) setName("");
    if (!emailEditedRef.current) setEmail("");
    setGuests(1);
  };

  const fillFromBestMatch = (best: PosRegistration) => {
    if (!nameEditedRef.current && best.customer_name?.trim()) {
      setName(best.customer_name.trim());
    }
    if (!emailEditedRef.current) {
      setEmail(best.email?.trim() ?? "");
    }
    setGuests(Math.max(1, best.guest_count || 1));
  };

  const handleMobileChange = (v: string) => {
    const prevKey = phoneIdentityKey(mobile);
    const nextKey = phoneIdentityKey(v);
    if (prevKey !== nextKey) {
      nameEditedRef.current = false;
      emailEditedRef.current = false;
    }
    setMobile(v);
  };

  const applyMobileSearchResults = (q: string, r: { results?: readonly PosRegistration[] }) => {
    const lookupKey = phoneIdentityKey(q);
    const results = (r.results ?? []) as PosRegistration[];
    const isNewSearch = lookupKey !== lastLookupKeyRef.current;

    if (results.length > 0) {
      lastLookupKeyRef.current = lookupKey;
      fillFromBestMatch(results[0]);
      return;
    }

    if (isNewSearch) {
      lastLookupKeyRef.current = lookupKey;
      clearLookupAutoFields();
    }
  };

  const handleScanSubmit = (raw: string) => {
    if (defaultGuestDetails) return;
    const text = (raw ?? "").trim();
    if (!text) return;
    const tokenMatch = text.match(/[0-9a-fA-F-]{36}/);
    if (tokenMatch) {
      tokenLookup.mutate(tokenMatch[0], {
        onSuccess: (r) => {
          if (r?.result) {
            applyCustomer(r.result as PosRegistration);
          } else toast.error("QR not recognised");
        },
        onError: () => toast.error("Lookup failed"),
      });
    } else {
      const cleaned = text.replace(/\D/g, "") || text;
      const normalized = cleaned.startsWith("+") ? cleaned : `+${cleaned}`;
      handleMobileChange(normalized);
      void fetchMobileNow(normalized).then((data) => {
        if (data) applyMobileSearchResults(normalized, data);
      });
      toast.success(`Scanned ${cleaned}`);
    }
    setScanInput("");
  };

  const scanRef = useRef<Html5Qrcode | null>(null);
  const stopScanner = async () => {
    if (scanRef.current) {
      try {
        await scanRef.current.stop();
        await scanRef.current.clear();
      } catch {
        /* noop */
      }
      scanRef.current = null;
    }
  };

  useEffect(() => {
    if (!scanOpen) {
      stopScanner();
      return;
    }
    const t = setTimeout(async () => {
      const el = document.getElementById("pos-scan-reader");
      if (!el) return;
      const { Html5Qrcode } = await import("html5-qrcode");
      const q = new Html5Qrcode("pos-scan-reader");
      scanRef.current = q;
      try {
        await q.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: 240 },
          (decoded) => {
            setScanOpen(false);
            handleScanSubmit(decoded.trim());
          },
          () => {},
        );
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Camera unavailable");
        setScanOpen(false);
      }
    }, 80);
    return () => {
      clearTimeout(t);
      stopScanner();
    };
  }, [scanOpen]);

  useEffect(() => () => {
    stopScanner();
  }, []);

  useEffect(() => {
    if (!slotId || !activeDate) return;
    const s = slots.find((x) => x.id === slotId);
    if (!s || s.remaining <= 0 || isSlotPastForDate(s, activeDate)) setSlotId("");
  }, [slots, slotId, activeDate]);

  useEffect(() => {
    if (!defaultGuestDetails || !activeDate || slots.length === 0) return;
    const defaultId = pickDefaultPosSlotId(slots, activeDate);
    if (!defaultId) return;
    const current = slots.find((s) => s.id === slotId);
    const currentInvalid =
      !current || current.remaining <= 0 || isSlotPastForDate(current, activeDate);
    if (!slotId || currentInvalid) setSlotId(defaultId);
  }, [defaultGuestDetails, activeDate, slots, slotId]);

  // Clear auto-filled fields when mobile is too short for lookup.
  useEffect(() => {
    if (defaultGuestDetails) return;
    const q = mobile.trim();
    if (!hasMobileLookupInput(q)) {
      if (lastLookupKeyRef.current) {
        clearLookupAutoFields();
        lastLookupKeyRef.current = "";
      }
      nameEditedRef.current = false;
      emailEditedRef.current = false;
    }
  }, [mobile]);

  // Section 2 mobile lookup → silent inline auto-fill (name / email / guests).
  useEffect(() => {
    if (defaultGuestDetails) return;
    if (!hasMobileLookupInput(debouncedMobile)) return;
    if (!mobileQuery.isSuccess || mobileQuery.isFetching) return;
    if (!mobileQuery.data) return;
    applyMobileSearchResults(debouncedMobile, mobileQuery.data);
  }, [debouncedMobile, mobileQuery.data, mobileQuery.isSuccess, mobileQuery.isFetching]);

  const flushMobileLookup = () => {
    const q = mobile.trim();
    if (!hasMobileLookupInput(q)) return;
    flushMobileLookupDebounce();
  };

  const slot = useMemo(() => slots.find((s) => s.id === slotId), [slots, slotId]);
  const maxGuests = slot ? Math.min(20, Math.max(1, slot.remaining)) : 20;

  const phoneReady = hasMobileLookupInput(mobile);

  const slotEnded =
    !!activeDate && !!slot && isSlotPastForDate(slot, activeDate);

  const canBook =
    !!activeDate &&
    !!slot &&
    slot.remaining > 0 &&
    !slotEnded &&
    guests <= slot.remaining &&
    phoneReady;

  const blocked = !canBook;

  const pickSlotCtaLabel = !slotId || !slot
    ? "Choose slot type"
    : !phoneReady
      ? "Enter phone number"
      : guests > slot.remaining
        ? "Reduce guests"
        : !activeDate
          ? "Pick a date"
          : slotEnded
            ? "Slot ended"
            : slot.remaining <= 0
              ? "Slot full"
              : "Book slot";

  const blockReason = !activeDate
    ? "Pick a date"
    : !slot
      ? "Choose slot type"
      : slotEnded
        ? "This slot has ended"
        : slot.remaining <= 0
          ? "Slot full"
          : guests > slot.remaining
            ? "Reduce guests"
            : !phoneReady
              ? "Enter mobile number"
              : "";

  const reprintPass = async (r: PosRegistration) => {
    if (isPastRegistrationBooking(r)) {
      toast.error("Reprint is not available for past booking dates");
      return;
    }
    const booking_date = passBookingDate(r);
    const printed = await tryPrintEntryPass({
      customer_name: r.customer_name,
      mobile: r.mobile,
      slot_name: r.slots?.name ?? "—",
      slot_starts_at: r.slots?.starts_at,
      slot_ends_at: r.slots?.ends_at,
      booking_date,
      guest_count: r.guest_count,
      qr_token: r.qr_token,
      registration_id: r.id,
      event_name: data?.event?.name,
    });
    if (printed) {
      toast.success("Label sent to printer");
      return;
    }
    setLastToken(r.qr_token);
    setModalMeta({ name: r.customer_name, slot: r.slots?.name, guests: r.guest_count });
    setPassModalAutoDismiss(false);
    setModalOpen(true);
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Fullscreen unavailable");
    }
  };

  const onReview = () => {
    if (blocked) {
      toast.error(blockReason);
      return;
    }
    setConfirmOpen(true);
  };

  const onConfirmSubmit = async () => {
    if (!slot) return;
    setSubmitting(true);
    try {
      const res = await posRegister({
        slot_id: slot.id,
        customer_name: displayName,
        mobile: mobile.trim(),
        email: email.trim(),
        guest_count: guests,
        booking_date: activeDate,
        auto_check_in: autoScanAfterRegister,
        skip_email: defaultGuestDetails,
      });
      setLastToken(res.qr_token);
      setModalMeta({ name: displayName, slot: slot.name, guests });
      setConfirmOpen(false);
      setPassModalAutoDismiss(true);
      setModalOpen(true);
      toast.success("Registered ✓");
      if (defaultGuestDetails) {
        applyDefaultGuestFields(setName, setMobile, setEmail, {
          nameEditedRef,
          emailEditedRef,
          lastLookupKeyRef,
        });
      } else {
        setName("");
        setMobile("");
        setEmail("");
        nameEditedRef.current = false;
        emailEditedRef.current = false;
        lastLookupKeyRef.current = "";
      }
      setGuests(1);
      if (!defaultGuestDetails) setSlotId("");
      refetch();
      if (autoScanAfterRegister) {
        toast.success("Checked in at entry");
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  const onDateSelect = (d: string) => {
    userPickedDateRef.current = true;
    setBookingDate(d);
    setSlotId("");
    prefetchDate(d);
  };

  return (
    <PosBeachShell>
      <header className="relative z-30 shrink-0 border-b border-white/60 bg-white/85 shadow-[0_4px_24px_-8px_rgba(10,74,82,0.12)] backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <SummerSplashLogo size="xs" />
            <h1 className="font-display text-sm font-extrabold text-[#0a4a52] sm:text-base">
              <span className="uppercase tracking-[0.12em]">Counter • POS</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <PosScannerModeSwitch compact />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-[#0a4a52] ring-1 ring-[#dce8ea]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#2db87a] animate-pulse" /> Live
            </span>
            <label
              htmlFor="pos-default-guest-details"
              className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-[#0a4a52] ring-1 ring-[#dce8ea] transition hover:bg-[#eefafb]"
              title="Use fixed guest profile and auto-select slot by time"
            >
              <span className="hidden max-w-[9rem] leading-tight sm:inline md:max-w-none">
                Default guest
              </span>
              <span className="sm:hidden">Guest</span>
              <Switch
                id="pos-default-guest-details"
                checked={defaultGuestDetails}
                onCheckedChange={onDefaultGuestDetailsChange}
                className="data-[state=checked]:bg-[#00a8b5]"
              />
            </label>
            <label
              htmlFor="pos-auto-scan-after-register"
              className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-[#0a4a52] ring-1 ring-[#dce8ea] transition hover:bg-[#eefafb]"
              title="After registration, record entry scan (checked in)"
            >
              <span className="hidden max-w-[9rem] leading-tight sm:inline md:max-w-none">
                Check in after registration
              </span>
              <span className="sm:hidden">Auto scan</span>
              <Switch
                id="pos-auto-scan-after-register"
                checked={autoScanAfterRegister}
                onCheckedChange={onAutoScanAfterRegisterChange}
                className="data-[state=checked]:bg-[#00a8b5]"
              />
            </label>
            <button
              type="button"
              onClick={() => setPassSearchOpen(true)}
              title="Search passes by phone"
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-[#0a4a52] ring-1 ring-[#dce8ea] transition hover:bg-[#eefafb] hover:text-[#00a8b5]"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Search</span>
            </button>
            <button
              type="button"
              onClick={toggleFullscreen}
              title={isFs ? "Exit fullscreen" : "Fullscreen"}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-[#0a4a52] ring-1 ring-[#dce8ea] transition hover:bg-[#eefafb] hover:text-[#00a8b5]"
            >
              {isFs ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{isFs ? "Exit" : "Fullscreen"}</span>
            </button>
            <button
              type="button"
              onClick={async () => {
                await signOut();
                router.push("/login");
              }}
              title="Sign out"
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-[#0a4a52] ring-1 ring-[#dce8ea] transition hover:bg-[#fff4f0] hover:text-[#ff7e67]"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex min-h-0 w-full max-w-[1400px] flex-1 flex-col overflow-hidden px-3 py-2 sm:px-6 sm:py-3">
        <div className="grid min-h-0 flex-1 gap-3 overflow-hidden lg:grid-cols-2 lg:gap-4 lg:overflow-visible">
          <div className="flex min-h-0 flex-col gap-3 overflow-hidden">
            <PosSection step={1} title="Choose slot" className="shrink-0">
              <PosSlotTypeCards
                slots={slots}
                slotId={slotId}
                bookingDateYmd={activeDate ?? defaultBookingDate ?? todayYmd()}
                onSelect={setSlotId}
              />
            </PosSection>

            <PosSection step={2} title="Customer" className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <PosCustomerSection
                scanInput={scanInput}
                onScanInputChange={setScanInput}
                onScanSubmit={handleScanSubmit}
                onOpenCamera={() => setScanOpen(true)}
                mobile={mobile}
                onMobileChange={handleMobileChange}
                onMobileBlur={flushMobileLookup}
                name={name}
                onNameChange={(v) => {
                  nameEditedRef.current = true;
                  setName(v);
                }}
                email={email}
                onEmailChange={(v) => {
                  emailEditedRef.current = true;
                  setEmail(v);
                }}
                fieldsLoading={customerFieldsLoading}
                locked={defaultGuestDetails}
              />
            </PosSection>
          </div>

          <div className="pos-pos-right-col flex min-h-0 flex-col gap-2 lg:gap-2.5">
            <PosSection step={3} title="Guests" className="shrink-0">
              <PosGuestsSection guests={guests} setGuests={setGuests} maxAllowed={maxGuests} />
            </PosSection>

            {data?.event && activeDate && (
              <PosSection step={4} title="Pick a slot" className="pos-step-pick-slot !overflow-visible !p-2.5 sm:!p-3">
                <PosPickSlotSection
                  eventStart={data.event.start_date}
                  eventEnd={data.event.end_date}
                  selectedDate={activeDate}
                  onSelectDate={onDateSelect}
                  onPrefetchDate={prefetchDate}
                  daySales={data.daySales}
                  ctaLabel={pickSlotCtaLabel}
                  blocked={blocked}
                  blockReason={blockReason}
                  onBook={onReview}
                />
              </PosSection>
            )}
          </div>
        </div>

        <div className="mt-2 shrink-0">
          <PosTrustFooter />
        </div>
      </main>

      <Dialog open={scanOpen} onOpenChange={setScanOpen}>
        <DialogContent hideClose className="max-w-md border-0 bg-transparent p-0 shadow-none">
          <div className="overflow-hidden rounded-3xl bg-white p-5 shadow-[0_24px_60px_-20px_rgba(10,74,82,0.2)]">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e6f7f8] text-[#00a8b5]">
                  <Camera className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#00a8b5]">Scan</p>
                  <h3 className="font-display text-base font-extrabold text-[#0a4a52]">Mobile barcode / QR</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setScanOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-full bg-[#f3f7f8] text-[#5a7a80] hover:bg-[#e8eef0]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-black/70">
              <div id="pos-scan-reader" className="h-full w-full" />
            </div>
            <p className="mt-3 text-center text-[11px] text-[#5a7a80]">
              Point at a barcode or QR — the mobile field will fill when scanned.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <PosConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        activeDate={activeDate}
        displayName={displayName}
        mobile={mobile}
        email={email}
        slotName={slot?.name}
        guests={guests}
        submitting={submitting}
        onConfirm={onConfirmSubmit}
      />

      <PosPhoneSearchDialog
        open={passSearchOpen}
        onOpenChange={setPassSearchOpen}
        onReprint={reprintPass}
      />

      <QrPassModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        token={lastToken}
        customerName={modalMeta.name}
        slotName={modalMeta.slot}
        guests={modalMeta.guests}
      />
    </PosBeachShell>
  );
}
