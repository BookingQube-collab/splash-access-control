"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { BRAND_BACKGROUND } from "@/lib/public-assets";

const VARIANT_OVERLAY: Record<"ocean" | "sunset" | "aurora" | "light", string> = {
  ocean:
    "bg-gradient-to-b from-[#0a4a52]/48 via-[#00a8b5]/22 to-[#faf8f4]/32",
  sunset:
    "bg-gradient-to-b from-[#0a4a52]/42 via-[#ff7e67]/16 to-[#faf8f4]/28",
  aurora:
    "bg-gradient-to-b from-[#0a4a52]/44 via-[#00a8b5]/24 to-[#faf8f4]/30",
  light: "",
};

/** Lighter tint so the beach photo stays vivid (homepage hero). */
const LIGHT_PHOTO_OVERLAY: Record<"ocean" | "sunset" | "aurora" | "light", string> = {
  ocean:
    "bg-gradient-to-b from-[#0a4a52]/20 via-[#00a8b5]/8 to-transparent",
  sunset:
    "bg-gradient-to-b from-[#0a4a52]/16 via-[#ff7e67]/6 to-transparent",
  aurora:
    "bg-gradient-to-b from-[#0a4a52]/18 via-[#00a8b5]/10 to-transparent",
  light: "",
};

export function BeachBg({
  variant = "ocean",
  fixed = true,
  className,
  photo,
  overlay = "default",
}: {
  variant?: "ocean" | "sunset" | "aurora" | "light";
  fixed?: boolean;
  className?: string;
  /** Show beach/ocean photo layer (default: on for ocean/sunset/aurora). */
  photo?: boolean;
  /** `light` keeps the photo clear with a subtle teal tint (homepage). */
  overlay?: "default" | "light";
}) {
  const showPhoto = photo ?? variant !== "light";
  const lightPhoto = overlay === "light" && showPhoto;

  const orbs = lightPhoto
    ? ["bg-primary/10", "bg-aqua/8", "bg-sunset/6"]
    : variant === "light"
      ? ["bg-primary/14", "bg-aqua/12", "bg-sunset/10"]
      : variant === "sunset"
        ? ["bg-sunset/38", "bg-coral/32", "bg-aqua/26"]
        : variant === "aurora"
          ? ["bg-aqua/32", "bg-primary/28", "bg-sunset/22"]
          : ["bg-primary/32", "bg-aqua/28", "bg-sunset/22"];

  const photoOverlay = lightPhoto
    ? LIGHT_PHOTO_OVERLAY[variant]
    : VARIANT_OVERLAY[variant];

  return (
    <div
      className={cn(
        "pointer-events-none inset-0 overflow-hidden",
        fixed ? "fixed -z-10" : "absolute z-0",
        className,
      )}
    >
      <div className="relative h-full w-full">
      {showPhoto && (
        <>
          <Image
            src={BRAND_BACKGROUND}
            alt=""
            fill
            priority={variant === "ocean" || variant === "sunset"}
            sizes="100vw"
            className="object-cover object-[center_42%]"
          />
          <div className={cn("absolute inset-0", photoOverlay)} />
          {!lightPhoto && (
            <div
              className="absolute inset-0 opacity-40 mix-blend-soft-light"
              style={{
                background:
                  "radial-gradient(ellipse 90% 70% at 50% 20%, rgb(94 212 232 / 0.45), transparent 62%)",
              }}
              aria-hidden
            />
          )}
          {lightPhoto && (
            <div
              className="absolute inset-0 opacity-25"
              style={{
                background:
                  "radial-gradient(ellipse 80% 55% at 50% 15%, rgb(255 255 255 / 0.35), transparent 70%)",
              }}
              aria-hidden
            />
          )}
        </>
      )}

      {!showPhoto && (
        <div
          className="absolute inset-0 bg-gradient-to-b from-[#00a8b5]/10 via-[#5ed4de]/6 to-[#faf8f4]"
          aria-hidden
        />
      )}

      <motion.div
        aria-hidden
        className={`absolute -top-40 -left-32 h-[36rem] w-[36rem] rounded-full blur-3xl ${orbs[0]}`}
        animate={{ y: [0, 22, 0], x: [0, 14, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className={`absolute top-1/3 -right-40 h-[40rem] w-[40rem] rounded-full blur-3xl ${orbs[1]}`}
        animate={{ y: [0, -28, 0], x: [0, -14, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className={`absolute -bottom-40 left-1/4 h-[34rem] w-[34rem] rounded-full blur-3xl ${orbs[2]}`}
        animate={{ y: [0, -18, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />

      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
        aria-hidden
      />
      </div>
    </div>
  );
}

/** Static wave divider for section edges. */
export function WaveDivider({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 1440 120" className={`w-full ${className}`} preserveAspectRatio="none">
      <path
        d="M0,64L60,69.3C120,75,240,85,360,80C480,75,600,53,720,53.3C840,53,960,75,1080,80C1200,85,1320,75,1380,69.3L1440,64L1440,120L0,120Z"
        fill="currentColor"
        opacity="0.6"
      />
    </svg>
  );
}
