import Link from "next/link";
import { Clock, Mail, MapPin, Phone, Facebook, Instagram, Youtube } from "lucide-react";
import { PublicStaticLayout } from "@/components/public/public-static-layout";

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const SOCIAL = [
  { href: "https://instagram.com", label: "Instagram", icon: Instagram },
  { href: "https://facebook.com", label: "Facebook", icon: Facebook },
  { href: "https://x.com", label: "X", icon: XIcon },
  { href: "https://youtube.com", label: "YouTube", icon: Youtube },
] as const;

export default function ContactPage() {
  return (
    <PublicStaticLayout
      title="Contact"
      subtitle="Guest services, booking changes, and group enquiries — reach the SummerSplash crew."
    >
        <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
          <div className="space-y-6">
            <article className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <div className="flex items-start gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-teal/10 text-brand-teal">
                  <Mail className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-display text-lg font-bold text-foreground">Email support</h2>
                  <a
                    href="mailto:support@summersplash.events"
                    className="mt-1 block text-brand-teal hover:underline"
                  >
                    support@summersplash.events
                  </a>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Booking confirmations, pass issues, and refund requests.
                  </p>
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <div className="flex items-start gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-coral/15 text-coral">
                  <Phone className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-display text-lg font-bold text-foreground">Phone</h2>
                  <a href="tel:+15551234567" className="mt-1 block font-medium text-foreground">
                    +1 (555) 123-4567
                  </a>
                  <p className="mt-2 text-sm text-muted-foreground">Festival weekends & event days.</p>
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <div className="flex items-start gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-teal/10 text-brand-teal">
                  <Clock className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-display text-lg font-bold text-foreground">Support hours</h2>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    <li>Mon–Fri: 9:00 am – 6:00 pm</li>
                    <li>Event days: 8:00 am – 9:00 pm</li>
                    <li>Email replies within 24 hours on weekdays</li>
                  </ul>
                </div>
              </div>
            </article>

            <div>
              <p className="text-sm font-semibold text-foreground">Follow the festival</p>
              <div className="mt-3 flex flex-wrap gap-3">
                {SOCIAL.map(({ href, label, icon: Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="grid h-11 w-11 place-items-center rounded-full border border-border bg-card text-muted-foreground transition hover:border-brand-teal hover:text-brand-teal"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <MapPin className="h-4 w-4 text-brand-teal" />
              SummerSplash Waterpark — coastal venue (map placeholder)
            </div>
            <div
              className="flex min-h-[280px] flex-1 items-center justify-center rounded-2xl border border-dashed border-border bg-gradient-to-br from-brand-teal/10 via-muted/30 to-coral/10 sm:min-h-[360px]"
              role="img"
              aria-label="Map placeholder"
            >
              <div className="text-center px-6">
                <span className="text-5xl" aria-hidden>
                  🗺️
                </span>
                <p className="mt-4 font-display text-lg font-semibold text-foreground">
                  Interactive map coming soon
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Full address shared in your booking confirmation email.
                </p>
              </div>
            </div>
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-full bg-coral-gradient px-6 py-3 text-sm font-semibold text-white shadow-glow-sunset transition hover:brightness-105"
            >
              Book your visit
            </Link>
          </div>
        </div>
    </PublicStaticLayout>
  );
}
