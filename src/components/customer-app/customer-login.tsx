"use client";

import { motion } from "framer-motion";
import { ArrowRight, Phone, ShieldCheck } from "lucide-react";
import { Label } from "@/components/ui/label";
import { IntlPhoneInput } from "@/components/phone-input";
import { LoginWaveMark } from "@/components/public/login-beach-layout";

export function CustomerLogin({
  mobile,
  onMobileChange,
  loading,
  onSubmit,
}: {
  mobile: string;
  onMobileChange: (v: string) => void;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="customer-login-content flex flex-col px-4 pb-10 sm:px-5"
    >
      <div className="mx-auto flex w-full max-w-[430px] flex-col items-center text-center">
        <div className="relative mb-6">
          <div className="absolute inset-0 scale-110 rounded-full bg-white/40 blur-2xl" aria-hidden />
          <LoginWaveMark className="relative" />
        </div>

        <p className="max-w-[19rem] text-sm leading-relaxed text-[#5a7a80]">
          Enter your mobile to view all your beach passes
        </p>
      </div>

      <motion.form
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        onSubmit={onSubmit}
        className="mx-auto mt-8 w-full max-w-[430px] rounded-3xl bg-white p-5 shadow-[0_20px_50px_rgba(10,74,82,0.12)] sm:p-6"
      >
        <div>
          <Label className="mb-2.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#0A4A52]/55">
            <Phone className="h-3.5 w-3.5 text-[#00A8B5]" strokeWidth={2.25} />
            Mobile • Qatar +974
          </Label>
          <IntlPhoneInput
            value={mobile}
            onChange={onMobileChange}
            placeholder="e.g. 55123456"
            defaultCountry="qa"
            variant="outline"
            className="customer-login-phone h-14 rounded-2xl border-[#dce8ea] bg-white text-[#0A4A52] shadow-none"
            autoFocus
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="group mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#00A8B5] text-[15px] font-bold text-white shadow-[0_10px_28px_rgba(0,168,181,0.38)] transition hover:brightness-[1.04] disabled:opacity-60"
        >
          {loading ? "Finding your passes…" : "Send Verification Code"}
          <ArrowRight className="h-5 w-5 transition group-hover:translate-x-0.5" />
        </button>
        <p className="mt-4 text-center text-[11px] leading-relaxed text-[#5a7a80]">
          <span className="italic">No password needed — we match your booking number.</span>
        </p>
      </motion.form>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mx-auto mt-5 w-full max-w-[430px] rounded-3xl border border-[#00A8B5]/12 bg-[#e8f7f9]/95 p-5 shadow-[0_12px_32px_rgba(10,74,82,0.06)]"
      >
        <div className="flex gap-3.5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-[#00A8B5] shadow-[0_4px_12px_rgba(10,74,82,0.08)]">
            <ShieldCheck className="h-5 w-5" strokeWidth={2.25} />
          </span>
          <div>
            <p className="text-sm font-bold text-[#0A4A52]">Secure &amp; Private</p>
            <p className="mt-1 text-xs leading-relaxed text-[#5a7a80]">
              We only use your number to find your bookings and send your passes.
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
