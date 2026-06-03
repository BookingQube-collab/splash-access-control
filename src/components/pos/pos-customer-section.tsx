"use client";

import { motion } from "framer-motion";
import { ChevronDown, Globe, Loader2, Mail, Phone, QrCode, ScanLine, User, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { IntlPhoneInput } from "@/components/phone-input";
import { PosField } from "@/components/pos/pos-shared";
import {
  POS_AGE_GROUP_OPTIONS,
  POS_NATIONALITY_OPTIONS,
  type PosAgeGroup,
  type PosNationality,
} from "@/lib/pos-customer-demographics";
import { cn } from "@/lib/utils";

export type PosRegistration = {
  id: string;
  customer_name: string;
  mobile: string;
  email?: string | null;
  guest_count: number;
  qr_token: string;
  status: string;
  created_at: string;
  /** Local YYYY-MM-DD booking day (from searchByMobile / lookup). */
  booking_date?: string;
  slots?: { name: string; starts_at: string; ends_at?: string } | null;
};

const INPUT_CLASS = "pos-input h-10 w-full rounded-xl border text-sm text-[#0a4a52]";
const SELECT_CLASS =
  "pos-input pos-customer-select h-10 w-full min-w-0 cursor-pointer appearance-none truncate rounded-xl border py-0 pl-3 pr-9 text-sm text-[#0a4a52]";
const LOCKED_INPUT_CLASS = "cursor-not-allowed opacity-70";

function PosSelectField({
  icon,
  label,
  value,
  onChange,
  disabled,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <PosField icon={icon} label={label}>
      <div className="relative min-w-0">
        <ChevronDown
          className="pointer-events-none absolute right-2.5 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-[#5a7a80]"
          aria-hidden
        />
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={cn(SELECT_CLASS, disabled && LOCKED_INPUT_CLASS)}
        >
          {children}
        </select>
      </div>
    </PosField>
  );
}

export function PosCustomerSection({
  scanInput,
  onScanInputChange,
  onScanSubmit,
  onOpenCamera,
  mobile,
  onMobileChange,
  onMobileBlur,
  nationality,
  onNationalityChange,
  ageGroup,
  onAgeGroupChange,
  name,
  onNameChange,
  email,
  onEmailChange,
  fieldsLoading = false,
  locked = false,
}: {
  scanInput: string;
  onScanInputChange: (v: string) => void;
  onScanSubmit: (raw: string) => void;
  onOpenCamera: () => void;
  mobile: string;
  onMobileChange: (v: string) => void;
  onMobileBlur?: () => void;
  nationality: PosNationality;
  onNationalityChange: (v: PosNationality) => void;
  ageGroup: PosAgeGroup;
  onAgeGroupChange: (v: PosAgeGroup) => void;
  name: string;
  onNameChange: (v: string) => void;
  email: string;
  onEmailChange: (v: string) => void;
  /** Subtle spinner on name/email while customer lookup is in flight. */
  fieldsLoading?: boolean;
  /** Fixed guest profile — scan and fields cannot be edited. */
  locked?: boolean;
}) {
  return (
    <motion.div layout className="flex min-h-0 flex-col gap-2.5">
      <PosField icon={<QrCode className="h-3.5 w-3.5 text-[#00a8b5]" />} label="Scan barcode / QR">
        <motion.div layout className="flex items-center gap-2">
          <Input
            value={scanInput}
            onChange={(e) => onScanInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (locked) return;
              if (e.key === "Enter") {
                e.preventDefault();
                onScanSubmit(scanInput);
              }
            }}
            placeholder="Scan or paste QR / barcode"
            disabled={locked}
            readOnly={locked}
            className={cn(
              INPUT_CLASS,
              "flex-1 uppercase placeholder:normal-case",
              locked && LOCKED_INPUT_CLASS,
            )}
          />
          <button
            type="button"
            onClick={onOpenCamera}
            disabled={locked}
            title="Open camera scanner"
            className={cn(
              "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-[#00a8b5] px-4 text-[11px] font-bold uppercase tracking-wide text-white shadow-[0_8px_20px_-6px_rgba(0,168,181,0.5)] transition hover:bg-[#009199]",
              locked && "cursor-not-allowed opacity-50 hover:bg-[#00a8b5]",
            )}
          >
            <ScanLine className="h-3.5 w-3.5" /> Scan
          </button>
        </motion.div>
      </PosField>

      <PosField icon={<Phone className="h-3.5 w-3.5 text-[#00a8b5]" />} label="Mobile">
        <IntlPhoneInput
          value={mobile}
          onChange={onMobileChange}
          onBlur={onMobileBlur}
          defaultCountry="QA"
          placeholder="Enter phone number"
          className="pos-page-phone"
          disabled={locked}
        />
      </PosField>

      <div className="grid min-w-0 grid-cols-2 gap-2">
        <PosSelectField
          icon={<Globe className="h-3.5 w-3.5 text-[#00a8b5]" />}
          label="Nationality"
          value={nationality}
          onChange={(v) => onNationalityChange(v as PosNationality)}
        >
          {POS_NATIONALITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </PosSelectField>

        <PosSelectField
          icon={<Users className="h-3.5 w-3.5 text-[#00a8b5]" />}
          label="Age group"
          value={ageGroup}
          onChange={(v) => onAgeGroupChange(v as PosAgeGroup)}
        >
          {POS_AGE_GROUP_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label} ({o.range})
            </option>
          ))}
        </PosSelectField>
      </div>

      <PosField icon={<User className="h-3.5 w-3.5 text-[#00a8b5]" />} label="Full name">
        <div className="relative">
          <Input
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            maxLength={120}
            autoComplete="name"
            placeholder="Guest full name (optional)"
            disabled={locked}
            readOnly={locked}
            className={cn(
              INPUT_CLASS,
              fieldsLoading && "pr-9 opacity-90",
              locked && LOCKED_INPUT_CLASS,
            )}
            aria-busy={fieldsLoading}
          />
          {fieldsLoading ? (
            <Loader2
              className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#00a8b5]/75"
              aria-hidden
            />
          ) : null}
        </div>
      </PosField>

      <PosField icon={<Mail className="h-3.5 w-3.5 text-[#00a8b5]" />} label="Email (optional)">
        <div className="relative">
          <Input
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            maxLength={255}
            autoComplete="email"
            placeholder="Email address"
            disabled={locked}
            readOnly={locked}
            className={cn(
              INPUT_CLASS,
              fieldsLoading && "pr-9 opacity-90",
              locked && LOCKED_INPUT_CLASS,
            )}
            aria-busy={fieldsLoading}
          />
          {fieldsLoading ? (
            <Loader2
              className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#00a8b5]/75"
              aria-hidden
            />
          ) : null}
        </div>
      </PosField>
    </motion.div>
  );
}
