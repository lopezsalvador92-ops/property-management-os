"use client";

import { useEffect, useState } from "react";

type Property = {
  id: string;
  name: string;
  owner: string;
  status: string;
  currency: string;
  pmFee: number;
};

export default function AdminDashboard() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/properties")
      .then((res) => res.json())
      .then((data) => {
        setProperties(data.properties || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const active = properties.filter((p) => p.status === "Active");

  return (
    <div style={{ padding: "32px 40px", maxWidth: 960 }}>
      <h1
        style={{
          fontFamily: "'Georgia', serif",
          fontSize: 28,
          fontWeight: 400,
          marginBottom: 6,
        }}
      >
        Portfolio Dashboard
      </h1>
      <p style={{ fontSize: 14, color: "var(--text2)", marginBottom: 32 }}>
        {loading ? "Loading..." : `March 2026 · ${active.length} active properties`}
      </p>

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
          marginBottom: 32,
        }}
      >
        {[
          { label: "Active Properties", value: active.length.toString(), color: "var(--teal-l)" },
          { label: "Total Properties", value: properties.length.toString(), color: "var(--text)" },
          { label: "Expenses (MTD)", value: "$92,348", color: "var(--text)" },
          { label: "Deposits (MTD)", value: "$142,000", color: "var(--green)" },
        ].map((stat, i) => (
          <div
            key={i}
            style={{
              padding: 20,
              background: "var(--bg3)",
              border: "1px solid var(--border)",
              borderRadius: 14,
            }}
          >
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--text3)",
                marginBottom: 8,
                fontWeight: 500,
              }}
            >
              {stat.label}
            </div>
            <div
              style={{
                fontFamily: "'Georgia', serif",
                fontSize: 26,
                color: stat.color,
              }}
            >
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Properties list */}
      <h2
        style={{
          fontFamily: "'Georgia', serif",
          fontSize: 20,
          fontWeight: 400,
          marginBottom: 16,
        }}
      >
        Properties
      </h2>

      {loading ? (
        <p style={{ color: "var(--text3)" }}>Loading properties...</p>
      ) : (
        active.map((p) => (
          <div
            key={p.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "14px 16px",
              background: "var(--bg2)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              marginBottom: 8,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  marginBottom: 2,
                }}
              >
                {p.name}
              </div>
              <div style={{ fontSize: 12, color: "var(--text3)" }}>
                {p.owner} · {p.currency}
              </div>
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: "var(--green)",
              }}
            >
              Active
            </div>
          </div>
        ))
      )}
    </div>
  );
}