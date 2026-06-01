"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ADMIN_TEAL } from "@/components/admin/admin-theme";
import { cn } from "@/lib/utils";

const CONFIRM_PHRASE = "DELETE ALL";

export function AdminDeleteAllRegistrationsDialog({
  open,
  onOpenChange,
  scope,
  matchCount,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scope: "all" | "filtered";
  matchCount: number;
  onConfirm: () => Promise<void>;
}) {
  const [phrase, setPhrase] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = phrase.trim() === CONFIRM_PHRASE && !submitting;

  const close = () => {
    if (submitting) return;
    setPhrase("");
    onOpenChange(false);
  };

  const handleConfirm = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onConfirm();
      setPhrase("");
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  const scopeLabel =
    scope === "all"
      ? "every registration in the database"
      : `${matchCount.toLocaleString()} registration(s) matching your current filters`;

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
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#fee2e2] text-[#dc2626]">
              <Trash2 className="h-4 w-4" />
            </span>
            Delete registrations
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left text-sm leading-relaxed text-[#64748b]">
            This will permanently delete {scopeLabel}. Linked scan history will be kept but
            unlinked from guests. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-1">
          <Label className="mb-1.5 block text-xs font-semibold text-[#64748b]">
            Type <span className="font-mono text-[#dc2626]">{CONFIRM_PHRASE}</span> to confirm
          </Label>
          <Input
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            placeholder={CONFIRM_PHRASE}
            autoComplete="off"
            disabled={submitting}
            className="h-11 rounded-[14px] border-[#e2e8f0] font-mono text-sm"
          />
        </div>

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
            disabled={!canSubmit}
            onClick={() => void handleConfirm()}
            className={cn(
              "inline-flex h-10 items-center justify-center rounded-[12px] px-5 text-sm font-semibold text-white shadow-sm transition disabled:opacity-50",
              "bg-[#dc2626] hover:bg-[#b91c1c]",
            )}
          >
            {submitting ? "Deleting…" : "Delete permanently"}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function AdminDeleteAllRegistrationsTrigger({
  onClick,
  label,
  variant = "all",
}: {
  onClick: () => void;
  label: string;
  variant?: "all" | "filtered";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center justify-center gap-1.5 rounded-[12px] border px-4 text-xs font-semibold transition",
        variant === "all"
          ? "border-[#fecaca] bg-[#fef2f2] text-[#dc2626] hover:bg-[#fee2e2]"
          : "border-[#fed7aa] bg-[#fff7ed] text-[#c2410c] hover:bg-[#ffedd5]",
      )}
    >
      <Trash2 className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
