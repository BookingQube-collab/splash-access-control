"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { ArrowRight, CalendarDays } from "lucide-react";
import { PublicHeader } from "@/components/public/public-header";

export function HomeHero() {
  const [today, setToday] = useState("");

  useEffect(() => {
    setToday(format(new Date(), "EEEE · MMMM d, yyyy"));
  }, []);

  return (
    <section className="relative z-10 min-h-[min(92vh,880px)] overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_90%_60%_at_50%_30%,rgba(10,74,82,0.12)_0%,transparent_68%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-20 bg-gradient-to-t from-white/25 via-white/8 to-transparent sm:h-24"
        aria-hidden
      />
      <PublicHeader light className="absolute inset-x-0 top-0 z-20 bg-transparent" />

      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-6 pb-32 pt-28 text-center sm:pt-32 lg:pb-40 lg:pt-36">
        <motion.span
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-black/25 px-4 py-1.5 text-xs font-semibold text-white shadow-[0_8px_32px_rgba(0,0,0,0.12)] backdrop-blur-md"
        >
          <CalendarDays className="h-3.5 w-3.5 text-[#ff9f68]" />
          {today || "Beach Festival · Summer 2026"}
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-6 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.35)] sm:text-5xl lg:text-[3.5rem]"
        >
          DIVE INTO A{" "}
          <span className="text-gradient-coral">SUMMER</span>
          <br />
          YOU&apos;LL NEVER FORGET
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.2 }}
          className="mt-5 max-w-xl text-base leading-relaxed text-white/90 sm:text-lg"
        >
          Sun, sand, and unforgettable moments at the premier beach festival of 2026. Book your
          slot, grab your digital pass, and dive in.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          <a
            href="#booking"
            className="group inline-flex items-center gap-2 rounded-full bg-coral-gradient px-8 py-3.5 text-sm font-semibold text-white shadow-glow-sunset transition hover:brightness-105"
          >
            Reserve your slot
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>
          <a
            href="#digital-pass"
            className="inline-flex items-center gap-2 rounded-full border-2 border-white/90 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
          >
            Learn more
          </a>
        </motion.div>
      </div>
    </section>
  );
}
