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

type Expense = {
  id: string;
  receiptNo: string;
  date: string;
  category: string;
  supplier: string;
  house: string;
  total: number;
  currency: string;
  description: string;
  receiptUrl: string;
  owner: string;
};

const catColors: Record<string, { bg: string; text: string }> = {
  Utilities: { bg: "rgba(207,196,110,0.1)", text: "#CFC46E" },
  "Villa Staff": { bg: "var(--orange-s)", text: "var(--orange)" },
  "Cleaning Supplies": { bg: "var(--blue-s)", text: "var(--blue)" },
  Miscellaneous: { bg: "var(--green-s)", text: "var(--green)" },
  Groceries: { bg: "var(--teal-s)", text: "var(--teal-l)" },
  Maintenance: { bg: "var(--accent-s)", text: "var(--accent)" },
  "Rental Expenses": { bg: "var(--red-s)", text: "var(--red)" },
  Others: { bg: "rgba(155,142,196,0.12)", text: "#9B8EC4" },
};

export default function AdminDashboard() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [expLoading, setExpLoading] = useState(false);
  const [expFilter, setExpFilter] = useState("all");
  const [activePage, setActivePage] = useState("dashboard");

  useEffect(() => {
    fetch("/api/properties")
      .then((res) => res.json())
      .then((data) => {
        setProperties(data.properties || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (activePage === "expenses") {
      setExpLoading(true);
      const url =
        expFilter === "all"
          ? "/api/expenses"
          : `/api/expenses?house=${encodeURIComponent(expFilter)}`;
      fetch(url)
        .then((res) => res.json())
        .then((data) => {
          setExpenses(data.expenses || []);
          setExpLoading(false);
        })
        .catch(() => setExpLoading(false));
    }
  }, [activePage, expFilter]);

  const active = properties.filter((p) => p.status === "Active");

  // Sidebar component inline
  const navItems = [
    { id: "dashboard", icon: "◈", label: "Dashboard" },
    { id: "expenses", icon: "⎙", label: "Expenses" },
    { id: "housekeeping", icon: "⌂", label: "Housekeeping", badge: "3" },
    { id: "deposits", icon: "↓", label: "Deposits" },
    { id: "reports", icon: "↗", label: "Reports" },
    { id: "properties", icon: "▦", label: "Properties" },
    { id: "users", icon: "◌", label: "Users" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", minHeight: "100vh" }}>
      {/* Sidebar */}
      <div
        style={{
          background: "var(--bg2)",
          borderRight: "1px solid var(--border)",
          height: "100vh",
          position: "sticky",
          top: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "auto",
        }}
      >
        <div
          style={{
            padding: "24px 20px 20px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <svg width="28" height="30" viewBox="0 0 54 58" fill="none">
            <defs>
              <linearGradient id="lg1" x1="27" y1="0" x2="27" y2="36">
                <stop offset="0%" stopColor="#1A2E4A" />
                <stop offset="100%" stopColor="#2A6B7C" />
              </linearGradient>
              <linearGradient id="lg2" x1="27" y1="16" x2="27" y2="46">
                <stop offset="0%" stopColor="#2A6B7C" />
                <stop offset="100%" stopColor="#3A9BAA" />
              </linearGradient>
              <linearGradient id="lg3" x1="27" y1="32" x2="27" y2="56">
                <stop offset="0%" stopColor="#3A9BAA" />
                <stop offset="100%" stopColor="#5CC4C9" />
              </linearGradient>
            </defs>
            <path d="M27 2L50 42H4L27 2Z" fill="url(#lg1)" opacity=".92" />
            <path d="M27 18L44 48H10L27 18Z" fill="url(#lg2)" opacity=".88" />
            <path d="M27 32L38 54H16L27 32Z" fill="url(#lg3)" opacity=".95" />
          </svg>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "var(--text2)" }}>Cape PM</div>
            <div style={{ fontSize: 10, color: "var(--text3)", letterSpacing: "0.04em" }}>Admin Panel</div>
          </div>
        </div>

        <div style={{ padding: "16px 12px 8px" }}>
          <div style={{ fontSize: 10, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "var(--text3)", padding: "0 12px 8px", fontWeight: 600 }}>Management</div>
          {navItems.map((item) => (
            <div
              key={item.id}
              onClick={() => setActivePage(item.id)}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8,
                fontSize: 13, cursor: "pointer", position: "relative" as const, transition: "all 0.15s", userSelect: "none" as const,
                color: activePage === item.id ? "var(--accent)" : "var(--text2)",
                background: activePage === item.id ? "var(--accent-s)" : "transparent",
              }}
            >
              <span style={{ width: 18, textAlign: "center" as const, fontSize: 14, opacity: activePage === item.id ? 1 : 0.6 }}>{item.icon}</span>
              {item.label}
              {item.badge && (
                <span style={{ position: "absolute" as const, right: 12, minWidth: 18, height: 18, borderRadius: "50%", background: "var(--red)", color: "#fff", fontSize: 10, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
                  {item.badge}
                </span>
              )}
            </div>
          ))}
        </div>

        <div style={{ flex: 1 }} />
        <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border)", fontSize: 11, color: "var(--text3)" }}>
          Logged in as: Ana García · Admin
        </div>
      </div>

      {/* Main Content */}
      <main style={{ overflow: "auto" }}>
        {activePage === "dashboard" && (
          <div style={{ padding: "32px 40px", maxWidth: 960 }}>
            <h1 style={{ fontFamily: "'Georgia', serif", fontSize: 28, fontWeight: 400, marginBottom: 6 }}>Portfolio Dashboard</h1>
            <p style={{ fontSize: 14, color: "var(--text2)", marginBottom: 32 }}>
              {loading ? "Loading..." : `March 2026 · ${active.length} active properties`}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
              {[
                { label: "Active Properties", value: String(active.length), color: "var(--teal-l)" },
                { label: "Total Properties", value: String(properties.length), color: "var(--text)" },
                { label: "Expenses (MTD)", value: "$92,348", color: "var(--text)" },
                { label: "Deposits (MTD)", value: "$142,000", color: "var(--green)" },
              ].map((stat, i) => (
                <div key={i} style={{ padding: 20, background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 14 }}>
                  <div style={{ fontSize: 11, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text3)", marginBottom: 8, fontWeight: 500 }}>{stat.label}</div>
                  <div style={{ fontFamily: "'Georgia', serif", fontSize: 26, color: stat.color }}>{stat.value}</div>
                </div>
              ))}
            </div>
            <h2 style={{ fontFamily: "'Georgia', serif", fontSize: 20, fontWeight: 400, marginBottom: 16 }}>Active Properties</h2>
            {active.map((p) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 16px", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 8, marginBottom: 8, cursor: "pointer" }}
                onClick={() => { setExpFilter(p.name); setActivePage("expenses"); }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text3)" }}>{p.owner} · {p.currency}</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 500, color: "var(--green)" }}>Active</div>
              </div>
            ))}
          </div>
        )}

        {activePage === "expenses" && (
          <div style={{ padding: "32px 40px", maxWidth: 1100 }}>
            <h1 style={{ fontFamily: "'Georgia', serif", fontSize: 28, fontWeight: 400, marginBottom: 6 }}>Expenses</h1>
            <p style={{ fontSize: 14, color: "var(--text2)", marginBottom: 28 }}>
              All expenses across portfolio · Sort and filter by property
            </p>

            {/* Filter bar */}
            <div style={{ display: "flex", gap: 10, marginBottom: 20, alignItems: "center" }}>
              <select
                value={expFilter}
                onChange={(e) => setExpFilter(e.target.value)}
                style={{
                  padding: "8px 32px 8px 12px", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 8,
                  color: "var(--text)", fontFamily: "inherit", fontSize: 13, outline: "none", cursor: "pointer", minWidth: 200,
                  appearance: "none" as const,
                  backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' fill=\'%23888\'%3E%3Cpath d=\'M1 3l4 4 4-4\'/%3E%3C/svg%3E")',
                  backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center",
                }}
              >
                <option value="all">All properties</option>
                {active.map((p) => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
              <span style={{ fontSize: 12, color: "var(--text3)" }}>
                {expLoading ? "Loading..." : `${expenses.length} records`}
              </span>
            </div>

            {/* Expense table */}
            <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ overflowX: "auto", maxHeight: 600, overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "separate" as const, borderSpacing: 0 }}>
                  <thead>
                    <tr>
                      {["Date", "Receipt #", "Property", "Category", "Supplier", "Description", "Amount", "Cur", "Receipt"].map((h) => (
                        <th
                          key={h}
                          style={{
                            textAlign: "left" as const, padding: "10px 12px", fontSize: 10, textTransform: "uppercase" as const,
                            letterSpacing: "0.08em", color: "var(--text3)", fontWeight: 600,
                            borderBottom: "1px solid var(--border2)", position: "sticky" as const, top: 0,
                            background: "var(--bg3)", whiteSpace: "nowrap" as const,
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((e) => {
                      const cc = catColors[e.category] || { bg: "var(--bg2)", text: "var(--text2)" };
                      return (
                        <tr key={e.id}>
                          <td style={{ padding: "10px 12px", fontSize: 13, borderBottom: "1px solid var(--border)", color: "var(--text2)", whiteSpace: "nowrap" as const }}>{e.date}</td>
                          <td style={{ padding: "10px 12px", fontSize: 11, borderBottom: "1px solid var(--border)", color: "var(--text3)", whiteSpace: "nowrap" as const }}>{e.receiptNo}</td>
                          <td style={{ padding: "10px 12px", fontSize: 13, borderBottom: "1px solid var(--border)", color: "var(--text)", fontWeight: 500, whiteSpace: "nowrap" as const }}>{e.house}</td>
                          <td style={{ padding: "10px 12px", fontSize: 13, borderBottom: "1px solid var(--border)" }}>
                            <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 100, fontSize: 11, fontWeight: 500, background: cc.bg, color: cc.text }}>{e.category}</span>
                          </td>
                          <td style={{ padding: "10px 12px", fontSize: 13, borderBottom: "1px solid var(--border)", color: "var(--text2)", whiteSpace: "nowrap" as const }}>{e.supplier}</td>
                          <td style={{ padding: "10px 12px", fontSize: 13, borderBottom: "1px solid var(--border)", color: "var(--text2)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }} title={e.description}>{e.description}</td>
                          <td style={{ padding: "10px 12px", fontSize: 13, borderBottom: "1px solid var(--border)", color: "var(--text)", fontWeight: 500, whiteSpace: "nowrap" as const }}>
                            ${e.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: "10px 12px", fontSize: 13, borderBottom: "1px solid var(--border)" }}>
                            <span style={{
                              fontSize: 11, padding: "2px 8px", borderRadius: 100,
                              background: e.currency === "USD" ? "var(--blue-s)" : "var(--teal-s)",
                              color: e.currency === "USD" ? "var(--blue)" : "var(--teal-l)",
                            }}>
                              {e.currency}
                            </span>
                          </td>
                          <td style={{ padding: "10px 12px", fontSize: 13, borderBottom: "1px solid var(--border)" }}>
                            {e.receiptUrl && (
                              <a href={e.receiptUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--teal-l)", textDecoration: "none", fontSize: 12, fontWeight: 500 }}>
                                View
                              </a>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activePage !== "dashboard" && activePage !== "expenses" && (
          <div style={{ padding: "32px 40px" }}>
            <h1 style={{ fontFamily: "'Georgia', serif", fontSize: 28, fontWeight: 400, marginBottom: 6 }}>
              {navItems.find((n) => n.id === activePage)?.label || ""}
            </h1>
            <p style={{ fontSize: 14, color: "var(--text3)", marginTop: 20 }}>Coming soon — this module will be built next.</p>
          </div>
        )}
      </main>
    </div>
  );
}