"use client";

import { motion } from "framer-motion";
import { Smartphone } from "lucide-react";

function StoreBadge({ store }: { store: "apple" | "google" }) {
  const label = store === "apple" ? "App Store" : "Google Play";
  return (
    <a
      href="#"
      aria-label={`Download on ${label}`}
      className="inline-flex items-center gap-2.5 rounded-xl border border-white/20 bg-black/80 px-4 py-2.5 text-white transition hover:bg-black/90"
    >
      {store === "apple" ? (
        <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" aria-hidden>
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" aria-hidden>
          <path d="M3.609 1.814L13.792 12 3.61 22.186a1.003 1.003 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 0 1 0 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.802 8.99l-2.303 2.303-8.635-8.635z" />
        </svg>
      )}
      <span className="text-left leading-tight">
        <span className="block text-[9px] uppercase tracking-wide opacity-80">Download on the</span>
        <span className="block text-sm font-semibold">{label}</span>
      </span>
    </a>
  );
}

export function HomeAppBanner() {
  return (
    <section className="relative z-10 mx-auto max-w-7xl px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
        className="overflow-hidden rounded-[28px] bg-gradient-to-br from-brand-teal via-[#00929c] to-brand-teal-dark p-8 shadow-soft sm:p-10 lg:flex lg:items-center lg:gap-12 lg:p-12"
      >
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="flex-1 text-white"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/70">Mobile app</p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Your pass, always in your pocket
          </h2>
          <p className="mt-3 max-w-md text-base leading-relaxed text-white/85">
            Download the SummerSplash app for instant QR access, live slot updates, and group pass management — no
            printing required.
          </p>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.25, duration: 0.45 }}
            className="mt-8 flex flex-wrap gap-3"
          >
            <StoreBadge store="apple" />
            <StoreBadge store="google" />
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.55 }}
          className="relative mx-auto mt-10 shrink-0 lg:mt-0"
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="relative mx-auto w-[220px] rounded-[2rem] border-[6px] border-white/20 bg-[#0a4a52] p-3 shadow-[0_32px_64px_rgba(0,0,0,0.35)] sm:w-[240px]"
          >
            <motion.div
              className="absolute left-1/2 top-3 h-5 w-20 -translate-x-1/2 rounded-full bg-black/40"
              aria-hidden
            />
            <div className="mt-6 overflow-hidden rounded-[1.25rem] bg-gradient-to-b from-brand-teal/30 to-brand-cream/10 p-4">
              <motion.div
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="rounded-2xl bg-white/95 p-4 shadow-soft"
              >
                <motion.div
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                  className="mx-auto grid h-24 w-24 place-items-center rounded-xl bg-brand-teal/10"
                >
                  <Smartphone className="h-10 w-10 text-brand-teal" />
                </motion.div>
                <p className="mt-3 text-center font-display text-sm font-bold text-[#0a4a52]">SummerSplash Pass</p>
                <p className="mt-1 text-center text-[10px] text-[#5a7a80]">Scan at entry · Live updates</p>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}
