"use client";

import { useState } from "react";
import { Fingerprint } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  dismissPasskeyEnrollment,
  getPasskeysDashboardUrl,
  registerPasskey,
} from "@/lib/passkey-auth";
import { toast } from "sonner";

interface PasskeyEnrollDialogProps {
  open: boolean;
  userId: string;
  onComplete: () => void;
}

export function PasskeyEnrollDialog({ open, userId, onComplete }: PasskeyEnrollDialogProps) {
  const [loading, setLoading] = useState(false);

  const onRegister = async () => {
    setLoading(true);
    const result = await registerPasskey();
    setLoading(false);
    if (!result.ok) {
      toast.error(result.message, {
        duration: 10_000,
        action: {
          label: "Supabase Passkeys",
          onClick: () => window.open(getPasskeysDashboardUrl(), "_blank", "noopener"),
        },
      });
      return;
    }
    toast.success("Passkey registered — you can sign in with it next time");
    onComplete();
  };

  const onSkip = () => {
    dismissPasskeyEnrollment(userId);
    onComplete();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onSkip()}>
      <DialogContent className="glass-strong border-foreground/10 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-aqua/20 text-aqua">
              <Fingerprint className="h-5 w-5" />
            </span>
            Add a passkey?
          </DialogTitle>
          <DialogDescription>
            Sign in faster next time with Face ID, Touch ID, Windows Hello, or a security key.
            Your password still works as a fallback.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <button
            type="button"
            disabled={loading}
            onClick={onRegister}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-aqua font-semibold text-primary-foreground shadow-glow-aqua disabled:opacity-50"
          >
            <Fingerprint className="h-4 w-4" />
            {loading ? "Waiting for device…" : "Register passkey"}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onSkip}
            className="h-10 w-full rounded-xl text-sm text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
          >
            Not now
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
