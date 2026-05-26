"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Crown,
  Loader2,
  Sparkles,
  Sun,
  Waves,
  Zap,
} from "lucide-react";
import { PublicStaticLayout } from "@/components/public/public-static-layout";
import { formatSlotTimeRange } from "@/lib/slot-time";
import { getPublicEvent } from "@/lib/summersplash.functions";
import { cn } from "@/lib/utils";

const ATTRACTIONS = [
  {
    icon: Waves,
    title: "Wave pools & slides",
    desc: "Family-friendly flumes, splash zones, and the main wave pool — included with every timed entry slot.",
    emoji: "🌊",
  },
  {
    icon: Sun,
    title: "Sunset deck & lounge",
    desc: "Chill zones with shaded seating, mocktail bar, and golden-hour views over the waterpark.",
    emoji: "🌅",
  },
  {
    icon: Crown,
    title: "VIP Sunset Splash",
    desc: "Premium evening slot with faster entry, reserved lounge access, and limited capacity.",
    emoji: "👑",
  },
  {
    icon: Zap,
    title: "Aqua obstacle course",
    desc: "Team challenges on floating runs — arrive early within your slot to secure a lane.",
    emoji: "⚡",
  },
] as const;

export default function ExperiencesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["experiences-event"],
    queryFn: () => getPublicEvent(),
    staleTime: 30_000,
  });

  const slots = data?.slots ?? [];
  const eventName = data?.event?.name;
  const bookingDate = data?.bookingDate;

  return (
    <PublicStaticLayout
      title="Experiences"
      subtitle="Waterpark attractions, timed entry slots, and VIP moments — pick your wave and register in minutes."
    >
      <div className="grid gap-6 sm:grid-cols-2">
        {ATTRACTIONS.map(({ icon: Icon, title, desc, emoji }) => (
          <article
            key={title}
            className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-card"
          >
            <span className="absolute right-4 top-4 text-2xl opacity-50" aria-hidden>
              {emoji}
            </span>
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-teal/10 text-brand-teal ring-1 ring-brand-teal/20">
              <Icon className="h-5 w-5" />
            </span>
            <h2 className="mt-4 font-display text-xl font-bold text-foreground">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
          </article>
        ))}
      </div>

      <section className="mt-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-teal">
              Today&apos;s slots
            </p>
            <h2 className="mt-2 font-display text-2xl font-bold text-foreground sm:text-3xl">
              {eventName ? `${eventName} — availability` : "Slot overview"}
            </h2>
          </div>
          <Link
            href="/register"
            className="group inline-flex items-center gap-2 rounded-full bg-coral-gradient px-6 py-2.5 text-sm font-semibold text-white shadow-glow-sunset transition hover:brightness-105"
          >
            Register now
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="mt-8 flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-brand-teal" />
            Loading slots…
          </div>
        ) : slots.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center text-muted-foreground">
            Slots will appear here when the event is live. Head to registration to check dates.
          </p>
        ) : (
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {slots.map((slot) => {
              const open = slot.remaining > 0;
              const vip = /vip|sunset/i.test(slot.name);
              return (
                <li
                  key={slot.id}
                  className={cn(
                    "rounded-2xl border border-border bg-card p-5 shadow-soft",
                    vip && "ring-1 ring-coral/30",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      {vip && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-coral-gradient px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                          <Sparkles className="h-3 w-3" /> VIP
                        </span>
                      )}
                      <h3 className="mt-1 font-display text-lg font-semibold text-foreground">
                        {slot.name}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatSlotTimeRange(slot.starts_at, slot.ends_at)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
                        open
                          ? "bg-success/15 text-success"
                          : "bg-coral/15 text-coral",
                      )}
                    >
                      {open ? `${slot.remaining} left` : "Full"}
                    </span>
                  </div>
                  {open && (
                    <Link
                      href={`/register?slot=${slot.id}${bookingDate ? `&date=${bookingDate}` : ""}`}
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-brand-teal py-2.5 text-sm font-semibold text-brand-teal transition hover:bg-brand-teal/10"
                    >
                      Book this slot
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="mt-14 rounded-3xl border border-border bg-gradient-to-br from-brand-teal/10 via-card to-coral/10 p-8 text-center sm:p-10">
        <h2 className="font-display text-2xl font-bold text-foreground">Ready to make a splash?</h2>
        <p className="mx-auto mt-2 max-w-md text-muted-foreground">
          Choose a slot, add your guests, and get a digital pass with QR entry before you arrive.
        </p>
        <Link
          href="/register"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-teal px-8 py-3.5 font-semibold text-white shadow-glow-aqua transition hover:brightness-105"
        >
          Start registration
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </PublicStaticLayout>
  );
}
