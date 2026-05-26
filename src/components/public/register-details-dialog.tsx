"use client";

import { format } from "date-fns";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Calendar,
  Car,
  Clock,
  Info,
  Mail,
  Minus,
  Moon,
  Phone,
  Plus,
  QrCode,
  User,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { IntlPhoneInput } from "@/components/phone-input";
import { formatSlotTimeRange } from "@/lib/slot-time";
import { cn } from "@/lib/utils";
import type { RegisterSlot } from "@/components/public/register-booking-card";

const NAVY = "#0a4a52";
const TEAL = "#00a8b5";
const FIELD_BG = "#f3f4f6";

/** Product / API cap (see publicRegister schema). */
export const REGISTER_GUEST_MAX = 20;

const SLOT_ICONS = [Car, User, Moon] as const;

function slotIcon(index: number): LucideIcon {
  return SLOT_ICONS[index % SLOT_ICONS.length];
}

/** Compact beach scene for dialog header (tower, surfboard, palms, sunset). */
function DialogBeachArt() {
  return (
    <div
      className="pointer-events-none relative h-[108px] w-[120px] shrink-0 sm:h-[120px] sm:w-[132px]"
      aria-hidden
    >
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#ffecd2]/80 via-[#fcb69f]/40 to-[#00a8b5]/20" />
      <svg viewBox="0 0 140 130" className="relative h-full w-full drop-shadow-sm">
        <ellipse cx="118" cy="22" rx="22" ry="10" fill="#2d6a4f" opacity="0.7" transform="rotate(-20 118 22)" />
        <ellipse cx="128" cy="48" rx="26" ry="11" fill="#40916c" opacity="0.55" transform="rotate(-8 128 48)" />
        <path d="M88 18 Q102 95 94 118 Q84 95 88 18Z" fill="#f4a261" stroke="#e76f51" strokeWidth="1.5" />
        <path d="M90 34 Q94 78 92 100" stroke="#fff" strokeWidth="1.5" opacity="0.4" fill="none" />
        <rect x="18" y="52" width="8" height="42" fill="#a67c52" rx="1" />
        <path d="M8 52 H36 L34 38 H10 Z" fill="#e8b88a" stroke="#8b6914" strokeWidth="0.8" />
        <rect x="10" y="34" width="28" height="10" fill={TEAL} rx="1.5" />
        <circle cx="72" cy="108" r="14" fill="#fff" stroke="#e5e7eb" strokeWidth="0.8" />
        <path d="M72 94 A14 14 0 0 1 86 108 Z" fill={TEAL} />
        <path d="M86 108 A14 14 0 0 1 72 122 Z" fill="#ff7e67" />
      </svg>
    </div>
  );
}

function FieldShell({
  icon: Icon,
  label,
  children,
  className,
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl px-4 py-3.5", className)} style={{ backgroundColor: FIELD_BG }}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: TEAL }} strokeWidth={2} />
        <div className="min-w-0 flex-1">
          <p
            className="text-[10px] font-bold uppercase tracking-[0.2em]"
            style={{ color: TEAL }}
          >
            {label}
          </p>
          {children}
        </div>
      </div>
    </div>
  );
}

function GuestStepper({
  guests,
  onChange,
  maxAllowed,
}: {
  guests: number;
  onChange: (n: number) => void;
  maxAllowed: number;
}) {
  const cap = Math.min(REGISTER_GUEST_MAX, maxAllowed);
  const setG = (n: number) => onChange(Math.max(1, Math.min(cap, Math.floor(n) || 1)));

  return (
    <div
      className="flex h-full flex-col rounded-2xl px-3 py-3.5"
      style={{ backgroundColor: FIELD_BG }}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: TEAL }}>
        Guests
      </p>
      <div className="mt-2 flex flex-1 flex-col items-center justify-center gap-1">
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setG(guests - 1)}
            disabled={guests <= 1}
            className="grid h-9 w-9 place-items-center rounded-full border-2 text-lg font-semibold transition disabled:cursor-not-allowed disabled:opacity-35"
            style={{ borderColor: TEAL, color: TEAL }}
            aria-label="Decrease guests"
          >
            <Minus className="h-4 w-4" strokeWidth={2.5} />
          </button>
          <span
            className="min-w-[2ch] text-center text-3xl font-bold tabular-nums"
            style={{ color: NAVY }}
          >
            {guests}
          </span>
          <button
            type="button"
            onClick={() => setG(guests + 1)}
            disabled={guests >= cap}
            className="grid h-9 w-9 place-items-center rounded-full border-2 text-lg font-semibold transition disabled:cursor-not-allowed disabled:opacity-35"
            style={{ borderColor: TEAL, color: TEAL }}
            aria-label="Increase guests"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>
        <p className="text-[10px] font-medium text-[#5a7a80]">
          Min 1 · Max {REGISTER_GUEST_MAX}
        </p>
      </div>
    </div>
  );
}

function InfoBanner() {
  return (
    <div
      className="relative overflow-hidden rounded-2xl px-4 py-3.5"
      style={{ backgroundColor: "color-mix(in srgb, #00a8b5 12%, white)" }}
    >
      <svg
        viewBox="0 0 200 200"
        className="pointer-events-none absolute -right-6 -top-4 h-28 w-28 opacity-[0.12]"
        aria-hidden
      >
        <path fill="#1b6b4a" d="M8 175 Q45 35 95 15 Q75 75 118 95 Q42 85 32 135 Q0 115 8 175Z" />
        <path fill="#2d8a5e" opacity="0.85" d="M0 150 Q38 55 78 42 Q58 95 100 115 Q28 105 18 145 Q-8 125 0 150Z" />
      </svg>
      <p className="relative flex gap-2.5 text-xs leading-relaxed text-[#0a4a52]/90">
        <Info className="mt-0.5 h-4 w-4 shrink-0" style={{ color: TEAL }} strokeWidth={2} />
        <span>
          A digital pass with QR code will be sent to your email and mobile number.
        </span>
      </p>
    </div>
  );
}

export type RegisterDetailsDialogProps = {
  slot: RegisterSlot;
  slotIndex: number;
  dateLabel: string;
  name: string;
  onNameChange: (v: string) => void;
  mobile: string;
  onMobileChange: (v: string) => void;
  email: string;
  onEmailChange: (v: string) => void;
  guests: number;
  onGuestsChange: (n: number) => void;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
};

export function RegisterDetailsDialog({
  slot,
  slotIndex,
  dateLabel,
  name,
  onNameChange,
  mobile,
  onMobileChange,
  email,
  onEmailChange,
  guests,
  onGuestsChange,
  submitting,
  onClose,
  onSubmit,
}: RegisterDetailsDialogProps) {
  const Icon = slotIcon(slotIndex);
  const booked = slot.capacity - slot.remaining;
  const pct = Math.min(100, Math.round((booked / Math.max(1, slot.capacity)) * 100));
  const full = slot.remaining <= 0;
  const over = !full && guests > slot.remaining;
  const blocked = full || over;
  const guestCap = Math.min(REGISTER_GUEST_MAX, Math.max(1, slot.remaining));

  return (
    <motion.form
      onSubmit={onSubmit}
      initial={{ scale: 0.96, opacity: 0, y: 16 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
      className="relative max-h-[min(92vh,880px)] overflow-y-auto rounded-[24px] bg-white shadow-[0_24px_64px_rgba(10,74,82,0.18)]"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-20 grid h-9 w-9 place-items-center rounded-full bg-white shadow-md transition hover:bg-white/90"
        aria-label="Close"
      >
        <X className="h-4 w-4" style={{ color: NAVY }} strokeWidth={2.5} />
      </button>

      {/* Header */}
      <div className="border-b border-[#e5e7eb]/80 px-5 pb-4 pt-5 pr-14 sm:px-6 sm:pt-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2.5">
            <p
              className="text-[10px] font-bold uppercase tracking-[0.28em]"
              style={{ color: TEAL }}
            >
              Your details
            </p>
            <div className="flex items-center gap-2.5">
              <span
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full"
                style={{ backgroundColor: "color-mix(in srgb, #00a8b5 14%, white)", color: TEAL }}
              >
                <Icon className="h-5 w-5" strokeWidth={2} />
              </span>
              <h2 className="font-display text-xl font-bold leading-tight" style={{ color: NAVY }}>
                {slot.name}
              </h2>
            </div>
            <p className="flex items-center gap-2 text-sm font-semibold" style={{ color: TEAL }}>
              <Calendar className="h-4 w-4 shrink-0" strokeWidth={2} />
              {dateLabel}
            </p>
            <p className="flex items-center gap-2 text-sm font-semibold" style={{ color: NAVY }}>
              <Clock className="h-4 w-4 shrink-0 opacity-80" strokeWidth={2} />
              {formatSlotTimeRange(slot.starts_at, slot.ends_at)}
            </p>
          </div>
          <DialogBeachArt />
        </div>
      </div>

      {/* Capacity */}
      <div className="px-5 py-4 sm:px-6">
        <div className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-[0.22em]">
          <span style={{ color: TEAL }}>Capacity</span>
          <span className="tabular-nums normal-case tracking-normal" style={{ color: NAVY }}>
            <span className="font-bold">{slot.remaining}</span>
            <span className="font-medium text-[#5a7a80]"> / {slot.capacity} left</span>
          </span>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#e5e7eb]">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{ backgroundColor: TEAL }}
          />
        </div>
      </div>

      {/* Form */}
      <div className="space-y-3 px-5 pb-5 sm:px-6 sm:pb-6">
        <FieldShell icon={User} label="Full name">
          <input
            id="rname"
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            required
            maxLength={120}
            autoComplete="name"
            placeholder="Your full name"
            className="mt-1.5 w-full border-0 bg-transparent p-0 text-base font-semibold outline-none placeholder:font-normal placeholder:text-[#9ca3af]"
            style={{ color: NAVY }}
          />
        </FieldShell>

        <div className="grid grid-cols-[1.5fr_1fr] gap-3">
          <FieldShell icon={Phone} label="Mobile number *">
            <div className="register-dialog-phone mt-1">
              <IntlPhoneInput
                value={mobile}
                onChange={onMobileChange}
                placeholder="Mobile number"
                required
                defaultCountry="qa"
                variant="soft"
                className="!bg-transparent !p-0"
              />
            </div>
          </FieldShell>
          <GuestStepper guests={guests} onChange={onGuestsChange} maxAllowed={guestCap} />
        </div>

        <FieldShell icon={Mail} label="Email (optional)">
          <input
            id="remail"
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            maxLength={255}
            autoComplete="email"
            placeholder="you@example.com"
            className="mt-1.5 w-full border-0 bg-transparent p-0 text-base font-semibold outline-none placeholder:font-normal placeholder:text-[#9ca3af]"
            style={{ color: NAVY }}
          />
        </FieldShell>

        <InfoBanner />

        {(full || over) && (
          <div className="rounded-xl border border-[#ff7e67]/35 bg-[#ff7e67]/10 px-4 py-3 text-xs font-medium text-[#c2410c]">
            {full
              ? "This slot is full — please pick another slot."
              : `Only ${slot.remaining} ${slot.remaining === 1 ? "spot" : "spots"} left in this slot. Reduce guest count to continue.`}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || blocked}
          className="group flex w-full items-center justify-center gap-2.5 rounded-full py-4 text-sm font-bold text-white shadow-[0_8px_24px_rgba(0,168,181,0.35)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ backgroundColor: TEAL }}
        >
          <QrCode className="h-5 w-5 shrink-0" strokeWidth={2} />
          <span>
            {submitting
              ? "Reserving your spot…"
              : blocked && full
                ? "Slot full"
                : blocked && over
                  ? "Not enough capacity"
                  : "Get my QR pass"}
          </span>
          <ArrowRight className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-0.5" strokeWidth={2.5} />
        </button>
      </div>
    </motion.form>
  );
}
