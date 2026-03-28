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

const navItems = [
  { id: "dashboard", icon: "\u25C8", label: "Dashboard" },
  { id: "expenses", icon: "\u2399", label: "Expenses" },
  { id: "housekeeping", icon: "\u2302", label: "Housekeeping", badge: "3" },
  { id: "deposits", icon: "\u2193", label: "Deposits" },
  { id: "reports", icon: "\u2197", label: "Reports" },
  { id: "properties", icon: "\u25A6", label: "Properties" },
  { id: "users", icon: "\u25CC", label: "Users" },
];

function getMonthOptions(): { label: string; value: string }[] {
  const options: { label: string; value: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    options.push({ label, value });
  }
  return options;
}

export default function AdminDashboard() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [expLoading, setExpLoading] = useState(false);
  const [expFilter, setExpFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [activePage, setActivePage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const monthOptions = getMonthOptions();

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

  // Filter expenses by month
  const filteredExpenses = monthFilter === "all"
    ? expenses
    : expenses.filter((e) => e.date && e.date.startsWith(monthFilter));

  const sidebarWidth = sidebarOpen ? 260 : 72;

  return (
    <div style={{ display: "grid", gridTemplateColumns: `${sidebarWidth}px 1fr`, minHeight: "100vh", transition: "grid-template-columns 0.2s ease" }}>

      {/* ===== SIDEBAR ===== */}
      <div style={{
        background: "var(--bg2)",
        borderRight: "1px solid var(--border)",
        height: "100vh",
        position: "sticky" as const,
        top: 0,
        display: "flex",
        flexDirection: "column" as const,
        overflow: "hidden",
        transition: "width 0.2s ease",
        width: sidebarWidth,
      }}>
        {/* Header */}
        <div style={{
          padding: sidebarOpen ? "24px 20px 20px" : "24px 12px 20px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          minHeight: 78,
        }}>
          <svg width="28" height="30" viewBox="0 0 54 58" fill="none" style={{ flexShrink: 0 }}>
            <defs>
              <linearGradient id="lg1" x1="27" y1="0" x2="27" y2="36"><stop offset="0%" stopColor="#1A2E4A" /><stop offset="100%" stopColor="#2A6B7C" /></linearGradient>
              <linearGradient id="lg2" x1="27" y1="16" x2="27" y2="46"><stop offset="0%" stopColor="#2A6B7C" /><stop offset="100%" stopColor="#3A9BAA" /></linearGradient>
              <linearGradient id="lg3" x1="27" y1="32" x2="27" y2="56"><stop offset="0%" stopColor="#3A9BAA" /><stop offset="100%" stopColor="#5CC4C9" /></linearGradient>
            </defs>
            <path d="M27 2L50 42H4L27 2Z" fill="url(#lg1)" opacity=".92" />
            <path d="M27 18L44 48H10L27 18Z" fill="url(#lg2)" opacity=".88" />
            <path d="M27 32L38 54H16L27 32Z" fill="url(#lg3)" opacity=".95" />
          </svg>
          {sidebarOpen && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "var(--text2)" }}>Cape PM</div>
              <div style={{ fontSize: 10, color: "var(--text3)", letterSpacing: "0.04em" }}>Admin Panel</div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div style={{ padding: sidebarOpen ? "16px 12px 8px" : "16px 8px 8px", flex: 1 }}>
          {sidebarOpen && (
            <div style={{ fontSize: 10, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "var(--text3)", padding: "0 12px 8px", fontWeight: 600 }}>Management</div>
          )}
          {navItems.map((item) => (
            <div
              key={item.id}
              onClick={() => setActivePage(item.id)}
              title={sidebarOpen ? undefined : item.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: sidebarOpen ? "10px 12px" : "10px 0",
                justifyContent: sidebarOpen ? "flex-start" : "center",
                borderRadius: 8,
                fontSize: 13,
                cursor: "pointer",
                position: "relative" as const,
                transition: "all 0.15s",
                userSelect: "none" as const,
                color: activePage === item.id ? "var(--accent)" : "var(--text2)",
                background: activePage === item.id ? "var(--accent-s)" : "transparent",
              }}
            >
              <span style={{ width: 18, textAlign: "center" as const, fontSize: 14, opacity: activePage === item.id ? 1 : 0.6, flexShrink: 0 }}>{item.icon}</span>
              {sidebarOpen && item.label}
              {item.badge && sidebarOpen && (
                <span style={{ position: "absolute" as const, right: 12, minWidth: 18, height: 18, borderRadius: "50%", background: "var(--red)", color: "#fff", fontSize: 10, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
                  {item.badge}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Collapse toggle */}
        <div
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            padding: "12px 20px",
            borderTop: "1px solid var(--border)",
            fontSize: 12,
            color: "var(--text3)",
            cursor: "pointer",
            textAlign: sidebarOpen ? "right" as const : "center" as const,
            transition: "all 0.15s",
          }}
        >
          {sidebarOpen ? "\u25C0 Collapse" : "\u25B6"}
        </div>

        {/* Footer */}
        {sidebarOpen && (
          <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", fontSize: 11, color: "var(--text3)" }}>
            Ana Garc\u00EDa \u00B7 Admin
          </div>
        )}
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <main style={{ overflow: "auto", minWidth: 0 }}>

        {/* DASHBOARD */}
        {activePage === "dashboard" && (
          <div style={{ padding: "32px 40px" }}>
            <h1 style={{ fontFamily: "'Georgia', serif", fontSize: 28, fontWeight: 400, marginBottom: 6 }}>Portfolio Dashboard</h1>
            <p style={{ fontSize: 14, color: "var(--text2)", marginBottom: 32 }}>
              {loading ? "Loading..." : `March 2026 \u00B7 ${active.length} active properties`}
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
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 16px", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 8, marginBottom: 8, cursor: "pointer", transition: "border-color 0.15s" }}
                onClick={() => { setExpFilter(p.name); setActivePage("expenses"); }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)")}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text3)" }}>{p.owner} \u00B7 {p.currency}</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 500, color: "var(--green)" }}>Active</div>
              </div>
            ))}
          </div>
        )}

        {/* EXPENSES */}
        {activePage === "expenses" && (
          <div style={{ padding: "32px 32px 32px 40px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
              <div>
                <h1 style={{ fontFamily: "'Georgia', serif", fontSize: 28, fontWeight: 400, marginBottom: 6 }}>Expenses</h1>
                <p style={{ fontSize: 14, color: "var(--text2)" }}>
                  {expLoading ? "Loading..." : `${filteredExpenses.length} records`}
                  {expFilter !== "all" && ` \u00B7 ${expFilter}`}
                  {monthFilter !== "all" && ` \u00B7 ${monthOptions.find(m => m.value === monthFilter)?.label}`}
                </p>
              </div>
            </div>

            {/* Filters */}
            <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center", flexWrap: "wrap" as const }}>
              <select
                value={expFilter}
                onChange={(e) => setExpFilter(e.target.value)}
                style={{
                  padding: "9px 36px 9px 14px", background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: 8,
                  color: "var(--text)", fontFamily: "inherit", fontSize: 13, outline: "none", cursor: "pointer", minWidth: 200,
                  appearance: "none" as const,
                  backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' fill=\'%23888\'%3E%3Cpath d=\'M1 3l4 4 4-4\'/%3E%3C/svg%3E")',
                  backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center",
                }}
              >
                <option value="all">All properties</option>
                {active.map((p) => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>

              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                style={{
                  padding: "9px 36px 9px 14px", background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: 8,
                  color: "var(--text)", fontFamily: "inherit", fontSize: 13, outline: "none", cursor: "pointer", minWidth: 180,
                  appearance: "none" as const,
                  backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' fill=\'%23888\'%3E%3Cpath d=\'M1 3l4 4 4-4\'/%3E%3C/svg%3E")',
                  backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center",
                }}
              >
                <option value="all">All months</option>
                {monthOptions.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>

              {(expFilter !== "all" || monthFilter !== "all") && (
                <span
                  onClick={() => { setExpFilter("all"); setMonthFilter("all"); }}
                  style={{ fontSize: 12, color: "var(--teal-l)", cursor: "pointer", padding: "9px 0" }}
                >
                  Clear filters
                </span>
              )}
            </div>

            {/* Expense table */}
            <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" as const, overflowY: "auto" as const, maxHeight: "calc(100vh - 220px)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" as const }}>
                  <thead>
                    <tr>
                      {["Date", "Receipt #", "Property", "Category", "Supplier", "Description", "Amount", "Cur", "Receipt"].map((h) => (
                        <th key={h} style={{
                          textAlign: "left" as const, padding: "12px 14px", fontSize: 10, textTransform: "uppercase" as const,
                          letterSpacing: "0.08em", color: "var(--text3)", fontWeight: 600,
                          borderBottom: "2px solid var(--border2)", position: "sticky" as const, top: 0,
                          background: "var(--bg3)", whiteSpace: "nowrap" as const, zIndex: 1,
                        }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenses.length === 0 && !expLoading && (
                      <tr>
                        <td colSpan={9} style={{ padding: "40px 14px", textAlign: "center" as const, color: "var(--text3)", fontSize: 14 }}>
                          No expenses found for the selected filters.
                        </td>
                      </tr>
                    )}
                    {filteredExpenses.map((e) => {
                      const cc = catColors[e.category] || { bg: "var(--bg2)", text: "var(--text2)" };
                      return (
                        <tr key={e.id} style={{ transition: "background 0.1s" }}
                          onMouseEnter={(ev) => (ev.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                          onMouseLeave={(ev) => (ev.currentTarget.style.background = "transparent")}
                        >
                          <td style={{ padding: "11px 14px", fontSize: 13, borderBottom: "1px solid var(--border)", color: "var(--text2)", whiteSpace: "nowrap" as const }}>{e.date}</td>
                          <td style={{ padding: "11px 14px", fontSize: 11, borderBottom: "1px solid var(--border)", color: "var(--text3)", whiteSpace: "nowrap" as const, fontFamily: "monospace" }}>{e.receiptNo}</td>
                          <td style={{ padding: "11px 14px", fontSize: 13, borderBottom: "1px solid var(--border)", color: "var(--text)", fontWeight: 500, whiteSpace: "nowrap" as const }}>{e.house}</td>
                          <td style={{ padding: "11px 14px", fontSize: 13, borderBottom: "1px solid var(--border)" }}>
                            <span style={{ display: "inline-block", padding: "3px 12px", borderRadius: 100, fontSize: 11, fontWeight: 500, background: cc.bg, color: cc.text, whiteSpace: "nowrap" as const }}>{e.category}</span>
                          </td>
                          <td style={{ padding: "11px 14px", fontSize: 13, borderBottom: "1px solid var(--border)", color: "var(--text2)", whiteSpace: "nowrap" as const }}>{e.supplier}</td>
                          <td style={{ padding: "11px 14px", fontSize: 13, borderBottom: "1px solid var(--border)", color: "var(--text2)", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }} title={e.description}>{e.description}</td>
                          <td style={{ padding: "11px 14px", fontSize: 13, borderBottom: "1px solid var(--border)", color: "var(--text)", fontWeight: 500, whiteSpace: "nowrap" as const, textAlign: "right" as const }}>
                            ${e.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: "11px 14px", fontSize: 13, borderBottom: "1px solid var(--border)" }}>
                            <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 100, background: e.currency === "USD" ? "var(--blue-s)" : "var(--teal-s)", color: e.currency === "USD" ? "var(--blue)" : "var(--teal-l)", whiteSpace: "nowrap" as const }}>
                              {e.currency}
                            </span>
                          </td>
                          <td style={{ padding: "11px 14px", fontSize: 13, borderBottom: "1px solid var(--border)" }}>
                            {e.receiptUrl && (
                              <a href={e.receiptUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--teal-l)", textDecoration: "none", fontSize: 12, fontWeight: 500 }}>View</a>
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

        {/* PLACEHOLDER FOR OTHER PAGES */}
        {activePage !== "dashboard" && activePage !== "expenses" && (
          <div style={{ padding: "32px 40px" }}>
            <h1 style={{ fontFamily: "'Georgia', serif", fontSize: 28, fontWeight: 400, marginBottom: 6 }}>
              {navItems.find((n) => n.id === activePage)?.label || ""}
            </h1>
            <p style={{ fontSize: 14, color: "var(--text3)", marginTop: 20 }}>Coming soon \u2014 this module will be built next.</p>
          </div>
        )}
      </main>
    </div>
  );
}