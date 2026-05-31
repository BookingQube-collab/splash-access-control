"use client";

import dynamic from "next/dynamic";
import { BeachBg } from "@/components/beach-bg";
import { HomeHero } from "@/components/public/home-hero";
import { PublicFooter } from "@/components/public/public-footer";

function HomeSectionSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={`mx-auto max-w-4xl animate-pulse rounded-3xl bg-white/50 px-6 py-16 ${className ?? ""}`}
      aria-hidden
    />
  );
}

const HomeFeatureStrip = dynamic(
  () => import("@/components/public/home-feature-strip").then((m) => ({ default: m.HomeFeatureStrip })),
  { loading: () => <HomeSectionSkeleton className="my-8 min-h-[120px]" /> },
);

const HomeBookingSection = dynamic(
  () => import("@/components/public/home-booking-section").then((m) => ({ default: m.HomeBookingSection })),
  { loading: () => <HomeSectionSkeleton className="my-8 min-h-[280px]" /> },
);

const HomeDigitalPassSteps = dynamic(
  () =>
    import("@/components/public/home-digital-pass-steps").then((m) => ({
      default: m.HomeDigitalPassSteps,
    })),
  { loading: () => <HomeSectionSkeleton className="my-8 min-h-[200px]" /> },
);

export default function IndexPage() {
  return (
    <div className="beach-shell-page relative isolate min-h-screen overflow-x-hidden bg-transparent font-[family-name:var(--font-body)]">
      <BeachBg variant="ocean" photo overlay="light" />
      <HomeHero />
      <HomeFeatureStrip />
      <HomeBookingSection />
      <HomeDigitalPassSteps />
      <PublicFooter />
    </div>
  );
}
