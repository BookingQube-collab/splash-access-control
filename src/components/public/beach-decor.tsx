import { cn } from "@/lib/utils";

/** Decorative beach scene (palms, tower, surfboard, ball, signpost) — login & customer shells only. */
export function BeachDecor({ className }: { className?: string }) {
  return (
    <div
      className={cn("pointer-events-none absolute inset-0 z-[1] overflow-hidden", className)}
      aria-hidden
    >
      <div className="absolute -left-6 -top-4 h-52 w-52 opacity-[0.88] sm:h-60 sm:w-60">
        <svg viewBox="0 0 200 200" className="h-full w-full drop-shadow-md">
          <path fill="#1b6b4a" d="M8 175 Q45 35 95 15 Q75 75 118 95 Q42 85 32 135 Q0 115 8 175Z" />
          <path fill="#2d8a5e" opacity="0.85" d="M0 150 Q38 55 78 42 Q58 95 100 115 Q28 105 18 145 Q-8 125 0 150Z" />
          <path fill="#40916c" opacity="0.7" d="M25 120 Q55 70 85 65 Q70 95 105 108 Q50 100 45 125 Q30 118 25 120Z" />
        </svg>
      </div>
      <div className="absolute -right-8 -top-2 h-48 w-48 opacity-[0.82] sm:h-56 sm:w-56">
        <svg viewBox="0 0 200 200" className="h-full w-full -scale-x-100 drop-shadow-md">
          <path fill="#1b6b4a" d="M8 175 Q45 35 95 15 Q75 75 118 95 Q42 85 32 135 Q0 115 8 175Z" />
          <path fill="#2d8a5e" opacity="0.85" d="M0 150 Q38 55 78 42 Q58 95 100 115 Q28 105 18 145 Q-8 125 0 150Z" />
        </svg>
      </div>
      <div className="absolute bottom-[18%] left-2 h-32 w-24 opacity-95 sm:left-6 sm:bottom-[20%] lg:bottom-[22%]">
        <svg viewBox="0 0 80 112" className="h-full w-full drop-shadow-lg">
          <rect x="34" y="48" width="12" height="52" fill="#a67c52" rx="1" />
          <path d="M18 48 H62 L58 28 H22 Z" fill="#e8b88a" stroke="#8b6914" strokeWidth="1" />
          <rect x="20" y="22" width="40" height="14" fill="#00a8b5" rx="2" />
          <path d="M14 100 H66" stroke="#6b4f1a" strokeWidth="3" />
        </svg>
      </div>
      <div className="absolute right-0 top-[28%] hidden h-64 w-44 opacity-90 md:block">
        <svg viewBox="0 0 160 220" className="h-full w-full drop-shadow-md">
          <ellipse cx="125" cy="35" rx="30" ry="14" fill="#2d6a4f" opacity="0.65" transform="rotate(-25 125 35)" />
          <ellipse cx="138" cy="68" rx="34" ry="15" fill="#40916c" opacity="0.55" transform="rotate(-12 138 68)" />
          <path d="M92 28 Q108 115 98 205 Q86 115 92 28Z" fill="#f4a261" stroke="#e76f51" strokeWidth="2" />
          <path d="M95 48 Q100 120 97 175" stroke="#fff" strokeWidth="2.5" opacity="0.45" fill="none" />
        </svg>
      </div>
      <div className="absolute bottom-[14%] left-[38%] h-16 w-16 opacity-95 sm:left-[42%] sm:h-20 sm:w-20">
        <svg viewBox="0 0 80 80" className="h-full w-full drop-shadow-lg">
          <circle cx="40" cy="40" r="36" fill="#fff" stroke="#e5e7eb" strokeWidth="1" />
          <path d="M40 4 A36 36 0 0 1 76 40 Z" fill="#00a8b5" />
          <path d="M76 40 A36 36 0 0 1 40 76 Z" fill="#ff7e67" />
          <path d="M40 76 A36 36 0 0 1 4 40 Z" fill="#fbbf24" />
          <path d="M4 40 A36 36 0 0 1 40 4 Z" fill="#3b82f6" />
          <circle cx="40" cy="40" r="36" fill="none" stroke="#0a4a52" strokeWidth="1.5" opacity="0.15" />
        </svg>
      </div>
      <div className="absolute bottom-[16%] right-4 opacity-95 sm:right-8 lg:bottom-[18%]">
        <svg viewBox="0 0 140 120" className="h-28 w-32 drop-shadow-lg sm:h-32 sm:w-36">
          <rect x="62" y="50" width="8" height="60" fill="#8b6914" rx="2" />
          <g transform="translate(8, 8)">
            <path d="M0 20 L50 8 L48 28 L4 36 Z" fill="#00a8b5" />
            <text x="12" y="22" fill="white" fontSize="9" fontWeight="bold" fontFamily="system-ui">
              FUN
            </text>
          </g>
          <g transform="translate(70, 0)">
            <path d="M0 12 L48 20 L46 38 L2 30 Z" fill="#ff7e67" />
            <text x="10" y="26" fill="white" fontSize="9" fontWeight="bold" fontFamily="system-ui">
              SUN
            </text>
          </g>
          <g transform="translate(20, 52)">
            <path d="M0 8 L52 16 L50 34 L2 26 Z" fill="#3b82f6" />
            <text x="8" y="24" fill="white" fontSize="8" fontWeight="bold" fontFamily="system-ui">
              SPLASH
            </text>
          </g>
        </svg>
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a4a52]/12 via-transparent to-[#faf8f4]/40" />
    </div>
  );
}
