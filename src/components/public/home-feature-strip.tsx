"use client";

import { motion } from "framer-motion";
import { Headphones, Shield, Users, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    icon: Shield,
    title: "Secure Booking",
    desc: "Encrypted passes & verified entry",
    iconBg: "bg-[#e6f7f8] text-[#0097A7]",
  },
  {
    icon: Zap,
    title: "Instant Access",
    desc: "QR ready the moment you book",
    iconBg: "bg-[#fff0e8] text-[#ff7e67]",
  },
  {
    icon: Users,
    title: "Group Friendly",
    desc: "Bring your crew in one booking",
    iconBg: "bg-[#f3e8ff] text-[#8b5cf6]",
  },
  {
    icon: Headphones,
    title: "24/7 Support",
    desc: "Real humans when you need help",
    iconBg: "bg-[#e8f5e9] text-[#2db87a]",
  },
] as const;

export function HomeFeatureStrip() {
  return (
    <section
      className="relative z-20 -mt-16 mx-auto max-w-6xl px-4 sm:-mt-20 sm:px-6"
      aria-label="Festival highlights"
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.5 }}
        className="rounded-[28px] border border-white/75 bg-white/80 px-4 py-8 shadow-[0_24px_60px_-20px_rgba(10,74,82,0.16)] backdrop-blur-md sm:px-6 sm:py-10"
      >
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
          {FEATURES.map(({ icon: Icon, title, desc, iconBg }, i) => (
            <div
              key={title}
              className={cn(
                "flex items-start gap-4 px-2 sm:px-4",
                i > 0 && "lg:border-l lg:border-[#e8eef0]",
              )}
            >
              <span
                className={cn(
                  "grid h-14 w-14 shrink-0 place-items-center rounded-full",
                  iconBg,
                )}
              >
                <Icon className="h-6 w-6" strokeWidth={2} />
              </span>
              <div className="min-w-0 pt-0.5">
                <div className="font-display text-base font-bold text-[#0a4a52]">{title}</div>
                <p className="mt-1 text-sm leading-snug text-[#5a7a80]">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
