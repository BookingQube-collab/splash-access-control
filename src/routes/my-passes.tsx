"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  CalendarDays,
  Clock,
  Home,
  LogOut,
  Ticket,
  User,
} from "lucide-react";
import { getMyPasses, getMyPassesFromQrToken } from "@/lib/summersplash.functions";
import { formatActionError, phoneDigits } from "@/lib/utils";
import { todayYmd } from "@/lib/utils";
import { CustomerLogin } from "@/components/customer-app/customer-login";
import { CustomerOverviewTab } from "@/components/customer-app/customer-overview-tab";
import { CustomerCalendarTab } from "@/components/customer-app/customer-calendar-tab";
import { CustomerTimelineTab } from "@/components/customer-app/customer-timeline-tab";
import {
  CustomerAllPassesPanel,
  CustomerPassesListTab,
} from "@/components/customer-app/customer-passes-list-tab";
import { CustomerProfileTab } from "@/components/customer-app/customer-profile-tab";
import { CustomerPassDetail } from "@/components/customer-app/customer-pass-detail";
import type { AppTab, CustomerPass } from "@/components/customer-app/types";
import { PHONE_STORAGE_KEY } from "@/components/customer-app/types";
import {
  firstName as deriveFirstName,
  welcomeBackGuestCount,
  welcomeBackGuestsMessage,
} from "@/components/customer-app/utils";
import { CustomerBeachShell } from "@/components/customer-app/customer-beach-shell";
import { GuestBookButton, SummerBrandMark } from "@/components/customer-app/summer-brand-mark";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { MY_PASSES_QUERY_KEY, myPassesQueryKey, useMyPassesQuery } from "@/hooks/use-my-passes";

type BottomNav = "home" | "calendar" | "passes" | "profile";

const TABS: { key: AppTab; label: string; icon: ReactNode }[] = [
  { key: "today", label: "Today", icon: <Home className="h-3.5 w-3.5" /> },
  { key: "calendar", label: "Calendar", icon: <CalendarDays className="h-3.5 w-3.5" /> },
  { key: "timeline", label: "Timeline", icon: <Clock className="h-3.5 w-3.5" /> },
];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function MyPassesPage({ routePassId = "" }: { routePassId?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const prefillPhone = searchParams.get("phone") ?? "";
  const queryPass = searchParams.get("pass") ?? "";
  const autoLookup = searchParams.get("auto") !== "0";

  const passAnchor = routePassId || queryPass || "";
  const anchorIsUuid = Boolean(passAnchor && UUID_RE.test(passAnchor));
  const [mobile, setMobile] = useState(prefillPhone);
  const passRouteBoot = Boolean(routePassId && UUID_RE.test(routePassId));
  const [unlocked, setUnlocked] = useState(() => Boolean(prefillPhone && phoneDigits(prefillPhone).length >= 7));
  const [tab, setTab] = useState<AppTab>("today");
  const [bottomNav, setBottomNav] = useState<BottomNav>("home");
  const [selectedDate, setSelectedDate] = useState(todayYmd());
  const [detailPass, setDetailPass] = useState<CustomerPass | null>(null);
  const [passDialogView, setPassDialogView] = useState<"detail" | "all">("detail");
  const autoRan = useRef(false);
  const urlBootRan = useRef(false);
  const loginToastShown = useRef(false);

  const passesQuery = useMyPassesQuery(mobile, unlocked);
  const passes = passesQuery.data?.passes ?? [];

  const qrBootQuery = useQuery({
    queryKey: ["my-passes-qr", routePassId],
    queryFn: () => getMyPassesFromQrToken({ qr_token: routePassId }),
    enabled: passRouteBoot && !unlocked,
    staleTime: 10_000,
    placeholderData: keepPreviousData,
  });

  const qrBootPasses = qrBootQuery.data?.passes ?? [];
  const displayPasses = unlocked ? (passes.length > 0 ? passes : qrBootPasses) : qrBootPasses;
  const isFirstLoad =
    (passRouteBoot && !unlocked && qrBootQuery.isLoading && !qrBootQuery.data) ||
    (unlocked && passesQuery.isLoading && !passesQuery.data);
  const [loginPending, setLoginPending] = useState(false);

  useEffect(() => {
    if (prefillPhone) {
      setMobile(prefillPhone);
      if (phoneDigits(prefillPhone).length >= 7) setUnlocked(true);
      return;
    }
    if (typeof window === "undefined") return;
    const stored = sessionStorage.getItem(PHONE_STORAGE_KEY);
    if (stored) setMobile(stored);
  }, [prefillPhone]);

  useEffect(() => {
    if (typeof window === "undefined" || urlBootRan.current) return;
    const phone = searchParams.get("phone");
    const qPass = searchParams.get("pass");
    if (!phone && !(qPass && UUID_RE.test(qPass))) return;

    urlBootRan.current = true;

    if (phone) {
      const trimmed = phone.trim();
      sessionStorage.setItem(PHONE_STORAGE_KEY, trimmed);
      setMobile(trimmed);
      setUnlocked(true);
      void queryClient.invalidateQueries({ queryKey: [MY_PASSES_QUERY_KEY] });
    }

    if (qPass && UUID_RE.test(qPass) && !routePassId) {
      router.replace(`/my-passes/${encodeURIComponent(qPass)}`, { scroll: false });
      return;
    }

    if (phone) {
      router.replace("/my-passes", { scroll: false });
    }
  }, [searchParams, router, routePassId, queryClient]);

  useEffect(() => {
    if (!passRouteBoot || unlocked || !qrBootQuery.isSuccess) return;
    const list = qrBootQuery.data?.passes ?? [];
    if (list.length === 0) {
      toast.error("Pass not found");
      return;
    }
    setUnlocked(true);
    const m0 = list[0]?.mobile;
    if (m0) {
      setMobile(m0);
      if (typeof window !== "undefined") sessionStorage.setItem(PHONE_STORAGE_KEY, m0);
    }
    void queryClient.invalidateQueries({ queryKey: [MY_PASSES_QUERY_KEY] });
    if (!loginToastShown.current) {
      loginToastShown.current = true;
      toast.success(welcomeBackGuestsMessage(welcomeBackGuestCount(list, routePassId)));
    }
  }, [passRouteBoot, unlocked, qrBootQuery.isSuccess, qrBootQuery.data, queryClient, routePassId]);

  useEffect(() => {
    if (prefillPhone || routePassId || !autoLookup || autoRan.current) return;
    if (typeof window === "undefined") return;
    const stored = sessionStorage.getItem(PHONE_STORAGE_KEY);
    if (!stored || phoneDigits(stored).length < 7) return;
    autoRan.current = true;
    setMobile(stored);
    setUnlocked(true);
    void queryClient.invalidateQueries({ queryKey: [MY_PASSES_QUERY_KEY] });
  }, [prefillPhone, routePassId, autoLookup, queryClient]);

  useEffect(() => {
    if (!detailPass) return;
    const updated = displayPasses.find((p) => p.qr_token === detailPass.qr_token);
    if (!updated) return;
    const changed =
      updated.status !== detailPass.status ||
      updated.entered_at !== detailPass.entered_at ||
      updated.exited_at !== detailPass.exited_at;
    if (changed) setDetailPass(updated);
  }, [displayPasses, detailPass]);

  useEffect(() => {
    if (!unlocked || !passAnchor || displayPasses.length === 0) return;
    if (!UUID_RE.test(passAnchor)) return;
    const match = displayPasses.find((p) => p.qr_token === passAnchor);
    if (match) {
      setDetailPass(match);
      setTab("today");
      setBottomNav("home");
    } else if (passesQuery.isSuccess || qrBootQuery.isSuccess) {
      toast.error("Pass not found");
      router.replace("/my-passes");
    }
  }, [unlocked, passAnchor, displayPasses, router, passesQuery.isSuccess, qrBootQuery.isSuccess]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const m = mobile.trim();
    if (phoneDigits(m).length < 7) {
      toast.error("Enter a valid mobile number");
      return;
    }
    loginToastShown.current = false;
    setLoginPending(true);
    toast.loading("Finding your passes…", { id: "pass-lookup" });
    if (typeof window !== "undefined") sessionStorage.setItem(PHONE_STORAGE_KEY, m);
    setMobile(m);
    setUnlocked(true);
    await queryClient.invalidateQueries({ queryKey: [MY_PASSES_QUERY_KEY] });
    try {
      const result = await queryClient.fetchQuery({
        queryKey: myPassesQueryKey(m),
        queryFn: () => getMyPasses({ mobile: m }),
      });
      loginToastShown.current = true;
      if (result.passes.length === 0) toast.info("No passes found for this number");
      else
        toast.success(
          welcomeBackGuestsMessage(welcomeBackGuestCount(result.passes, passAnchor || undefined)),
        );
    } catch (err: unknown) {
      toast.error(formatActionError(err) || "Lookup failed");
    } finally {
      setLoginPending(false);
      toast.dismiss("pass-lookup");
    }
  };

  const reset = useCallback(() => {
    setUnlocked(false);
    setDetailPass(null);
    setBottomNav("home");
    setTab("today");
    autoRan.current = false;
    urlBootRan.current = false;
    loginToastShown.current = false;
    if (typeof window !== "undefined") sessionStorage.removeItem(PHONE_STORAGE_KEY);
    queryClient.removeQueries({ queryKey: [MY_PASSES_QUERY_KEY] });
    if (routePassId && UUID_RE.test(routePassId)) {
      router.push("/my-passes");
    }
  }, [queryClient, routePassId, router]);

  const displayName = useMemo(() => deriveFirstName(displayPasses), [displayPasses]);
  const avatarInitial = displayName[0]?.toUpperCase() ?? "G";

  const matchedPassFromUrl = useMemo(() => {
    if (!passAnchor || !UUID_RE.test(passAnchor) || displayPasses.length === 0) return null;
    return displayPasses.find((p) => p.qr_token === passAnchor) ?? null;
  }, [passAnchor, displayPasses]);

  const activePass = detailPass ?? matchedPassFromUrl;

  useLayoutEffect(() => {
    if (!matchedPassFromUrl) return;
    if (detailPass?.qr_token === matchedPassFromUrl.qr_token) return;
    setDetailPass(matchedPassFromUrl);
  }, [matchedPassFromUrl, detailPass?.qr_token]);

  const goToPassList = useCallback(() => {
    setPassDialogView("detail");
    setDetailPass(null);
    if (passAnchor && UUID_RE.test(passAnchor)) {
      router.push("/my-passes", { scroll: false });
    }
  }, [passAnchor, router]);

  const openPass = useCallback(
    (p: CustomerPass) => {
      setDetailPass(p);
      setPassDialogView("detail");
      const path = `/my-passes/${encodeURIComponent(p.qr_token)}`;
      if (routePassId !== p.qr_token) router.push(path, { scroll: false });
    },
    [routePassId, router],
  );

  const openAllPassesPanel = useCallback(() => {
    setPassDialogView("all");
  }, []);

  const selectTab = (t: AppTab) => {
    setTab(t);
    if (t === "today") setBottomNav("home");
    else if (t === "calendar") setBottomNav("calendar");
  };

  const selectBottomNav = (nav: BottomNav) => {
    setBottomNav(nav);
    if (nav === "home") setTab("today");
    else if (nav === "calendar") setTab("calendar");
  };

  const showTopTabs = bottomNav !== "profile" && bottomNav !== "passes";
  const showUnlocked = unlocked || (passRouteBoot && qrBootQuery.isSuccess && qrBootPasses.length > 0);

  if (passRouteBoot && !showUnlocked) {
    return (
      <CustomerBeachShell className="font-[family-name:var(--font-body)]">
        <motion.div className="grid min-h-screen place-items-center px-6">
          {isFirstLoad ? (
            <motion.div
              className="h-12 w-12 animate-spin rounded-full border-2 border-[#00A9BC]/30 border-t-[#00A9BC]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            />
          ) : (
            <div className="max-w-sm rounded-[20px] bg-white p-8 text-center shadow-lg">
              <p className="font-display text-lg font-extrabold text-[#102A43]">Couldn&apos;t open this pass</p>
              <p className="mt-2 text-sm text-[#102A43]/75">Check the link or sign in with your mobile number.</p>
              <Link
                href="/my-passes"
                className="mt-6 inline-flex rounded-full bg-[#00A9BC] px-6 py-3 text-sm font-bold text-white"
              >
                My passes
              </Link>
            </div>
          )}
        </motion.div>
      </CustomerBeachShell>
    );
  }

  if (
    showUnlocked &&
    anchorIsUuid &&
    displayPasses.length > 0 &&
    !activePass &&
    (passesQuery.isLoading || qrBootQuery.isLoading)
  ) {
    return (
      <CustomerBeachShell className="font-[family-name:var(--font-body)]">
        <div className="grid min-h-screen place-items-center">
          <motion.div
            className="h-11 w-11 animate-spin rounded-full border-2 border-[#00A9BC]/30 border-t-[#00A9BC]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          />
        </div>
      </CustomerBeachShell>
    );
  }

  return (
    <CustomerBeachShell login={!showUnlocked} className="font-[family-name:var(--font-body)]">
      <div className="relative mx-auto min-h-screen w-full max-w-[430px] text-[#0A4A52]">
        <header className="flex items-center justify-between px-4 py-3.5 sm:px-5">
          <SummerBrandMark href="/" className="drop-shadow-sm" />
          {showUnlocked ? (
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#00A8B5] bg-white px-4 py-2 text-[11px] font-bold text-[#00A8B5] shadow-sm"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          ) : (
            <GuestBookButton />
          )}
        </header>

        {!showUnlocked ? (
          <CustomerLogin
            mobile={mobile}
            onMobileChange={setMobile}
            loading={loginPending}
            onSubmit={onSubmit}
          />
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <motion.div
              className="px-4 sm:px-5"
              initial={isFirstLoad ? { opacity: 0.6 } : false}
              animate={{ opacity: 1 }}
            >
              <motion.div
                className="flex items-center gap-3 rounded-[20px] bg-white p-3.5 shadow-[0_10px_32px_rgba(16,42,67,0.12)] ring-1 ring-black/[0.04]"
                initial={isFirstLoad ? { opacity: 0, y: 8 } : false}
                animate={{ opacity: 1, y: 0 }}
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#c4b5fd] font-display text-lg font-extrabold text-[#4c1d95]">
                  {avatarInitial}
                </span>
                <motion.div className="min-w-0 flex-1" layout>
                  <p className="truncate text-[11px] font-medium text-[#102A43]/50">{mobile}</p>
                  <p className="font-display text-base font-extrabold text-[#102A43]">
                    Hey 👋 {displayName}
                  </p>
                </motion.div>
              </motion.div>

              {showTopTabs && (
                <div className="mt-4 flex rounded-full bg-white p-1 shadow-[0_8px_24px_rgba(16,42,67,0.08)] ring-1 ring-black/[0.04]">
                  {TABS.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => selectTab(t.key)}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 text-[12px] font-bold transition ${
                        tab === t.key ? "bg-[#00A9BC] text-white shadow-md" : "text-[#102A43]/45"
                      }`}
                    >
                      {t.icon}
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>

            {isFirstLoad ? (
              <div className="px-4 py-8 sm:px-5">
                <div className="space-y-3">
                  <motion.div
                    className="h-28 animate-pulse rounded-[20px] bg-white/80"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  />
                  <motion.div
                    className="h-20 animate-pulse rounded-[20px] bg-white/60"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.05 }}
                  />
                </div>
              </div>
            ) : (
              <>
                {bottomNav === "profile" ? (
                  <CustomerProfileTab
                    mobile={mobile}
                    displayName={displayName}
                    passCount={displayPasses.length}
                    onSignOut={reset}
                  />
                ) : bottomNav === "passes" ? (
                  <CustomerPassesListTab passes={displayPasses} onOpenPass={openPass} />
                ) : (
                  <>
                    {tab === "today" && (
                      <CustomerOverviewTab
                        passes={displayPasses}
                        firstName={displayName}
                        onOpenPass={openPass}
                      />
                    )}
                    {tab === "calendar" && (
                      <CustomerCalendarTab passes={displayPasses} onOpenPass={openPass} />
                    )}
                    {tab === "timeline" && (
                      <CustomerTimelineTab
                        passes={displayPasses}
                        selectedDate={selectedDate}
                        onSelectDate={setSelectedDate}
                        onOpenPass={openPass}
                      />
                    )}
                  </>
                )}

                {displayPasses.length === 0 && bottomNav !== "profile" && (
                  <motion.div
                    className="px-4 pb-24 text-center"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Link
                      href="/register"
                      className="mt-4 inline-flex rounded-full bg-[#00A9BC] px-6 py-3 font-bold text-white shadow-lg"
                    >
                      Book your first slot
                    </Link>
                  </motion.div>
                )}
              </>
            )}

            <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-black/[0.06] bg-white pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-4px_24px_rgba(16,42,67,0.08)]">
              <motion.div
                className="mx-auto flex w-full max-w-[430px] items-stretch justify-around px-1 pt-1"
                layout
              >
                <BottomNavButton
                  active={bottomNav === "home"}
                  icon={<Home className="h-5 w-5" />}
                  label="Home"
                  onClick={() => selectBottomNav("home")}
                />
                <BottomNavButton
                  active={bottomNav === "calendar"}
                  icon={<CalendarDays className="h-5 w-5" />}
                  label="Calendar"
                  onClick={() => selectBottomNav("calendar")}
                />
                <BottomNavButton
                  active={bottomNav === "passes"}
                  icon={<Ticket className="h-5 w-5" />}
                  label="Passes"
                  onClick={() => selectBottomNav("passes")}
                />
                <BottomNavButton
                  active={bottomNav === "profile"}
                  icon={<User className="h-5 w-5" />}
                  label="Profile"
                  onClick={() => selectBottomNav("profile")}
                />
              </motion.div>
            </nav>
          </motion.div>
        )}

        <Dialog
          open={!!activePass}
          onOpenChange={(open) => {
            if (!open) goToPassList();
          }}
        >
          <DialogContent
            hideClose
            overlayClassName="bg-black/55"
            className="flex max-h-[min(92vh,820px)] w-[min(calc(100vw-2rem),430px)] max-w-[430px] flex-col gap-0 overflow-hidden border-0 bg-white p-0 shadow-2xl sm:rounded-[1.5rem]"
          >
            {activePass && passDialogView === "detail" ? (
              <CustomerPassDetail pass={activePass} onAllPasses={openAllPassesPanel} embedded />
            ) : activePass ? (
              <CustomerAllPassesPanel
                passes={displayPasses}
                currentQrToken={activePass.qr_token}
                onOpenPass={openPass}
                onBack={() => setPassDialogView("detail")}
              />
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </CustomerBeachShell>
  );
}

function BottomNavButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-bold transition ${
        active ? "text-[#00A9BC]" : "text-[#102A43]/40"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
