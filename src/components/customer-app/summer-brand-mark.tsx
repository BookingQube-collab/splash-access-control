"use client";

import { SummerSplashLogo } from "@/components/brand/summer-splash-logo";
import Link from "next/link";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/** Image wordmark for guest app header (my-passes). */
export function SummerBrandMark({
  className,
  href = "/",
  light: _light,
  size = "sm",
}: {
  className?: string;
  href?: string;
  light?: boolean;
  size?: "sm" | "md";
}) {
  return (
    <SummerSplashLogo
      href={href}
      size={size}
      className={cn("drop-shadow-sm", className)}
    />
  );
}

export function GuestBookButton({ className }: { className?: string }) {
  return (
    <Link
      href="/register"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border-2 border-[#00A8B5] bg-white px-4 py-2 text-xs font-bold text-[#00A8B5] shadow-sm",
        className,
      )}
    >
      <Plus className="h-3.5 w-3.5" strokeWidth={2.75} />
      Book
    </Link>
  );
}
