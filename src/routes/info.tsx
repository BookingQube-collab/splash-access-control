import Link from "next/link";
import { ArrowRight, Calendar, HelpCircle, Shirt, Shield } from "lucide-react";
import { PublicStaticLayout } from "@/components/public/public-static-layout";

const DATES = {
  headline: "Summer 2026 festival season",
  range: "Select weekends & peak days — check registration for your exact visit date.",
  gates: "Gates open 30 minutes before your booked slot. Late entry may be refused if the slot is at capacity.",
};

const RULES = [
  "Arrive within your booked time slot; QR passes are scanned at entry.",
  "One pass per guest — transfers are not permitted once issued.",
  "Children under 12 must be accompanied by an adult at all times.",
  "No outside food or glass containers in the waterpark zones.",
  "Follow lifeguard and staff instructions — safety gear required on select attractions.",
] as const;

const BRING = [
  "Government-issued photo ID matching the booking name",
  "Swimwear, towel, and reef-safe sunscreen",
  "Water shoes recommended for the obstacle course",
  "Phone with brightness up for QR scan (or printed pass from My passes)",
  "Cashless payment card for lockers and concessions",
] as const;

const FAQ = [
  {
    q: "Can I change my slot after booking?",
    a: "Contact support before your visit date. Changes depend on availability and may incur a fee.",
  },
  {
    q: "What if it rains?",
    a: "Light rain operations continue. Severe weather updates will be emailed and posted on our social channels.",
  },
  {
    q: "Where do I find my pass?",
    a: "Open My passes after registration — your QR is ready instantly and stays valid for your slot window.",
  },
] as const;

export default function InfoPage() {
  return (
    <PublicStaticLayout
      title="Festival info"
      subtitle="Dates, house rules, what to bring, and quick answers before you hit the beach."
    >
      <div className="grid gap-8 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-teal/10 text-brand-teal">
              <Calendar className="h-5 w-5" />
            </span>
            <h2 className="font-display text-xl font-bold text-foreground">Dates & hours</h2>
          </div>
          <p className="mt-4 font-semibold text-foreground">{DATES.headline}</p>
          <p className="mt-2 text-sm text-muted-foreground">{DATES.range}</p>
          <p className="mt-4 text-sm text-muted-foreground">{DATES.gates}</p>
          <Link
            href="/register"
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand-teal hover:underline"
          >
            See available dates
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-coral/15 text-coral">
              <Shield className="h-5 w-5" />
            </span>
            <h2 className="font-display text-xl font-bold text-foreground">House rules</h2>
          </div>
          <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
            {RULES.map((rule) => (
              <li key={rule} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-teal" />
                {rule}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-card lg:col-span-2">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-teal/10 text-brand-teal">
              <Shirt className="h-5 w-5" />
            </span>
            <h2 className="font-display text-xl font-bold text-foreground">What to bring</h2>
          </div>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {BRING.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2 rounded-xl bg-muted/40 px-4 py-3 text-sm text-muted-foreground"
              >
                <span className="text-brand-teal">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-12">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-teal/10 text-brand-teal">
            <HelpCircle className="h-5 w-5" />
          </span>
          <h2 className="font-display text-2xl font-bold text-foreground">Quick FAQ</h2>
        </div>
        <dl className="mt-6 space-y-4">
          {FAQ.map(({ q, a }) => (
            <div
              key={q}
              className="rounded-2xl border border-border bg-card px-5 py-4 shadow-soft"
            >
              <dt className="font-semibold text-foreground">{q}</dt>
              <dd className="mt-1.5 text-sm text-muted-foreground">{a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="mt-10 text-center text-sm text-muted-foreground">
        Still have questions?{" "}
        <Link href="/contact" className="font-semibold text-brand-teal hover:underline">
          Contact our crew
        </Link>
      </p>
    </PublicStaticLayout>
  );
}
