import { BarChart3, Headphones, ShieldCheck, Zap } from "lucide-react";

const TRUST_ITEMS = [
  {
    icon: ShieldCheck,
    tone: "teal" as const,
    title: "Secure & Reliable",
    body: "Your data is encrypted and transactions are secure.",
  },
  {
    icon: Zap,
    tone: "blue" as const,
    title: "Fast Check-in",
    body: "Quick scanning and auto guest lookup.",
  },
  {
    icon: BarChart3,
    tone: "green" as const,
    title: "Real-time Updates",
    body: "Live capacity and slot availability.",
  },
  {
    icon: Headphones,
    tone: "coral" as const,
    title: "Support",
    body: "Need help? Our support team is here for you.",
  },
];

const TONE_MAP: Record<string, string> = {
  teal: "bg-[#e6f7f8] text-[#00a8b5] ring-[#00a8b5]/20",
  blue: "bg-[#eef4ff] text-[#3b82f6] ring-[#3b82f6]/20",
  green: "bg-[#e8f8ef] text-[#2db87a] ring-[#2db87a]/20",
  coral: "bg-[#fff4e8] text-[#ff9f68] ring-[#ff9f68]/20",
};

export function PosTrustFooter() {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {TRUST_ITEMS.map(({ icon: Icon, tone, title, body }) => (
        <div
          key={title}
          className="flex items-start gap-2.5 rounded-2xl bg-white p-3 shadow-[0_8px_28px_-10px_rgba(10,74,82,0.12)]"
        >
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ring-1 ${TONE_MAP[tone]}`}>
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-xs font-extrabold leading-tight text-[#0a4a52]">{title}</h3>
            <p className="mt-0.5 text-[10px] leading-snug text-[#5a7a80]">{body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
