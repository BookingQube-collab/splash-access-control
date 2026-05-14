import { createFileRoute, Link } from "@tanstack/react-router";
import { Waves, ScanLine, ShieldCheck, Monitor, Store } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SummerSplash — Make a splash this summer" },
      { name: "description", content: "Reserve your slot, grab your QR pass, and dive in." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-accent/30">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <Waves className="h-7 w-7 text-primary" />
          <span className="font-display text-xl font-bold tracking-tight">SummerSplash</span>
        </div>
        <Link to="/register" className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-md hover:opacity-90">
          Register now
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24 pt-12">
        <section className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">Summer Event 2026</p>
          <h1 className="mx-auto mt-4 max-w-3xl text-5xl font-bold tracking-tight md:text-6xl">
            Make a splash this summer.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
            Reserve your slot, get a digital QR pass on the spot, and walk straight in.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/register" className="rounded-full bg-primary px-7 py-3 font-semibold text-primary-foreground shadow-lg hover:opacity-90">
              Register for free
            </Link>
          </div>
        </section>

        <section className="mt-24">
          <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-muted-foreground">Staff portals</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <PortalCard to="/login/admin" icon={<ShieldCheck className="h-6 w-6" />} title="Admin" desc="Full management" />
            <PortalCard to="/login/dashboard" icon={<Monitor className="h-6 w-6" />} title="Live Dashboard" desc="Operations team" />
            <PortalCard to="/login/pos" icon={<Store className="h-6 w-6" />} title="POS" desc="Counter staff" />
            <PortalCard to="/login/scanner" icon={<ScanLine className="h-6 w-6" />} title="Scanner" desc="Entry / exit" />
          </div>
        </section>
      </main>
    </div>
  );
}

function PortalCard({ to, icon, title, desc }: { to: string; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Link to={to} className="group rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="mb-3 inline-flex rounded-xl bg-primary/10 p-3 text-primary">{icon}</div>
      <div className="font-display text-lg font-semibold">{title}</div>
      <div className="text-sm text-muted-foreground">{desc}</div>
    </Link>
  );
}
