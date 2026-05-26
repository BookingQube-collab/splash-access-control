"use client";

import { useState } from "react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { publicRegister } from "@/lib/summersplash.functions";
import { MY_PASSES_QUERY_KEY } from "@/hooks/use-my-passes";
import { formatActionError, parseYmd, phoneDigits } from "@/lib/utils";
import { toast } from "sonner";
import {
  REGISTER_GUEST_MAX,
  RegisterDetailsDialog,
} from "@/components/public/register-details-dialog";
import type { RegisterSlot } from "@/components/public/register-booking-card";

export type PublicRegisterSuccess = {
  registrationId: string;
  qrToken: string;
  mobile: string;
  customerName: string;
  guestCount: number;
  slotName: string;
  slotStartsAt: string;
  slotEndsAt: string;
  bookingDate: string;
  eventName: string;
};

export function PublicRegisterDialog({
  open,
  onOpenChange,
  slot,
  slotIndex,
  activeDate,
  eventName = "Summer Splash",
  onSuccess,
  onRefetch,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slot: RegisterSlot | null | undefined;
  slotIndex: number;
  activeDate: string | undefined;
  eventName?: string;
  onSuccess: (result: PublicRegisterSuccess) => void;
  onRefetch?: () => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [guests, setGuests] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const dateLabel = activeDate
    ? format(parseYmd(activeDate), "EEEE · MMMM d, yyyy")
    : "";

  const close = () => onOpenChange(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slot?.id) {
      toast.error("Pick a slot first");
      return;
    }
    const trimmedName = name.trim();
    const trimmedMobile = mobile.trim();
    if (!trimmedName) {
      toast.error("Enter your name");
      return;
    }
    if (phoneDigits(trimmedMobile).length < 7) {
      toast.error("Enter a valid mobile number");
      return;
    }
    setSubmitting(true);
    try {
      const res = await publicRegister({
        slot_id: slot.id,
        customer_name: trimmedName,
        mobile: trimmedMobile,
        email: email.trim(),
        guest_count: guests,
        ...(activeDate ? { booking_date: activeDate } : {}),
      });
      void queryClient.invalidateQueries({ queryKey: [MY_PASSES_QUERY_KEY] });
      onSuccess({
        registrationId: res.id,
        qrToken: res.qr_token,
        mobile: trimmedMobile,
        customerName: trimmedName,
        guestCount: guests,
        slotName: slot.name,
        slotStartsAt: slot.starts_at,
        slotEndsAt: slot.ends_at,
        bookingDate: activeDate ?? "",
        eventName,
      });
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(formatActionError(err) || "Registration failed");
      onRefetch?.();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open && !!slot}
      onOpenChange={(v) => {
        if (!v) close();
      }}
    >
      <DialogContent
        hideClose
        overlayClassName="bg-[#0a4a52]/45 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out"
        className="w-[calc(100%-2rem)] max-w-[520px] border-0 bg-transparent p-0 shadow-none sm:rounded-[24px]"
      >
        <DialogTitle className="sr-only">
          {slot?.name ? `Register for ${slot.name}` : "Your details"}
        </DialogTitle>
        {slot && slotIndex >= 0 ? (
          <RegisterDetailsDialog
            slot={slot}
            slotIndex={slotIndex}
            dateLabel={dateLabel}
            name={name}
            onNameChange={setName}
            mobile={mobile}
            onMobileChange={setMobile}
            email={email}
            onEmailChange={setEmail}
            guests={guests}
            onGuestsChange={(n) =>
              setGuests(Math.max(1, Math.min(REGISTER_GUEST_MAX, n)))
            }
            submitting={submitting}
            onClose={close}
            onSubmit={onSubmit}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
