import { BeachBg } from "@/components/beach-bg";
import { PublicFooter } from "@/components/public/public-footer";
import { PublicHeader } from "@/components/public/public-header";

export function PublicStaticLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-background">
      <PublicHeader className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur-md" />
      <main>
        <section className="relative overflow-hidden border-b border-border py-14 sm:py-16">
          <BeachBg variant="aurora" fixed={false} className="absolute" />
          <div className="pointer-events-none absolute inset-0 z-[1] bg-brand-cream-deep/75" aria-hidden />
          <div className="relative z-10 mx-auto max-w-7xl px-6">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-teal">
              SummerSplash Beach Festival &apos;26
            </p>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
        </section>
        <div className="mx-auto max-w-7xl px-6 py-12 sm:py-16">{children}</div>
      </main>
      <PublicFooter />
    </div>
  );
}
