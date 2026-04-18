"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import QRCode from "qrcode";

type Asset = {
  id: string;
  name: string;
  category: string;
  sectionIds: string[];
};

type Section = { id: string; name: string };

export default function PrintLabelsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 60, textAlign: "center", color: "#999", fontFamily: "sans-serif", fontSize: 13 }}>Loading…</div>}>
      <PrintLabelsInner />
    </Suspense>
  );
}

function PrintLabelsInner() {
  const params = useSearchParams();
  const propertyId = params.get("propertyId") || "";
  const idsParam = params.get("ids") || "";
  const idsFilter = idsParam ? idsParam.split(",").filter(Boolean) : null;

  const [assets, setAssets] = useState<Asset[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [propertyName, setPropertyName] = useState("");
  const [qrs, setQrs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!propertyId) { setLoading(false); return; }
    Promise.all([
      fetch(`/api/assets?propertyId=${propertyId}`).then(r => r.json()),
      fetch(`/api/sections?propertyId=${propertyId}`).then(r => r.json()),
      fetch(`/api/properties`).then(r => r.json()),
    ]).then(([a, s, p]) => {
      let list: Asset[] = a.assets || [];
      if (idsFilter) list = list.filter(x => idsFilter.includes(x.id));
      setAssets(list);
      setSections(s.sections || []);
      const prop = (p.properties || []).find((x: any) => x.id === propertyId);
      if (prop) setPropertyName(prop.name || "");
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [propertyId, idsParam]);

  useEffect(() => {
    if (!assets.length) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    (async () => {
      const results: Record<string, string> = {};
      for (const a of assets) {
        try {
          results[a.id] = await QRCode.toDataURL(`${origin}/asset/${a.id}`, { margin: 1, width: 300, errorCorrectionLevel: "M" });
        } catch (e) { console.error(e); }
      }
      setQrs(results);
    })();
  }, [assets]);

  const sectionMap = useMemo(() => {
    const m: Record<string, string> = {};
    sections.forEach(s => { m[s.id] = s.name; });
    return m;
  }, [sections]);

  return (
    <div>
      <style>{`
        @media screen {
          body { background: #f5f5f5; }
          .print-toolbar { position: sticky; top: 0; z-index: 10; background: #fff; border-bottom: 1px solid #ddd; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
          .print-toolbar h1 { font-size: 14px; font-weight: 600; margin: 0; color: #222; }
          .print-toolbar .count { font-size: 12px; color: #666; margin-left: 12px; }
          .print-sheet { max-width: 8.5in; margin: 20px auto; background: #fff; padding: 0.5in; box-shadow: 0 2px 10px rgba(0,0,0,0.08); }
        }
        @media print {
          .print-toolbar { display: none !important; }
          .print-sheet { margin: 0; padding: 0.4in; max-width: none; box-shadow: none; }
          @page { size: letter; margin: 0.4in; }
        }
        .label-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.2in; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
        .label { border: 1px dashed #999; padding: 10px; text-align: center; page-break-inside: avoid; min-height: 2in; display: flex; flex-direction: column; justify-content: center; align-items: center; }
        .label img { width: 140px; height: 140px; }
        .label .name { font-size: 11px; font-weight: 600; margin-top: 8px; color: #000; line-height: 1.2; }
        .label .sub { font-size: 9px; color: #666; margin-top: 3px; letter-spacing: 0.04em; text-transform: uppercase; }
        .label .property { font-size: 8px; color: #999; margin-top: 4px; }
      `}</style>

      <div className="print-toolbar">
        <div>
          <h1>Asset QR Labels — {propertyName || "Property"}</h1>
          <span className="count">{assets.length} {assets.length === 1 ? "label" : "labels"}</span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => window.print()} style={{ padding: "7px 16px", background: "#A8842A", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Print</button>
          <button onClick={() => window.close()} style={{ padding: "7px 14px", background: "transparent", color: "#666", border: "1px solid #ccc", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Close</button>
        </div>
      </div>

      <div className="print-sheet">
        {loading ? (
          <div style={{ padding: 80, textAlign: "center", color: "#999", fontSize: 13, fontFamily: "sans-serif" }}>Loading assets…</div>
        ) : !propertyId ? (
          <div style={{ padding: 80, textAlign: "center", color: "#999", fontSize: 13, fontFamily: "sans-serif" }}>Missing <code>propertyId</code> query param.</div>
        ) : !assets.length ? (
          <div style={{ padding: 80, textAlign: "center", color: "#999", fontSize: 13, fontFamily: "sans-serif" }}>No assets to print.</div>
        ) : (
          <div className="label-grid">
            {assets.map(a => (
              <div key={a.id} className="label">
                {qrs[a.id] ? <img src={qrs[a.id]} alt={a.name} /> : <div style={{ width: 140, height: 140, background: "#f0f0f0" }} />}
                <div className="name">{a.name}</div>
                {a.sectionIds?.[0] && sectionMap[a.sectionIds[0]] && <div className="sub">{sectionMap[a.sectionIds[0]]}</div>}
                {propertyName && <div className="property">{propertyName}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
