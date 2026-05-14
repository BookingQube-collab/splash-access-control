import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RoleGuard } from "@/components/role-guard";
import { scanQR, getScanditConfig } from "@/lib/summersplash.functions";
import { CheckCircle2, XCircle, Camera, Keyboard, ScanLine, LogIn, LogOut } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { BeachBg } from "@/components/beach-bg";

export const Route = createFileRoute("/scanner")({
  component: () => (<RoleGuard role="scanner" loginPath="/login/scanner"><Scanner /></RoleGuard>),
});

function Scanner() {
  const scan = useServerFn(scanQR);
  const getCfg = useServerFn(getScanditConfig);
  const [mode, setMode] = useState<"entry" | "exit">("entry");
  const [result, setResult] = useState<{ valid: boolean; reason: string; customer?: string } | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [hwInput, setHwInput] = useState("");
  const [scanditEnabled, setScanditEnabled] = useState(false);
  const html5Ref = useRef<Html5Qrcode | null>(null);
  const lastScanned = useRef<{ token: string; t: number } | null>(null);

  useEffect(() => { getCfg().then((c) => setScanditEnabled(c.enabled)); }, [getCfg]);

  const handleToken = async (token: string) => {
    const now = Date.now();
    if (lastScanned.current && lastScanned.current.token === token && now - lastScanned.current.t < 2500) return;
    lastScanned.current = { token, t: now };
    try {
      const r = await scan({ data: { qr_token: token, mode } });
      setResult(r);
      setTimeout(() => setResult(null), 1800);
    } catch (e: any) {
      setResult({ valid: false, reason: e.message || "Scan failed" });
      setTimeout(() => setResult(null), 1800);
    }
  };

  const startCamera = async () => {
    setCameraOn(true);
    setTimeout(async () => {
      const el = document.getElementById("qr-reader");
      if (!el) return;
      const q = new Html5Qrcode("qr-reader");
      html5Ref.current = q;
      try {
        await q.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, (decoded) => handleToken(decoded), () => {});
      } catch (e) { console.error(e); }
    }, 100);
  };
  const stopCamera = async () => {
    if (html5Ref.current) { try { await html5Ref.current.stop(); await html5Ref.current.clear(); } catch {} html5Ref.current = null; }
    setCameraOn(false);
  };
  useEffect(() => () => { stopCamera(); }, []);

  return (
    <div className="relative min-h-screen px-4 py-8">
      <BeachBg variant="ocean" />
      <div className="relative z-10 mx-auto max-w-2xl">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Scanner</h1>
            <p className="text-xs text-muted-foreground">
              {scanditEnabled ? "Scandit configured · camera fallback" : "Browser camera mode"}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full glass px-3 py-1 text-xs">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse" /> Ready
          </span>
        </header>

        {/* Mode switch */}
        <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl glass p-1.5">
          <ModeBtn active={mode === "entry"} onClick={() => setMode("entry")} icon={<LogIn className="h-4 w-4" />} label="Entry" hue="bg-success" />
          <ModeBtn active={mode === "exit"}  onClick={() => setMode("exit")}  icon={<LogOut className="h-4 w-4" />} label="Exit"  hue="bg-sunset" />
        </div>

        {/* Scan area */}
        <div className="overflow-hidden rounded-3xl glass-strong p-6 shadow-soft">
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-black/60">
            {cameraOn ? (
              <>
                <div id="qr-reader" className="h-full w-full" />
                <ScannerFrame />
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <div className="relative grid h-24 w-24 place-items-center rounded-full bg-aqua/20 animate-pulse-ring">
                  <ScanLine className="h-10 w-10 text-aqua" />
                </div>
                <p className="text-sm text-muted-foreground">Tap to start scanning</p>
                <button onClick={startCamera}
                  className="inline-flex items-center gap-2 rounded-full bg-aqua px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow-aqua">
                  <Camera className="h-4 w-4" /> Start camera
                </button>
              </div>
            )}
          </div>
          {cameraOn && (
            <button onClick={stopCamera} className="mt-3 w-full rounded-xl glass py-2.5 text-sm font-semibold hover-glow">
              Stop camera
            </button>
          )}

          {/* Manual / hardware input */}
          <div className="mt-5">
            <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              <Keyboard className="h-3 w-3" /> Hardware scanner / manual
            </label>
            <form onSubmit={(e) => { e.preventDefault(); if (hwInput.trim()) { handleToken(hwInput.trim()); setHwInput(""); } }}>
              <input
                autoFocus value={hwInput} onChange={(e) => setHwInput(e.target.value)}
                placeholder="Scan or paste QR token, then Enter"
                className="mt-1.5 w-full rounded-xl border-0 bg-foreground/5 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/60"
              />
            </form>
          </div>
        </div>
      </div>

      {/* Result flash overlay */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className={`fixed inset-0 z-50 flex flex-col items-center justify-center text-white ${
              result.valid ? "bg-gradient-to-br from-success to-aqua" : "bg-gradient-to-br from-destructive to-coral"
            }`}
          >
            <motion.div
              initial={{ scale: 0.5, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 14 }}
            >
              {result.valid ? <CheckCircle2 className="h-36 w-36 drop-shadow-2xl" /> : <XCircle className="h-36 w-36 drop-shadow-2xl" />}
            </motion.div>
            <h2 className="mt-6 font-display text-5xl font-extrabold tracking-tight drop-shadow-lg">
              {result.valid ? "VALID" : "INVALID"}
            </h2>
            <p className="mt-3 text-xl opacity-95">{result.reason}</p>
            {result.customer && <p className="mt-1 text-2xl font-semibold">{result.customer}</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ModeBtn({ active, onClick, icon, label, hue }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; hue: string }) {
  return (
    <button onClick={onClick}
      className={`relative flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
        active ? `${hue} text-primary-foreground shadow-glow-aqua` : "text-muted-foreground hover:text-foreground"
      }`}>
      {icon}{label}
    </button>
  );
}

function ScannerFrame() {
  return (
    <div className="pointer-events-none absolute inset-0">
      {/* corners */}
      {["top-3 left-3 border-t-2 border-l-2", "top-3 right-3 border-t-2 border-r-2",
        "bottom-3 left-3 border-b-2 border-l-2", "bottom-3 right-3 border-b-2 border-r-2"].map((c) => (
        <span key={c} className={`absolute h-10 w-10 border-aqua rounded-md ${c}`} />
      ))}
      {/* moving line */}
      <div className="absolute inset-x-6 overflow-hidden">
        <div className="relative h-full">
          <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-aqua to-transparent shadow-[0_0_20px_var(--aqua)] animate-scan-line" />
        </div>
      </div>
    </div>
  );
}
