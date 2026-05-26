"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { PassReadyModal } from "@/components/pass-ready-modal";
import type { PublicRegisterSuccess } from "@/components/public/public-register-dialog";

/** After public registration: toast + QR modal (no /my-passes redirect). */
export function usePublicPassReady() {
  const [success, setSuccess] = useState<PublicRegisterSuccess | null>(null);

  const onRegisterSuccess = useCallback((result: PublicRegisterSuccess) => {
    toast.success("Pass ready");
    setSuccess(result);
  }, []);

  const clearPassReady = useCallback(() => setSuccess(null), []);

  const passReadyModal = (
    <PassReadyModal
      open={!!success}
      onOpenChange={(open) => !open && setSuccess(null)}
      token={success?.qrToken ?? null}
      mobile={success?.mobile}
      customerName={success?.customerName}
      slotLabel={success?.slotName}
      guestCount={success?.guestCount}
    />
  );

  return { onRegisterSuccess, clearPassReady, PassReadyModal: passReadyModal };
}
