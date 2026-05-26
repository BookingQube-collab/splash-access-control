"use client";

import { BeachBg } from "@/components/beach-bg";

/** Admin overview hero — soft animated beach wash behind text. */
export function AdminHeroBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      <BeachBg variant="light" fixed={false} className="absolute" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#f8fafc] from-0% via-[#f8fafc]/90 via-[42%] to-transparent to-[62%]" />
    </div>
  );
}
