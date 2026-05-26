"use client";

import Link from "next/link";
import { Smartphone } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { usePwaInstallPrompt } from "@/hooks/use-pwa-install-prompt";

export function PwaInstallDialog({
  open,
  onOpenChange,
  myPassesHref,
  myPassesLabel = "Open My Passes",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  myPassesHref: string;
  myPassesLabel?: string;
}) {
  const { canPromptInstall, promptInstall } = usePwaInstallPrompt();

  const handleInstall = async () => {
    if (canPromptInstall) await promptInstall();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-[20px] border-[#e8eef0] bg-white p-6 shadow-[0_24px_64px_rgba(10,74,82,0.18)]">
        <DialogTitle className="font-display text-lg font-bold text-[#0a4a52]">
          Add SummerSplash to your phone
        </DialogTitle>
        <p className="mt-2 text-sm leading-relaxed text-[#5a7a80]">
          Install the guest app from your browser for quick QR access and live slot updates.
        </p>

        {canPromptInstall ? (
          <button
            type="button"
            onClick={() => void handleInstall()}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-teal via-[#00929c] to-brand-teal-dark px-5 py-3 text-sm font-bold text-white shadow-glow-aqua transition hover:brightness-105"
          >
            <Smartphone className="h-4 w-4 shrink-0" aria-hidden />
            Install app
          </button>
        ) : null}

        <div className="mt-4 space-y-3 rounded-xl bg-[#faf8f4] p-4 text-sm text-[#0a4a52]">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#5a7a80]">iPhone (Safari)</p>
          <ol className="list-decimal space-y-1 pl-4 text-[13px] leading-relaxed text-[#5a7a80]">
            <li>Open My Passes in Safari</li>
            <li>Tap Share, then <strong className="text-[#0a4a52]">Add to Home Screen</strong></li>
          </ol>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#5a7a80]">Android (Chrome)</p>
          <ol className="list-decimal space-y-1 pl-4 text-[13px] leading-relaxed text-[#5a7a80]">
            <li>Open My Passes in Chrome</li>
            <li>Tap menu → <strong className="text-[#0a4a52]">Install app</strong> or Add to Home screen</li>
          </ol>
        </div>

        <Link
          href={myPassesHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex w-full items-center justify-center rounded-full border-2 border-brand-teal bg-white px-5 py-3 text-sm font-bold text-brand-teal transition hover:bg-[#eef6f7]"
        >
          {myPassesLabel}
        </Link>
      </DialogContent>
    </Dialog>
  );
}
