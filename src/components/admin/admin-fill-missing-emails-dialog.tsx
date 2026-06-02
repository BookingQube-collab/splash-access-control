"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export function AdminFillMissingEmailsDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
}) {
  const [submitting, setSubmitting] = useState(false);

  const close = () => {
    if (submitting) return;
    onOpenChange(false);
  };

  const handleConfirm = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
        else onOpenChange(true);
      }}
    >
      <AlertDialogContent className="max-w-md rounded-[20px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 font-display text-xl text-[#134e4a]">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#dbeafe] text-[#1d4ed8]">
              <Mail className="h-4 w-4" />
            </span>
            Fill missing emails
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left text-sm leading-relaxed text-[#64748b]">
            This will set email to <span className="font-semibold">rajan@eeeqa.com</span> for
            registrations in the current filter scope where email is missing (null, empty, or
            whitespace). Existing emails will not be changed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel
            disabled={submitting}
            className="rounded-[12px] border-[#e2e8f0]"
            onClick={close}
          >
            Cancel
          </AlertDialogCancel>
          <button
            type="button"
            disabled={submitting}
            onClick={() => void handleConfirm()}
            className={cn(
              "inline-flex h-10 items-center justify-center rounded-[12px] px-5 text-sm font-semibold text-white shadow-sm transition disabled:opacity-50",
              "bg-[#0d9488] hover:bg-[#0f766e]",
            )}
          >
            {submitting ? "Updating…" : "Fill Missing Emails"}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function AdminFillMissingEmailsTrigger({
  onClick,
  label,
  disabled,
}: {
  onClick: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-9 items-center justify-center gap-1.5 rounded-[12px] border border-[#bae6fd] bg-[#f0f9ff] px-4 text-xs font-semibold text-[#0369a1] transition hover:bg-[#e0f2fe] disabled:cursor-not-allowed disabled:opacity-60",
      )}
    >
      <Mail className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
