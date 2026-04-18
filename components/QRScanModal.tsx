"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function QRScanModal({ open, onClose }: Props) {
  const containerId = "qr-reader-container";
  const scannerRef = useRef<any>(null);
  const [error, setError] = useState<string>("");
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setError("");
    setStarting(true);

    (async () => {
      try {
        const mod: any = await import("html5-qrcode");
        if (cancelled) return;
        const Html5Qrcode = mod.Html5Qrcode;
        const instance = new Html5Qrcode(containerId);
        scannerRef.current = instance;

        await instance.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 260, height: 260 } },
          (decoded: string) => {
            instance.stop().then(() => instance.clear()).catch(() => {});
            scannerRef.current = null;
            try {
              const url = new URL(decoded);
              const sameOrigin = url.origin === window.location.origin;
              if (sameOrigin && url.pathname.startsWith("/asset/")) {
                window.location.href = url.pathname;
                return;
              }
              if (sameOrigin) { window.location.href = url.pathname + url.search; return; }
              setError(`Scanned code points to a different site: ${url.origin}. Ignored.`);
              onClose();
            } catch {
              setError(`Scanned code is not a URL: ${decoded.slice(0, 80)}`);
              onClose();
            }
          },
          () => {},
        );
        setStarting(false);
      } catch (e: any) {
        setError(e?.message || "Unable to start camera. Check permissions.");
        setStarting(false);
      }
    })();

    return () => {
      cancelled = true;
      const s = scannerRef.current;
      if (s) {
        s.stop().then(() => s.clear()).catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, padding: 20, maxWidth: 420, width: "100%", fontFamily: "var(--fb)" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--accent)" }}>Scan Asset QR</div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--text3)", fontSize: 22, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>
        <div id={containerId} style={{ width: "100%", borderRadius: 8, overflow: "hidden", background: "#000", minHeight: 280 }} />
        {starting && <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 12, textAlign: "center" }}>Starting camera…</div>}
        {error && <div style={{ fontSize: 12, color: "var(--red)", marginTop: 12, padding: 10, background: "var(--red-s)", borderRadius: 6 }}>{error}</div>}
        <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 12, textAlign: "center" }}>Point at any asset label printed from this system.</div>
      </div>
    </div>
  );
}
