"use client";

import { motion } from "framer-motion";
import {
  CalendarCheck,
  PartyPopper,
  QrCode,
  Smartphone,
  Ticket,
} from "lucide-react";

const STEPS = [
  {
    step: 1,
    title: "Pick date & slot",
    desc: "Choose your visit day and entry window from live availability.",
    icon: CalendarCheck,
    tint: "bg-[#e6f7f8] text-brand-teal",
  },
  {
    step: 2,
    title: "Book in minutes",
    desc: "Confirm your details — no printing, no paper tickets.",
    icon: Ticket,
    tint: "bg-[#fff0e8] text-[#ff7e67]",
  },
  {
    step: 3,
    title: "Get your QR pass",
    desc: "Your encrypted digital pass lands in My passes instantly.",
    icon: QrCode,
    tint: "bg-[#f3e8ff] text-[#8b5cf6]",
  },
  {
    step: 4,
    title: "Scan at the gate",
    desc: "Bright screen or wallet — staff verify in seconds.",
    icon: Smartphone,
    tint: "bg-[#e8f5e9] text-[#2db87a]",
  },
  {
    step: 5,
    title: "Enjoy the festival",
    desc: "Dive into waves, music, and beach vibes all day.",
    icon: PartyPopper,
    tint: "bg-[#fff8e6] text-[#f59e0b]",
  },
] as const;

export function HomeDigitalPassSteps() {
  return (
    <section
      id="digital-pass"
      className="relative z-10 py-20 sm:py-24"
      aria-labelledby="digital-pass-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.45 }}
          className="text-center"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-teal">
            How it works
          </p>
          <h2
            id="digital-pass-heading"
            className="mt-2 font-display text-3xl font-bold text-[#0a4a52] sm:text-4xl"
          >
            How your digital pass works
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[#5a7a80]">
            From booking to beach — five simple steps to your SummerSplash entry.
          </p>
        </motion.div>

        <div className="relative mt-14 hidden lg:block">
          <div
            className="absolute left-[10%] right-[10%] top-[2.75rem] border-t-2 border-dashed border-[#dce8ea]"
            aria-hidden
          />
          <ol className="relative grid grid-cols-5 gap-4">
            {STEPS.map(({ step, title, desc, icon: Icon, tint }, i) => (
              <motion.li
                key={step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: i * 0.08, duration: 0.45 }}
                className="flex flex-col items-center text-center"
              >
                <span className="relative z-10 mb-4 grid h-14 w-14 place-items-center rounded-full bg-white shadow-[0_8px_24px_rgba(10,74,82,0.1)] ring-4 ring-[#faf8f4]">
                  <span className="absolute -top-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-brand-teal text-[11px] font-bold text-white">
                    {step}
                  </span>
                  <span className={cnIcon(tint)}>
                    <Icon className="h-6 w-6" strokeWidth={2} />
                  </span>
                </span>
                <h3 className="font-display text-base font-bold text-[#0a4a52]">{title}</h3>
                <p className="mt-2 max-w-[11rem] text-xs leading-relaxed text-[#5a7a80]">{desc}</p>
              </motion.li>
            ))}
          </ol>
        </div>

        {/* Stacked on smaller screens */}
        <ol className="relative mt-10 space-y-0 lg:hidden">
          {STEPS.map(({ step, title, desc, icon: Icon, tint }, i) => (
            <motion.li
              key={step}
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-20px" }}
              transition={{ delay: i * 0.06, duration: 0.4 }}
              className="relative flex gap-4 pb-10 last:pb-0"
            >
              {i < STEPS.length - 1 && (
                <span
                  className="absolute left-[1.65rem] top-14 bottom-0 w-px border-l-2 border-dashed border-[#dce8ea]"
                  aria-hidden
                />
              )}
              <span className="relative z-10 flex shrink-0 flex-col items-center">
                <span className="grid h-14 w-14 place-items-center rounded-full bg-white shadow-[0_8px_24px_rgba(10,74,82,0.1)]">
                  <span className="absolute -top-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-brand-teal text-[11px] font-bold text-white">
                    {step}
                  </span>
                  <span className={cnIcon(tint)}>
                    <Icon className="h-6 w-6" strokeWidth={2} />
                  </span>
                </span>
              </span>
              <div className="pt-2">
                <h3 className="font-display text-base font-bold text-[#0a4a52]">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-[#5a7a80]">{desc}</p>
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function cnIcon(tint: string) {
  return `grid h-10 w-10 place-items-center rounded-full ${tint}`;
}
