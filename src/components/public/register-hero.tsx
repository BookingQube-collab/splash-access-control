"use client";

import { format } from "date-fns";
import { Shield, Zap, Users } from "lucide-react";
import {
  REGISTER_CARD_CLASS,
  REGISTER_CONTENT_CLASS,
} from "@/components/public/register-beach-layout";
import { cn, parseYmd } from "@/lib/utils";

const MINI_FEATURES = [
  {
    icon: Shield,
    title: "Secure Booking",
    desc: "Encrypted passes & verified entry",
    iconClass: "bg-[#00a8b5] text-white",
  },
  {
    icon: Zap,
    title: "Instant Access",
    desc: "QR ready the moment you book",
    iconClass: "bg-[#ff7e67] text-white",
  },
  {
    icon: Users,
    title: "Group Friendly",
    desc: "Bring your crew in one booking",
    iconClass: "bg-[#f59e0b] text-white",
  },
] as const;

export function RegisterHero({
  activeDate,
  className,
}: {
  activeDate?: string;
  className?: string;
}) {
  const dateLine = activeDate
    ? format(parseYmd(activeDate), "EEEE · MMMM d, yyyy").toUpperCase()
    : "SELECT YOUR DATE";

  return (
    <section className={cn(REGISTER_CONTENT_CLASS, "pt-2 sm:pt-4", className)}>
      <div className={cn(REGISTER_CARD_CLASS, "p-6 sm:p-8 lg:p-10")}>
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#00a8b5]">
              {dateLine}
            </p>
            <h1 className="mt-3 font-display text-[1.75rem] font-extrabold leading-[1.1] tracking-tight text-[#0a4a52] sm:text-4xl lg:text-[2.5rem]">
              Dive into a{" "}
              <span className="font-script text-gradient-summer">summer</span>
              <br />
              you&apos;ll never forget
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-[#5a7a80] sm:text-lg">
              Book a slot, splash through the waterpark, and walk in with a glowing digital pass.
            </p>
          </div>

          <ul className="flex flex-col gap-5">
            {MINI_FEATURES.map(({ icon: Icon, title, desc, iconClass }) => (
              <li key={title} className="flex items-center gap-4">
                <span
                  className={cn(
                    "grid h-12 w-12 shrink-0 place-items-center rounded-full shadow-sm",
                    iconClass,
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={2.25} />
                </span>
                <div>
                  <div className="font-display text-sm font-bold text-[#0a4a52] sm:text-base">
                    {title}
                  </div>
                  <p className="mt-0.5 text-xs text-[#5a7a80] sm:text-sm">{desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
