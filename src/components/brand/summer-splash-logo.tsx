"use client";

import Image from "next/image";
import Link from "next/link";
import { BRAND_LOGO } from "@/lib/public-assets";
import { cn } from "@/lib/utils";

/** Logo aspect ratio (2945×695). */
const LOGO_ASPECT = 2945 / 695;

const SIZE_HEIGHT: Record<"xs" | "sm" | "md" | "lg" | "xl", number> = {
  xs: 28,
  sm: 36,
  md: 44,
  lg: 64,
  xl: 96,
};

export type SummerSplashLogoSize = keyof typeof SIZE_HEIGHT;

export function SummerSplashLogo({
  className,
  href,
  size = "md",
  priority = false,
  /** Subtle ring on light pages (login cards). */
  framed = false,
}: {
  className?: string;
  href?: string;
  size?: SummerSplashLogoSize;
  priority?: boolean;
  framed?: boolean;
}) {
  const height = SIZE_HEIGHT[size];
  const width = Math.round(height * LOGO_ASPECT);

  const image = (
    <Image
      src={BRAND_LOGO}
      alt="Summer Splash"
      width={width}
      height={height}
      quality={92}
      sizes={`${width}px`}
      priority={priority}
      className={cn(
        "object-contain object-left",
        framed && "rounded-xl ring-2 ring-white/70 shadow-[0_8px_32px_rgba(0,0,0,0.2)]",
      )}
      style={{ height, width }}
    />
  );

  const content = (
    <span
      className={cn(
        "inline-flex shrink-0 items-center",
        framed && "rounded-xl bg-black/90 p-1.5 sm:p-2",
        className,
      )}
    >
      {image}
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2 rounded-lg">
        {content}
      </Link>
    );
  }

  return content;
}

/** Compact mark for staff sidebars (square crop of horizontal logo). */
export function SummerSplashLogoMark({
  className,
  href,
  title = "Summer Splash",
}: {
  className?: string;
  href?: string;
  title?: string;
}) {
  const inner = (
    <span
      className={cn(
        "relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-black shadow-[0_4px_16px_rgba(0,0,0,0.25)]",
        className,
      )}
      title={title}
    >
      <Image
        src={BRAND_LOGO}
        alt=""
        width={88}
        height={88}
        className="absolute left-1/2 top-1/2 h-[220%] w-[220%] max-w-none -translate-x-1/2 -translate-y-1/2 object-cover object-center"
        aria-hidden
      />
    </span>
  );

  if (href) {
    return (
      <Link href={href} aria-label={title} className="inline-flex transition hover:scale-[1.02]">
        {inner}
      </Link>
    );
  }

  return inner;
}
