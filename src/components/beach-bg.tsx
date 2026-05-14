import { motion } from "framer-motion";

export function BeachBg({ variant = "ocean" }: { variant?: "ocean" | "sunset" | "aurora" }) {
  const orbs =
    variant === "sunset"
      ? ["bg-sunset/40", "bg-coral/30", "bg-aqua/20"]
      : variant === "aurora"
      ? ["bg-aqua/30", "bg-primary/30", "bg-sunset/20"]
      : ["bg-primary/30", "bg-aqua/30", "bg-sunset/20"];
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <motion.div
        aria-hidden
        className={`absolute -top-40 -left-32 h-[36rem] w-[36rem] rounded-full blur-3xl ${orbs[0]}`}
        animate={{ y: [0, 30, 0], x: [0, 20, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className={`absolute top-1/3 -right-40 h-[40rem] w-[40rem] rounded-full blur-3xl ${orbs[1]}`}
        animate={{ y: [0, -40, 0], x: [0, -20, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className={`absolute -bottom-40 left-1/4 h-[34rem] w-[34rem] rounded-full blur-3xl ${orbs[2]}`}
        animate={{ y: [0, -25, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
    </div>
  );
}

export function WaveDivider({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 1440 120" className={`w-full ${className}`} preserveAspectRatio="none">
      <path
        d="M0,64L60,69.3C120,75,240,85,360,80C480,75,600,53,720,53.3C840,53,960,75,1080,80C1200,85,1320,75,1380,69.3L1440,64L1440,120L0,120Z"
        fill="currentColor"
        opacity="0.6"
      />
    </svg>
  );
}
