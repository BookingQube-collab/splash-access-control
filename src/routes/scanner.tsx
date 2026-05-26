"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { RoleGuard } from "@/components/role-guard";
import { ScannerPageShell } from "@/components/scanner/scanner-page-shell";
import { ScannerSiteHeader } from "@/components/scanner/scanner-site-header";
import { ScannerRecentPanel } from "@/components/scanner/scanner-recent-panel";
import { ScannerMainPanel } from "@/components/scanner/scanner-main-panel";
import { ScannerCurrentSlotPanel } from "@/components/scanner/scanner-current-slot-panel";
import {
  ScannerBottomNav,
  type ScannerMobileTab,
} from "@/components/scanner/scanner-bottom-nav";
import { ScannerMobileShell } from "@/components/scanner/scanner-mobile-shell";
import { ScannerMobileHeader } from "@/components/scanner/scanner-mobile-header";
import { ScannerMobileScannerView } from "@/components/scanner/scanner-mobile-scanner-view";
import { ScannerMobileRecentView } from "@/components/scanner/scanner-mobile-recent-view";
import { ScannerMobileSlotView } from "@/components/scanner/scanner-mobile-slot-view";
import type {
  RecentScanItem,
  ScannerTodaySlot,
  SlotRegistrationItem,
} from "@/components/scanner/scanner-types";
import { createScanditScanner, type ScanditScannerHandle } from "@/lib/scandit/scanner-runtime";
import {
  getRegistrationsForSlotDay,
  getScanditConfig,
  getScannerSidePanelData,
  getScannerTodaySlots,
  scanQR,
} from "@/lib/summersplash.functions";
import { SCANNER_DESKTOP_MEDIA } from "@/components/scanner/scanner-layout";
import { useScannerIsDesktop } from "@/hooks/use-scanner-layout";
import { cn, formatYmd, todayYmd } from "@/lib/utils";

function isScannedToday(scannedAt: string): boolean {
  try {
    return formatYmd(new Date(scannedAt)) === todayYmd();
  } catch {
    return false;
  }
}

const RECENT_DEDUPE_MS = 2500;
const RECENT_MAX = 20;
const SCANNER_SIDE_QUERY_KEY = ["scanner-side-panel", RECENT_MAX] as const;
const SCANNER_SIDE_STALE_MS = 60_000;
const SCANNER_SLOTS_QUERY_KEY = ["scanner-today-slots"] as const;
const SCANNER_SLOTS_STALE_MS = 30_000;
const QR_READER_MOBILE_ID = "qr-reader-mobile";
const QR_READER_DESKTOP_ID = "qr-reader-desktop";

const SIDE_PANEL_WIDTH =
  "lg:w-[min(max(280px,28%),380px)] lg:min-w-[280px] lg:max-w-[380px]";

type ActiveSlotMeta = {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
};

function pickDefaultSlotId(slots: ScannerTodaySlot[]): string | null {
  if (slots.length === 0) return null;
  const withRegs = slots.find((s) => s.registered > 0);
  return (withRegs ?? slots[0]).id;
}

function metaFromSlot(slot: ScannerTodaySlot): ActiveSlotMeta {
  return {
    id: slot.id,
    name: slot.name,
    startsAt: slot.startsAt,
    endsAt: slot.endsAt,
  };
}

export default function ScannerPage() {
  return (
    <RoleGuard role="scanner" bare>
      <Scanner />
    </RoleGuard>
  );
}

function Scanner() {
  const [mode, setMode] = useState<"entry" | "exit">("entry");
  const [result, setResult] = useState<{
    valid: boolean;
    reason: string;
    customer?: string;
  } | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraEngine, setCameraEngine] = useState<"scandit" | "html5" | null>(null);
  const [cameraNotice, setCameraNotice] = useState<string | null>(null);
  const [hwInput, setHwInput] = useState("");
  const [mobileTab, setMobileTab] = useState<ScannerMobileTab>("scanner");
  const isDesktopLayout = useScannerIsDesktop();
  const queryClient = useQueryClient();
  const { data: sidePanel, isLoading: sidePanelLoading } = useQuery({
    queryKey: SCANNER_SIDE_QUERY_KEY,
    queryFn: () => getScannerSidePanelData(RECENT_MAX),
    staleTime: SCANNER_SIDE_STALE_MS,
  });

  const scanditEnabled = sidePanel?.scanditEnabled ?? false;
  const recentScans = sidePanel?.recentScans ?? [];
  const recentLoading = sidePanelLoading && recentScans.length === 0;

  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const [activeDateYmd, setActiveDateYmd] = useState<string>(todayYmd());
  const [activeSlotMeta, setActiveSlotMeta] = useState<ActiveSlotMeta | null>(null);

  const { data: todaySlotsPayload, isLoading: todaySlotsLoading } = useQuery({
    queryKey: SCANNER_SLOTS_QUERY_KEY,
    queryFn: () => getScannerTodaySlots({ date: todayYmd() }),
    staleTime: SCANNER_SLOTS_STALE_MS,
  });

  const todaySlots = todaySlotsPayload?.slots ?? [];
  const [slotRegistrations, setSlotRegistrations] = useState<SlotRegistrationItem[]>([]);
  const [slotRegsLoading, setSlotRegsLoading] = useState(false);
  const html5Ref = useRef<Html5Qrcode | null>(null);
  const scanditRef = useRef<ScanditScannerHandle | null>(null);
  const lastScanned = useRef<{ token: string; t: number } | null>(null);

  const selectTodaySlot = useCallback((slotId: string, slots: ScannerTodaySlot[]) => {
    const slot = slots.find((s) => s.id === slotId);
    if (!slot) return;
    setActiveSlotId(slot.id);
    setActiveSlotMeta(metaFromSlot(slot));
  }, []);

  useEffect(() => {
    if (!todaySlotsPayload) return;
    setActiveDateYmd(todaySlotsPayload.bookingDate ?? todayYmd());
  }, [todaySlotsPayload]);

  useEffect(() => {
    if (todaySlotsLoading || todaySlots.length === 0) return;
    if (activeSlotId && todaySlots.some((s) => s.id === activeSlotId)) return;
    const defaultId = pickDefaultSlotId(todaySlots);
    if (defaultId) {
      selectTodaySlot(defaultId, todaySlots);
    }
  }, [todaySlotsLoading, todaySlots, activeSlotId, selectTodaySlot]);

  const refreshSlotRegistrations = useCallback(async (slotId: string, dateYmd: string) => {
    setSlotRegsLoading(true);
    try {
      const payload = await getRegistrationsForSlotDay({ slotId, dateYmd });
      if (payload.slot) {
        setActiveSlotMeta({
          id: payload.slot.id,
          name: payload.slot.name,
          startsAt: payload.slot.startsAt,
          endsAt: payload.slot.endsAt,
        });
      }
      setSlotRegistrations(payload.registrations);
    } catch {
      setSlotRegistrations([]);
    } finally {
      setSlotRegsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!activeSlotId || !activeDateYmd) return;
    void refreshSlotRegistrations(activeSlotId, activeDateYmd);
  }, [activeSlotId, activeDateYmd, refreshSlotRegistrations]);

  const pushRecentScan = useCallback(
    (item: RecentScanItem) => {
      queryClient.setQueryData<NonNullable<typeof sidePanel>>(SCANNER_SIDE_QUERY_KEY, (prev) => {
        const list = (prev?.recentScans ?? []).filter((s) => isScannedToday(s.scannedAt));
        const last = list[0];
        if (
          last &&
          last.slotName === item.slotName &&
          Date.now() - new Date(last.scannedAt).getTime() < RECENT_DEDUPE_MS
        ) {
          return prev ?? { scanditEnabled, recentScans: list };
        }
        const withoutDup = list.filter((s) => s.id !== item.id);
        return {
          scanditEnabled: prev?.scanditEnabled ?? scanditEnabled,
          recentScans: [item, ...withoutDup].slice(0, RECENT_MAX),
        };
      });
    },
    [queryClient, scanditEnabled],
  );

  const applyScanSlotContext = useCallback((r: Record<string, unknown>) => {
    const slotId = "slot_id" in r && typeof r.slot_id === "string" ? r.slot_id : null;
    const bookingDate =
      "booking_date" in r && typeof r.booking_date === "string" ? r.booking_date : null;
    if (slotId) setActiveSlotId(slotId);
    if (bookingDate) setActiveDateYmd(bookingDate);
    if (
      "slot" in r &&
      typeof r.slot === "string" &&
      slotId &&
      "slot_starts_at" in r &&
      typeof r.slot_starts_at === "string" &&
      "slot_ends_at" in r &&
      typeof r.slot_ends_at === "string"
    ) {
      setActiveSlotMeta({
        id: slotId,
        name: r.slot,
        startsAt: r.slot_starts_at,
        endsAt: r.slot_ends_at,
      });
    }
  }, []);

  const handleToken = async (token: string) => {
    const now = Date.now();
    if (
      lastScanned.current &&
      lastScanned.current.token === token &&
      now - lastScanned.current.t < RECENT_DEDUPE_MS
    ) {
      return;
    }
    lastScanned.current = { token, t: now };

    try {
      const r = await scanQR({ qr_token: token, mode });
      setResult(r);
      if (r.valid) {
        applyScanSlotContext(r as Record<string, unknown>);
        if ("slot" in r && typeof r.slot === "string" && r.slot) {
          pushRecentScan({
            id: `session-${token}-${now}`,
            slotName: r.slot,
            customerName: "customer" in r && typeof r.customer === "string" ? r.customer : null,
            phone: "mobile" in r && typeof r.mobile === "string" ? r.mobile : null,
            slotStartsAt:
              "slot_starts_at" in r && typeof r.slot_starts_at === "string" ? r.slot_starts_at : null,
            slotEndsAt:
              "slot_ends_at" in r && typeof r.slot_ends_at === "string" ? r.slot_ends_at : null,
            scannedAt: new Date().toISOString(),
            guestCount: "guests" in r && typeof r.guests === "number" ? r.guests : undefined,
            mode,
          });
        }
        const slotId =
          "slot_id" in r && typeof r.slot_id === "string" ? r.slot_id : activeSlotId;
        const dateYmd =
          "booking_date" in r && typeof r.booking_date === "string"
            ? r.booking_date
            : activeDateYmd;
        if (slotId && dateYmd) {
          void refreshSlotRegistrations(slotId, dateYmd);
        }
      }
      setTimeout(() => setResult(null), 1800);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Scan failed";
      setResult({ valid: false, reason: message });
      setTimeout(() => setResult(null), 1800);
    }
  };

  const startHtml5Camera = async (container: HTMLElement) => {
    const { width, height } = container.getBoundingClientRect();
    const aspectRatio = width > 0 && height > 0 ? width / height : 4 / 3;
    const q = new Html5Qrcode(container.id);
    html5Ref.current = q;
    await q.start(
      { facingMode: "environment" },
      {
        fps: 10,
        aspectRatio,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const edge = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.72);
          return { width: edge, height: edge };
        },
      },
      (decoded) => {
        void handleToken(decoded);
      },
      () => {},
    );
  };

  const startCamera = async () => {
    setCameraOn(true);
    setCameraEngine(null);
    setCameraNotice(null);

    await new Promise((resolve) => setTimeout(resolve, 100));

    const readerId =
      typeof window !== "undefined" && window.matchMedia(SCANNER_DESKTOP_MEDIA).matches
        ? QR_READER_DESKTOP_ID
        : QR_READER_MOBILE_ID;
    const el = document.getElementById(readerId);
    if (!el) {
      setCameraOn(false);
      return;
    }

    if (scanditEnabled) {
      try {
        const config = await getScanditConfig();
        if (config.enabled && config.key.trim()) {
          const handle = await createScanditScanner(el, config.key, (decoded) => {
            void handleToken(decoded);
          });
          scanditRef.current = handle;
          setCameraEngine("scandit");
          return;
        }
        if (config.enabled && !config.key.trim()) {
          setCameraNotice("Scandit is enabled but no license key is stored — using browser camera.");
        }
      } catch (e) {
        console.error(e);
        const message = e instanceof Error ? e.message : "Scandit failed to start";
        setCameraNotice(`${message} — using browser camera.`);
      }
    }

    try {
      await startHtml5Camera(el);
      setCameraEngine("html5");
    } catch (e) {
      console.error(e);
      const message = e instanceof Error ? e.message : "Camera failed to start";
      setCameraNotice(message);
      setCameraOn(false);
      setCameraEngine(null);
    }
  };

  const stopCamera = async () => {
    if (scanditRef.current) {
      try {
        await scanditRef.current.stop();
      } catch {
        /* ignore */
      }
      scanditRef.current = null;
    }
    if (html5Ref.current) {
      try {
        await html5Ref.current.stop();
        await html5Ref.current.clear();
      } catch {
        /* ignore */
      }
      html5Ref.current = null;
    }
    setCameraEngine(null);
    setCameraNotice(null);
    setCameraOn(false);
  };

  useEffect(() => () => {
    void stopCamera();
  }, []);

  useEffect(() => {
    if (mobileTab !== "scanner" && cameraOn) {
      void stopCamera();
    }
  }, [mobileTab, cameraOn]);

  const activeSlotRegistered =
    todaySlots.find((s) => s.id === activeSlotId)?.registered ?? slotRegistrations.length;

  const hwSubmit = () => {
    const t = hwInput.trim();
    if (t) {
      void handleToken(t);
      setHwInput("");
    }
  };

  return (
    <ScannerPageShell
      className="font-sans text-[#0a2540]"
      layout={isDesktopLayout ? "desktop" : "mobile"}
    >
      {!isDesktopLayout ? (
        <ScannerMobileShell>
          <ScannerMobileHeader />
          <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
            {mobileTab === "scanner" && (
              <ScannerMobileScannerView
                slotName={activeSlotMeta?.name}
                registeredCount={slotRegsLoading ? activeSlotRegistered : slotRegistrations.length}
                slotRegsLoading={slotRegsLoading}
                scanditEnabled={scanditEnabled}
                cameraEngine={cameraEngine}
                cameraNotice={cameraNotice}
                mode={mode}
                onModeChange={setMode}
                cameraOn={cameraOn}
                onStartCamera={() => void startCamera()}
                onStopCamera={() => void stopCamera()}
                hwInput={hwInput}
                onHwInputChange={setHwInput}
                onHwSubmit={hwSubmit}
              />
            )}
            {mobileTab === "recent" && (
              <ScannerMobileRecentView scans={recentScans} loading={recentLoading} />
            )}
            {mobileTab === "slot" && (
              <ScannerMobileSlotView
                slots={todaySlots}
                slotsLoading={todaySlotsLoading}
                activeSlotId={activeSlotId}
                onSelectSlot={(id) => selectTodaySlot(id, todaySlots)}
                slotName={activeSlotMeta?.name}
                registrations={slotRegistrations}
                loading={slotRegsLoading}
              />
            )}
          </div>
          <ScannerBottomNav active={mobileTab} onChange={setMobileTab} />
        </ScannerMobileShell>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
        <ScannerSiteHeader />
        <main className="relative z-10 mx-auto flex min-h-0 w-full max-w-[1440px] flex-1 flex-col overflow-hidden px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex min-h-0 w-full flex-1 flex-col gap-3 overflow-hidden lg:flex-row lg:gap-3">
            <div className={cn("w-full shrink-0", SIDE_PANEL_WIDTH)}>
              <ScannerRecentPanel scans={recentScans} loading={recentLoading} />
            </div>

            <div className="min-h-0 min-w-0 flex-1">
              <ScannerMainPanel
                scanditEnabled={scanditEnabled}
                cameraEngine={cameraEngine}
                cameraNotice={cameraNotice}
                mode={mode}
                onModeChange={setMode}
                cameraOn={cameraOn}
                onStartCamera={() => void startCamera()}
                onStopCamera={() => void stopCamera()}
                hwInput={hwInput}
                onHwInputChange={setHwInput}
                onHwSubmit={hwSubmit}
              />
            </div>

            <div className={cn("w-full shrink-0", SIDE_PANEL_WIDTH)}>
              <ScannerCurrentSlotPanel
                slots={todaySlots}
                slotsLoading={todaySlotsLoading}
                activeSlotId={activeSlotId}
                onSelectSlot={(id) => selectTodaySlot(id, todaySlots)}
                slotName={activeSlotMeta?.name}
                slotStartsAt={activeSlotMeta?.startsAt}
                slotEndsAt={activeSlotMeta?.endsAt}
                registrations={slotRegistrations}
                loading={slotRegsLoading}
              />
            </div>
          </div>
        </main>
        </div>
      )}

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className={`fixed inset-0 z-50 flex flex-col items-center justify-center text-white ${
              result.valid
                ? "bg-gradient-to-br from-success to-aqua"
                : "bg-gradient-to-br from-destructive to-coral"
            }`}
          >
            <motion.div
              initial={{ scale: 0.5, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 14 }}
            >
              {result.valid ? (
                <CheckCircle2 className="h-36 w-36 drop-shadow-2xl" />
              ) : (
                <XCircle className="h-36 w-36 drop-shadow-2xl" />
              )}
            </motion.div>
            <h2 className="mt-6 font-display text-5xl font-extrabold tracking-tight drop-shadow-lg">
              {result.valid ? "VALID" : "INVALID"}
            </h2>
            <p className="mt-3 text-xl opacity-95">{result.reason}</p>
            {result.customer && (
              <p className="mt-1 text-2xl font-semibold">{result.customer}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </ScannerPageShell>
  );
}
