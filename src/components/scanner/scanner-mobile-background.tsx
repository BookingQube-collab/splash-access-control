"use client";

import Image from "next/image";
import { BRAND_BACKGROUND } from "@/lib/public-assets";
import { cn } from "@/lib/utils";

/** Blurred hero beach + edge vignettes (mobile scanner mockup). */
export function ScannerMobileBackground({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 z-0 overflow-hidden", className)} aria-hidden>
      <Image
        src={BRAND_BACKGROUND}
        alt=""
        fill
        priority
        sizes="100vw"
        className="scale-[1.08] object-cover object-[center_38%] blur-[7px]"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 72% 58% at 50% 42%, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.38) 48%, rgba(255,245,240,0.22) 100%)",
        }}
      />
      <div className="absolute inset-y-0 left-0 w-[28%] max-w-[120px] bg-gradient-to-r from-[#0a2540]/42 via-[#0a2540]/12 to-transparent" />
      <div className="absolute inset-y-0 right-0 w-[28%] max-w-[120px] bg-gradient-to-l from-[#0a2540]/42 via-[#0a2540]/12 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-[22%] bg-gradient-to-t from-[#0a2540]/18 to-transparent" />
    </div>
  );
}
