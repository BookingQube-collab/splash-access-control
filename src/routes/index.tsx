"use client";

import { BeachBg } from "@/components/beach-bg";
import { HomeBookingSection } from "@/components/public/home-booking-section";
import { HomeDigitalPassSteps } from "@/components/public/home-digital-pass-steps";
import { HomeFeatureStrip } from "@/components/public/home-feature-strip";
import { HomeHero } from "@/components/public/home-hero";
import { PublicFooter } from "@/components/public/public-footer";

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
