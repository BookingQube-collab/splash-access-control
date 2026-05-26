import Link from "next/link";
import { Facebook, Instagram, Youtube } from "lucide-react";
import { SummerLogo } from "@/components/public/summer-logo";

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const SOCIAL = [
  { href: "#", label: "Instagram", icon: Instagram },
  { href: "#", label: "Facebook", icon: Facebook },
  { href: "#", label: "X", icon: XIcon },
  { href: "#", label: "YouTube", icon: Youtube },
] as const;

export function PublicFooter() {
  return (
    <footer id="footer" className="relative z-10 border-t border-[#e8eef0] bg-white">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-6 px-4 py-10 sm:px-6 md:grid-cols-[1fr_auto_1fr]">
        <div className="flex flex-col items-center gap-1 md:items-start">
          <SummerLogo />
          <p className="max-w-xs text-center text-sm text-[#5a7a80] md:text-left">
            Official access for Beach Festival &apos;26 — book, scan, splash.
          </p>
        </div>
        <p className="text-center text-sm text-[#5a7a80]">
          © 2026 SummerSplash. All rights reserved.
        </p>
        <div className="flex items-center justify-center gap-3 md:justify-end">
          {SOCIAL.map(({ href, label, icon: Icon }) => (
            <Link
              key={label}
              href={href}
              aria-label={label}
              className="grid h-10 w-10 place-items-center rounded-full border border-[#e8eef0] bg-[#faf8f4] text-[#5a7a80] transition hover:border-brand-teal hover:text-brand-teal"
            >
              <Icon className="h-4 w-4" />
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
