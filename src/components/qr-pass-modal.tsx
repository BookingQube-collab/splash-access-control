import { Dialog, DialogContent } from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import { motion } from "framer-motion";
import { Sparkles, Printer, ExternalLink, X } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function QrPassModal({
  open,
  onOpenChange,
  token,
  customerName,
  slotName,
  guests,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  token: string | null;
  customerName?: string;
  slotName?: string;
  guests?: number;
}) {
  if (!token) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm border-0 bg-transparent p-0 shadow-none">
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 24 }}
          className="relative overflow-hidden rounded-3xl glass-strong p-6 shadow-soft"
        >
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-foreground/10 text-foreground/70 hover:bg-foreground/20"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-aqua/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-aqua">
            <Sparkles className="h-3 w-3" /> Pass ready
          </div>
          {customerName && (
            <div className="font-display text-xl font-bold leading-tight">{customerName}</div>
          )}
          {(slotName || guests) && (
            <div className="text-xs text-muted-foreground">
              {slotName} {guests ? `· ${guests} guest${guests > 1 ? "s" : ""}` : ""}
            </div>
          )}

          <div className="relative mt-5 grid place-items-center rounded-2xl bg-white p-5">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-aqua/10 via-transparent to-sunset/10" />
            <QRCodeSVG value={token} size={220} level="H" includeMargin={false} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-foreground/10 px-3 py-2.5 text-xs font-semibold hover:bg-foreground/15"
            >
              <Printer className="h-3.5 w-3.5" /> Print
            </button>
            <Link
              to="/pass/$token"
              params={{ token }}
              target="_blank"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-sunset px-3 py-2.5 text-xs font-semibold text-foreground shadow-glow-sunset"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Open full pass
            </Link>
          </div>

          <p className="mt-3 text-center text-[10px] uppercase tracking-wider text-muted-foreground">
            Token · {token.slice(0, 8)}…
          </p>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
