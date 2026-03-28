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

export default function Home() {
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
  const inactive = properties.filter((p) => p.status !== "Active");

  return (
    <div style={{
      minHeight: "100vh",
      background: "#060B12",
      color: "#EDF1F5",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      padding: "40px",
    }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <h1 style={{
          fontSize: 32,
          fontWeight: 300,
          marginBottom: 8,
          color: "#C9A96E",
        }}>
          Cape PM OS
        </h1>
        <p style={{ color: "rgba(237,241,245,0.5)", marginBottom: 40 }}>
          {loading ? "Connecting to Airtable..." : `${active.length} active properties · Live data from Airtable`}
        </p>

        {loading ? (
          <p style={{ color: "rgba(237,241,245,0.3)" }}>Loading...</p>
        ) : (
          <>
            <h2 style={{
              fontSize: 14,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "rgba(237,241,245,0.35)",
              marginBottom: 16,
              fontWeight: 600,
            }}>
              Active Properties
            </h2>

            {active.map((p) => (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "16px 20px",
                  background: "#111C2E",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 10,
                  marginBottom: 8,
                }}
              >
                <div>
                  <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 3 }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(237,241,245,0.35)" }}>
                    {p.owner} · {p.currency}
                  </div>
                </div>
                <div style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: "#6ECF97",
                }}>
                  Active
                </div>
              </div>
            ))}

            {inactive.length > 0 && (
              <>
                <h2 style={{
                  fontSize: 14,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "rgba(237,241,245,0.35)",
                  marginBottom: 16,
                  marginTop: 32,
                  fontWeight: 600,
                }}>
                  Other
                </h2>
                {inactive.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "16px 20px",
                      background: "#0C1420",
                      border: "1px solid rgba(255,255,255,0.04)",
                      borderRadius: 10,
                      marginBottom: 8,
                      opacity: 0.6,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 3 }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: 12, color: "rgba(237,241,245,0.35)" }}>
                        {p.owner || "—"}
                      </div>
                    </div>
                    <div style={{
                      fontSize: 12,
                      color: "rgba(237,241,245,0.35)",
                    }}>
                      {p.status}
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}