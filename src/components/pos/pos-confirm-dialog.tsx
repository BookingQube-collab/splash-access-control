"use client";

import { motion } from "framer-motion";
import { Edit3, Sparkles, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { PosRow } from "@/components/pos/pos-shared";

export function PosConfirmDialog({
  open,
  onOpenChange,
  activeDate,
  displayName,
  mobile,
  email,
  nationalityLabel,
  ageGroupLabel,
  slotName,
  guests,
  submitting,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeDate?: string;
  displayName: string;
  mobile: string;
  email: string;
  nationalityLabel: string;
  ageGroupLabel: string;
  slotName?: string;
  guests: number;
  submitting: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideClose className="max-w-md border-0 bg-transparent p-0 shadow-none">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 26 }}
          className="relative overflow-hidden rounded-3xl bg-white p-6 shadow-[0_24px_60px_-20px_rgba(10,74,82,0.2)]"
        >
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-[#f3f7f8] text-[#5a7a80] hover:bg-[#e8eef0]"
          >
            <X className="h-4 w-4" />
          </button>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#00a8b5]">Confirm registration</p>
          <DialogTitle className="mt-1 font-display text-2xl font-extrabold text-[#0a4a52]">
            Review details
          </DialogTitle>
          <DialogDescription className="mt-1 text-xs text-[#5a7a80]">
            Double-check before generating the QR pass.
          </DialogDescription>

          <div className="mt-5 space-y-2.5">
            <PosRow label="Date" value={activeDate ?? "—"} />
            <PosRow label="Customer" value={displayName} />
            <PosRow label="Mobile" value={mobile} />
            <PosRow label="Nationality" value={nationalityLabel} />
            <PosRow label="Age group" value={ageGroupLabel} />
            {email ? <PosRow label="Email" value={email} /> : null}
            <PosRow label="Slot" value={slotName ?? "—"} />
            <PosRow
              label="Guests"
              value={
                <span className="font-display text-xl font-extrabold tabular-nums text-[#0a4a52]">{guests}</span>
              }
            />
          </div>

          <div className="mt-6 flex gap-2.5">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#f3f7f8] text-sm font-semibold text-[#0a4a52] hover:bg-[#e8eef0]"
            >
              <Edit3 className="h-4 w-4" /> Edit
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={submitting}
              className="group relative inline-flex h-12 flex-[2] items-center justify-center gap-2 overflow-hidden rounded-2xl bg-[#00a8b5] text-sm font-bold text-white shadow-[0_12px_32px_-8px_rgba(0,168,181,0.5)] disabled:opacity-60"
            >
              <Sparkles className="h-4 w-4" />
              <span>{submitting ? "Generating…" : "Confirm & Generate QR"}</span>
              <span className="absolute inset-0 animate-shimmer opacity-50" />
            </button>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
