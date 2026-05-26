import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const POS_CARD_CLASS = "pos-card rounded-[20px] bg-white p-3 shadow-[0_12px_40px_-12px_rgba(10,74,82,0.14)] sm:p-4";

export const SLOT_PALETTE = [
  { iconBg: "bg-[#e6f7f8] text-[#00a8b5] ring-[#00a8b5]/25", bar: "from-[#00a8b5] to-[#5ed4de]" },
  { iconBg: "bg-[#eef4ff] text-[#3b82f6] ring-[#3b82f6]/25", bar: "from-[#3b82f6] to-[#00a8b5]" },
  { iconBg: "bg-[#f3eeff] text-[#8b5cf6] ring-[#8b5cf6]/25", bar: "from-[#8b5cf6] to-[#c084fc]" },
  { iconBg: "bg-[#fff4e8] text-[#ff9f68] ring-[#ff9f68]/25", bar: "from-[#ff9f68] to-[#ff7e67]" },
  { iconBg: "bg-[#e8f8ef] text-[#2db87a] ring-[#2db87a]/25", bar: "from-[#2db87a] to-[#00a8b5]" },
  { iconBg: "bg-[#ffecec] text-[#ff7e67] ring-[#ff7e67]/25", bar: "from-[#ff7e67] to-[#ff9f68]" },
] as const;

export type SlotRow = {
  id: string;
  name: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  remaining: number;
};

export function PosSection({
  step,
  title,
  icon,
  trailing,
  className,
  children,
}: {
  step?: number;
  title: string;
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn(POS_CARD_CLASS, className)}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          {step !== undefined ? (
            <span className="grid h-7 w-7 place-items-center rounded-full bg-[#00a8b5] font-display text-xs font-extrabold text-white shadow-[0_4px_10px_-4px_rgba(0,168,181,0.5)]">
              {step}
            </span>
          ) : icon ? (
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-[#00a8b5]/12 text-[#00a8b5]">{icon}</div>
          ) : null}
          <h2 className="font-display text-base font-bold text-[#0a4a52]">{title}</h2>
        </div>
        {trailing}
      </div>
      {children}
    </section>
  );
}

export function PosField({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#5a7a80]">
        {icon}
        {label}
      </Label>
      <div className="relative">{children}</div>
    </div>
  );
}

export function PosEmpty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#dce8ea] bg-[#f7fafb] p-4 text-sm text-[#5a7a80]">
      {children}
    </div>
  );
}

export function PosFullBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#ff7e67]/30 bg-[#fff4f0] p-4 text-sm font-semibold text-[#e5484d]">
      {children}
    </div>
  );
}

export function PosRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#e8eef0] pb-2.5 last:border-0 last:pb-0">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5a7a80]">{label}</span>
      <span className="truncate text-right text-sm font-semibold text-[#0a4a52]">{value}</span>
    </div>
  );
}
