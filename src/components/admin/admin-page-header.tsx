"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { AdminHeroBackground } from "@/components/admin/admin-hero-background";
import { ADMIN_HERO_SUBTITLE, ADMIN_HERO_TITLE } from "@/components/admin/admin-theme";
import { cn } from "@/lib/utils";

export function AdminPageHeader({
  icon: Icon,
  title,
  subtitle,
  helper,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  /** Optional helper line below subtitle (Guests tab mockup). */
  helper?: string;
  /** Optional top-right control (e.g. filter/settings circle button). */
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "relative isolate min-h-[168px] overflow-hidden rounded-[24px] border border-[#bae6fd]/60 shadow-[0_8px_32px_-8px_rgba(14,116,144,0.15)] sm:min-h-[188px]",
        className,
      )}
    >
      <AdminHeroBackground />

      {action ? (
        <div className="absolute right-6 top-6 z-[3] sm:right-10 sm:top-8">{action}</div>
      ) : null}

      <div className="relative z-[2] flex flex-col gap-2 px-6 py-8 sm:px-10 sm:py-10">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/95 shadow-sm ring-1 ring-[#0d9488]/15">
          <Icon className="h-5 w-5 text-[#0f766e]" strokeWidth={2.25} />
        </div>
        <h1
          className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl"
          style={{ color: ADMIN_HERO_TITLE }}
        >
          {title}
        </h1>
        <p className="max-w-xl text-sm sm:text-base" style={{ color: ADMIN_HERO_SUBTITLE }}>
          {subtitle}
        </p>
        {helper ? (
          <p className="max-w-2xl text-xs sm:text-sm" style={{ color: ADMIN_HERO_SUBTITLE }}>
            {helper}
          </p>
        ) : null}
      </div>
    </section>
  );
}
