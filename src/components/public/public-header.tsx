"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, User } from "lucide-react";
import {
  REGISTER_CONTENT_CLASS,
} from "@/components/public/register-beach-layout";
import { SummerLogo } from "@/components/public/summer-logo";
import { cn } from "@/lib/utils";

export const PUBLIC_NAV = [
  { href: "/", label: "Home" },
  { href: "/experiences", label: "Experiences" },
  { href: "/my-passes", label: "My passes" },
  { href: "/info", label: "Info" },
] as const;

const REGISTER_NAV = PUBLIC_NAV.filter((item) => item.href !== "/my-passes");

function NavLink({
  href,
  label,
  light,
}: {
  href: string;
  label: string;
  light?: boolean;
}) {
  const pathname = usePathname();
  const isHome = href === "/";
  const active = isHome
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative pb-1 text-sm font-medium transition",
        light
          ? active
            ? "text-white"
            : "text-white/90 hover:text-white"
          : active
            ? "text-brand-teal"
            : "text-foreground/80 hover:text-brand-teal",
      )}
    >
      {label}
      {active && (
        <span
          className={cn(
            "absolute inset-x-0 -bottom-0.5 h-0.5 rounded-full",
            light ? "bg-white" : "bg-brand-teal",
          )}
          aria-hidden
        />
      )}
    </Link>
  );
}

export function PublicHeader({
  className,
  light,
}: {
  className?: string;
  /** Transparent header over hero imagery */
  light?: boolean;
}) {
  return (
    <header className={cn("relative z-30", className)}>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
        <SummerLogo light={light} priority={light} />
        <nav className="hidden items-center gap-8 md:flex" aria-label="Main">
          {PUBLIC_NAV.map((item) => (
            <NavLink key={item.href} href={item.href} label={item.label} light={light} />
          ))}
        </nav>
        <Link
          href="/register"
          className="group inline-flex items-center gap-2 rounded-full bg-brand-teal px-5 py-2.5 text-sm font-semibold text-white shadow-glow-aqua transition hover:brightness-105"
        >
          Register
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </header>
  );
}

/** Header for /register — transparent on beach; logo | centered nav | Register pill. */
export function RegisterPublicHeader({ className }: { className?: string }) {
  return (
    <header className={cn("relative z-20", className)}>
      <div
        className={cn(
          REGISTER_CONTENT_CLASS,
          "grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-4 sm:py-5",
        )}
      >
        <SummerLogo light className="justify-self-start" />
        <nav
          className="hidden items-center justify-center gap-6 md:flex lg:gap-8"
          aria-label="Main"
        >
          {REGISTER_NAV.map((item) => (
            <NavLink key={item.href} href={item.href} label={item.label} light />
          ))}
        </nav>
        <a
          href="#booking-card"
          className="justify-self-end inline-flex items-center gap-2 rounded-full bg-brand-teal px-5 py-2.5 text-sm font-semibold text-white shadow-glow-aqua transition hover:brightness-105"
        >
          <User className="h-4 w-4" />
          Register
        </a>
      </div>
    </header>
  );
}
