"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ScanLine, ShieldCheck, Monitor, Store, Sparkles, Sun, Waves, ArrowRight } from "lucide-react";
import { BeachBg } from "@/components/beach-bg";
import { format } from "date-fns";

export default function IndexPage() {
  const today = format(new Date(), "EEEE · MMMM d, yyyy");

  return (
    <div className="relative min-h-screen overflow-hidden">
      <BeachBg variant="aurora" />

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2.5"
        >
          <div className="relative grid h-10 w-10 place-items-center rounded-2xl bg-ocean shadow-glow-aqua">
            <Waves className="h-5 w-5 text-primary-foreground" />
            <span className="absolute -inset-1 -z-10 rounded-2xl bg-aqua/40 blur-md" />
          </div>
          <div>
            <div className="font-display text-lg font-bold tracking-tight">SummerSplash</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Beach Festival '26</div>
          </div>
        </motion.div>
        <Link
          href="/register"
          className="group inline-flex items-center gap-2 rounded-full glass px-5 py-2 text-sm font-semibold text-foreground hover-glow"
        >
          Register
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-6 pb-24 pt-10">
        <section className="relative">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="mx-auto max-w-4xl text-center"
          >
            <span className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-sunset" />
              {today}
            </span>
            <h1 className="mt-6 font-display text-5xl font-extrabold leading-[1.05] tracking-tight md:text-7xl">
              Dive into a <span className="text-gradient-sunset">summer</span>
              <br />
              you'll never forget.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
              Book a slot, splash through waterpark heaven, and walk in with a glowing digital pass.
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/register"
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-sunset px-8 py-3.5 font-semibold text-foreground shadow-glow-sunset"
              >
                <span className="relative z-10">Reserve your slot</span>
                <ArrowRight className="relative z-10 h-4 w-4 transition-transform group-hover:translate-x-1" />
                <span className="absolute inset-0 -z-0 animate-shimmer" />
              </Link>
              <a
                href="#portals"
                className="inline-flex items-center gap-2 rounded-full glass px-7 py-3.5 text-sm font-semibold text-foreground hover-glow"
              >
                Staff portals
              </a>
            </div>
          </motion.div>

          {/* Floating glowing pass mockup */}
          <motion.div
            initial={{ opacity: 0, y: 30, rotate: -2 }}
            animate={{ opacity: 1, y: 0, rotate: -3 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="mx-auto mt-16 hidden max-w-md md:block"
          >
            <div className="relative">
              <div className="absolute -inset-8 -z-10 rounded-[2.5rem] bg-pass opacity-50 blur-3xl" />
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="relative overflow-hidden rounded-[2rem] glass-strong p-6 shadow-soft"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">SummerSplash · VIP</div>
                    <div className="mt-1 font-display text-2xl font-bold">Sunset Splash</div>
                  </div>
                  <Sun className="h-8 w-8 text-sunset" />
                </div>
                <div className="mt-5 grid h-40 place-items-center rounded-2xl bg-foreground/5">
                  <div className="grid h-28 w-28 grid-cols-6 grid-rows-6 gap-0.5">
                    {Array.from({ length: 36 }).map((_, i) => (
                      <div key={i} className={`rounded-sm ${Math.random() > 0.45 ? "bg-foreground" : "bg-transparent"}`} />
                    ))}
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span>4:00 PM – 7:00 PM</span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-success animate-pulse" /> Active
                  </span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </section>

        <section id="portals" className="mt-28">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-aqua">Crew access</p>
            <h2 className="mt-2 font-display text-3xl font-bold">Staff portals</h2>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <PortalCard href="/login/admin" icon={<ShieldCheck className="h-6 w-6" />} title="Admin" desc="Full management" hue="from-aqua to-primary" />
            <PortalCard href="/login/dashboard" icon={<Monitor className="h-6 w-6" />} title="Live Dashboard" desc="Operations team" hue="from-primary to-sunset" />
            <PortalCard href="/login/pos" icon={<Store className="h-6 w-6" />} title="POS" desc="Counter staff" hue="from-sunset to-coral" />
            <PortalCard href="/login/scanner" icon={<ScanLine className="h-6 w-6" />} title="Scanner" desc="Entry / exit" hue="from-coral to-aqua" />
          </div>
        </section>
      </main>
    </div>
  );
}

function PortalCard({
  href, icon, title, desc, hue,
}: { href: string; icon: React.ReactNode; title: string; desc: string; hue: string }) {
  return (
    <Link href={href} className="group">
      <motion.div
        whileHover={{ y: -4 }}
        className="relative overflow-hidden rounded-2xl glass p-6 transition-shadow hover:shadow-glow-aqua"
      >
        <div className={`mb-4 inline-flex rounded-2xl bg-gradient-to-br ${hue} p-3 text-primary-foreground shadow-glow-aqua`}>
          {icon}
        </div>
        <div className="font-display text-lg font-semibold">{title}</div>
        <div className="text-sm text-muted-foreground">{desc}</div>
        <ArrowRight className="absolute right-5 top-5 h-4 w-4 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-foreground" />
      </motion.div>
    </Link>
  );
}
