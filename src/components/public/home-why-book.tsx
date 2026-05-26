"use client";

import { motion } from "framer-motion";
import { BadgeCheck, Clock, QrCode, Users } from "lucide-react";

const REASONS = [
  {
    icon: BadgeCheck,
    title: "Official & verified",
    desc: "Every pass is encrypted and validated at entry — no fakes, no hassle.",
  },
  {
    icon: QrCode,
    title: "Instant digital passes",
    desc: "Your QR code is ready the moment you book. Walk in, scan, splash.",
  },
  {
    icon: Users,
    title: "Built for groups",
    desc: "Book for your whole crew in one go with flexible slot options.",
  },
  {
    icon: Clock,
    title: "Real-time availability",
    desc: "Live spot counts so you always know what's open before you commit.",
  },
] as const;

export function HomeWhyBook() {
  return (
    <section id="why-book" className="relative z-10 bg-brand-cream-deep/50 py-20">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.45 }}
          className="text-center"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-teal">Why SummerSplash</p>
          <h2 className="mt-2 font-display text-3xl font-bold text-foreground sm:text-4xl">
            Why book with SummerSplash?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            The official booking platform for Beach Festival &apos;26 — secure, seamless, and built for the best day
            ever.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {REASONS.map(({ icon: Icon, title, desc }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.08, duration: 0.45 }}
              className="rounded-[24px] border border-border bg-card p-6 shadow-card transition hover:border-brand-teal/30 hover:shadow-glow-aqua"
            >
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-teal/10 text-brand-teal ring-1 ring-brand-teal/20">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-display text-lg font-bold text-foreground">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
