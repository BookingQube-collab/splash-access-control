import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { RoleGuard } from "@/components/role-guard";
import { scanQR, getScanditConfig } from "@/lib/summersplash.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, XCircle, Camera, Keyboard } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

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
      setTimeout(() => setResult(null), 2000);
    } catch (e: any) {
      setResult({ valid: false, reason: e.message || "Scan failed" });
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
    <div className="mx-auto max-w-2xl px-6 py-8">
      <div className="mb-4 flex gap-2">
        <Button variant={mode === "entry" ? "default" : "outline"} onClick={() => setMode("entry")} className="flex-1">Entry</Button>
        <Button variant={mode === "exit" ? "default" : "outline"} onClick={() => setMode("exit")} className="flex-1">Exit</Button>
      </div>
      <Card>
        <CardContent className="p-6">
          <p className="mb-2 text-xs text-muted-foreground">
            Scanner: {scanditEnabled ? "Scandit (configured) · fallback to camera" : "Browser camera"}
          </p>
          {!cameraOn ? (
            <Button onClick={startCamera} className="w-full"><Camera className="mr-2 h-4 w-4" /> Start camera</Button>
          ) : (
            <>
              <div id="qr-reader" className="overflow-hidden rounded-lg" />
              <Button variant="outline" onClick={stopCamera} className="mt-3 w-full">Stop camera</Button>
            </>
          )}
          <div className="mt-4">
            <label className="text-xs text-muted-foreground flex items-center gap-1"><Keyboard className="h-3 w-3" /> Hardware scanner / manual</label>
            <form onSubmit={(e) => { e.preventDefault(); if (hwInput.trim()) { handleToken(hwInput.trim()); setHwInput(""); } }}>
              <input autoFocus value={hwInput} onChange={(e) => setHwInput(e.target.value)}
                placeholder="Scan or paste QR data, then Enter"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
            </form>
          </div>
        </CardContent>
      </Card>

      {result && (
        <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center text-white ${result.valid ? "bg-success" : "bg-destructive"}`}>
          {result.valid ? <CheckCircle2 className="h-32 w-32" /> : <XCircle className="h-32 w-32" />}
          <h2 className="mt-4 font-display text-4xl font-bold">{result.valid ? "VALID" : "INVALID"}</h2>
          <p className="mt-2 text-xl">{result.reason}</p>
          {result.customer && <p className="text-lg opacity-90">{result.customer}</p>}
        </div>
      )}
    </div>
  );
}
