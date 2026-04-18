"use client";

export default function ReceiptThumb({ url, size = 36 }: { url?: string; size?: number }) {
  if (!url) return <span style={{ fontSize: 11, color: "var(--text3)" }}>—</span>;
  const isPdf = /\.pdf($|\?)/i.test(url);
  const dim = { width: size, height: size };
  const wrap: React.CSSProperties = {
    ...dim,
    borderRadius: 6,
    overflow: "hidden",
    background: "var(--bg2)",
    border: "1px solid var(--border)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  };
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }} title="Open receipt">
      <div style={wrap}>
        {isPdf ? (
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text2)" }}>PDF</span>
        ) : (
          <img src={url} alt="Receipt" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        )}
      </div>
    </a>
  );
}
