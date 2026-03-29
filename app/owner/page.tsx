"use client";

import { useEffect, useState } from "react";
import { useUser, UserButton } from "@clerk/nextjs";

type Report = {
  id: string; month: string; status: string; startingBalance: number;
  totalExpenses: number; totalDeposits: number; finalBalance: number;
  exchangeRate: number;
  categories: { cleaningSupplies: number; groceries: number; maintenance: number; miscellaneous: number; utilities: number; villaStaff: number };
};
type Expense = { id: string; description: string; amount: number; category: string; date: string; receiptUrl: string };
type Deposit = { id: string; amount: number; date: string; notes: string };

export default function OwnerPortal() {
  const { user } = useUser();
  const linkedProperty = (user?.publicMetadata as { linkedProperty?: string })?.linkedProperty || "";
  const ownerName = user?.firstName || "Owner";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [property, setProperty] = useState<{ name: string; owner: string; currency: string; status: string } | null>(null);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [reports, setReports] = useState<Report[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const [activePage, setActivePage] = useState("home");
  const [currentMonth, setCurrentMonth] = useState(0);

  useEffect(() => {
    if (!linkedProperty) { setLoading(false); return; }
    fetch(`/api/owner?property=${encodeURIComponent(linkedProperty)}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); }
        else {
          setProperty(d.property);
          setCurrentBalance(d.currentBalance);
          setReports(d.reports || []);
          setExpenses(d.expenses || []);
          setDeposits(d.deposits || []);
        }
        setLoading(false);
      })
      .catch(() => { setError("Failed to load data"); setLoading(false); });
  }, [linkedProperty]);

  function fmt(val: number): string {
    const abs = Math.abs(val);
    return `$${abs.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }

  const cur = property?.currency || "USD";
  const report = reports[currentMonth] || null;
  const isNeg = currentBalance < 0;
  const cats = report ? [
    { icon: "⌂", bg: "accent-s", name: "Villa Staff", sub: "Housekeeping, houseman, staff", val: report.categories.villaStaff },
    { icon: "❋", bg: "teal-s", name: "Utilities", sub: "Electricity, water, internet, gas", val: report.categories.utilities },
    { icon: "🔧", bg: "orange-s", name: "Maintenance", sub: "Repairs, upkeep, equipment", val: report.categories.maintenance },
    { icon: "🧴", bg: "accent-s", name: "Cleaning Supplies", sub: "Products and consumables", val: report.categories.cleaningSupplies },
    { icon: "🛒", bg: "green-s", name: "Groceries", sub: "Kitchen stock and provisions", val: report.categories.groceries },
    { icon: "📋", bg: "blue-s", name: "Miscellaneous", sub: "Other operating expenses", val: report.categories.miscellaneous },
  ].filter(c => c.val > 0) : [];

  if (loading) return <div style={{ minHeight: "100vh", background: "#060B12", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(237,241,245,0.5)", fontFamily: "'DM Sans', system-ui, sans-serif" }}>Loading your property data...</div>;
  if (!linkedProperty) return <div style={{ minHeight: "100vh", background: "#060B12", display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", color: "rgba(237,241,245,0.7)", fontFamily: "'DM Sans', system-ui, sans-serif", textAlign: "center" as const, padding: 40 }}><img src="/cape-logo.png" alt="Cape PM" style={{ height: 50, marginBottom: 20, opacity: 0.6 }} /><h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 8 }}>No property linked</h2><p style={{ fontSize: 14, color: "rgba(237,241,245,0.4)" }}>Contact your property manager to link your property.</p></div>;
  if (error) return <div style={{ minHeight: "100vh", background: "#060B12", display: "flex", alignItems: "center", justifyContent: "center", color: "#CF6E6E", fontFamily: "'DM Sans', system-ui, sans-serif" }}>{error}</div>;

  const navItems = [
    { id: "home", icon: "⌂", label: "Home" },
    { id: "financials", icon: "◈", label: "Financials" },
    { id: "expenses", icon: "▤", label: "Expenses" },
    { id: "deposits", icon: "↓", label: "Deposits" },
  ];

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet" />
      <style>{`
        :root{--bg:#060B12;--bg2:#0C1420;--bg3:#111C2E;--bg4:#152236;--border:rgba(255,255,255,0.06);--border2:rgba(255,255,255,0.10);--text:#EDF1F5;--text2:rgba(237,241,245,0.55);--text3:rgba(237,241,245,0.35);--accent:#C9A96E;--accent-s:rgba(201,169,110,0.12);--teal:#3A9BAA;--teal-l:#5CC4C9;--teal-s:rgba(58,155,170,0.12);--green:#6ECF97;--green-s:rgba(110,207,151,0.10);--red:#CF6E6E;--red-s:rgba(207,110,110,0.10);--blue:#6EA8CF;--blue-s:rgba(110,168,207,0.10);--orange:#CF956E;--orange-s:rgba(207,149,110,0.10);--fd:'Instrument Serif',Georgia,serif;--fb:'DM Sans',system-ui,sans-serif}
        *{margin:0;padding:0;box-sizing:border-box}body{background:var(--bg);color:var(--text);-webkit-font-smoothing:antialiased}
      `}</style>
      {theme === "light" && <style>{`
        :root {
          --bg: #F5F7FA !important; --bg2: #FFFFFF !important; --bg3: #FFFFFF !important; --bg4: #F0F2F5 !important;
          --text: #1A1A2E !important; --text2: #4A5568 !important; --text3: #8795A8 !important;
          --border: rgba(0,0,0,0.08) !important; --border2: rgba(0,0,0,0.12) !important;
          --accent: #B8942E !important; --accent-s: rgba(184,148,46,0.1) !important;
          --teal: #2A8B9A !important; --teal-l: #1A7A8A !important; --teal-s: rgba(42,139,154,0.08) !important;
          --green: #2D8B57 !important; --green-s: rgba(45,139,87,0.08) !important;
          --red: #C45555 !important; --red-s: rgba(196,85,85,0.08) !important;
          --blue: #4A8BC4 !important; --blue-s: rgba(74,139,196,0.08) !important;
          --orange: #C4804A !important; --orange-s: rgba(196,128,74,0.08) !important;
        }
      `}</style>}

      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", minHeight: "100vh" }}>
        {/* SIDEBAR */}
        <div style={{ background: "var(--bg2)", borderRight: "1px solid var(--border)", position: "sticky", top: 0, height: "100vh", display: "flex", flexDirection: "column" as const, overflowY: "auto" as const }}>
          <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
            <img src="/cape-logo.png" alt="Cape PM" style={{ height: 28 }} />
            <div><div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "var(--text2)" }}>Cape PM</div><div style={{ fontSize: 10, color: "var(--text3)", letterSpacing: "0.04em" }}>Powered by Axvia</div></div>
          </div>
          <div style={{ padding: "20px 12px 12px" }}>
            <div style={{ padding: "14px 16px", borderRadius: 14, background: "var(--bg3)", border: "1px solid var(--border)" }}>
              <div style={{ fontFamily: "var(--fd)", fontSize: 18, marginBottom: 4 }}>{property?.name}</div>
              <div style={{ fontSize: 12, color: "var(--text3)" }}>{property?.owner}</div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 8, fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: "var(--green)", background: "var(--green-s)", padding: "3px 10px", borderRadius: 100 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)" }} /> Active</div>
            </div>
          </div>
          <div style={{ padding: "16px 12px 8px" }}>
            <div style={{ fontSize: 10, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "var(--text3)", padding: "0 12px 8px", fontWeight: 600 }}>Navigation</div>
            {navItems.map(n => (
              <div key={n.id} onClick={() => setActivePage(n.id)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, fontSize: 13, color: activePage === n.id ? "var(--accent)" : "var(--text2)", background: activePage === n.id ? "var(--accent-s)" : "transparent", cursor: "pointer", transition: "all 0.15s", marginBottom: 2 }}>
                <span style={{ width: 18, textAlign: "center" as const, fontSize: 14, opacity: activePage === n.id ? 1 : 0.6 }}>{n.icon}</span> {n.label}
              </div>
            ))}
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, color: "var(--text3)" }}>{ownerName}</span>
            <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid var(--border2)", background: "transparent", color: "var(--text3)", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>{theme === "dark" ? "Switch to Light" : "Switch to Dark"}</button>
            <UserButton />
          </div>
        </div>

        {/* MAIN */}
        <div style={{ overflowY: "auto" as const }}>
          {/* Hero */}
          {activePage === "home" && (
            <div style={{ position: "relative", height: 200, background: theme === "dark" ? "linear-gradient(135deg, rgba(26,46,74,0.9), rgba(42,107,124,0.7))" : "linear-gradient(135deg, rgba(42,107,124,0.85), rgba(58,155,170,0.7))", display: "flex", alignItems: "flex-end", padding: "32px 40px", overflow: "hidden" }}>
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 120, background: "linear-gradient(transparent, var(--bg))" }} />
              <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", marginBottom: 6 }}>Welcome back,</div>
                <div style={{ fontFamily: "var(--fd)", fontSize: 32, fontWeight: 400, color: "#fff", marginBottom: 4 }}>{property?.name}</div>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }}>{property?.owner} · {cur}</div>
              </div>
            </div>
          )}

          <div style={{ padding: "32px 40px", maxWidth: 960 }}>
            {/* HOME */}
            {activePage === "home" && (<>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
                <div style={{ padding: 20, background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 14 }}><div style={{ fontSize: 11, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text3)", marginBottom: 8, fontWeight: 500 }}>Account Balance</div><div style={{ fontFamily: "var(--fd)", fontSize: 26, color: isNeg ? "var(--red)" : "var(--green)" }}>{isNeg ? "-" : ""}{fmt(currentBalance)}</div><div style={{ fontSize: 11, marginTop: 6, fontWeight: 500, padding: "2px 8px", borderRadius: 100, display: "inline-flex", color: isNeg ? "var(--red)" : "var(--green)", background: isNeg ? "var(--red-s)" : "var(--green-s)" }}>{isNeg ? "Needs deposit" : "Healthy"}</div></div>
                <div style={{ padding: 20, background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 14 }}><div style={{ fontSize: 11, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text3)", marginBottom: 8, fontWeight: 500 }}>Last Deposit</div><div style={{ fontFamily: "var(--fd)", fontSize: 26, color: "var(--teal-l)" }}>{deposits[0] ? fmt(deposits[0].amount) : "—"}</div><div style={{ fontSize: 11, marginTop: 6, fontWeight: 500, padding: "2px 8px", borderRadius: 100, display: "inline-flex", color: "var(--text3)", background: "rgba(255,255,255,0.04)" }}>{deposits[0]?.date ? new Date(deposits[0].date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}</div></div>
                <div style={{ padding: 20, background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 14 }}><div style={{ fontSize: 11, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text3)", marginBottom: 8, fontWeight: 500 }}>Reports Available</div><div style={{ fontFamily: "var(--fd)", fontSize: 26 }}>{reports.length}</div><div style={{ fontSize: 11, marginTop: 6, fontWeight: 500, padding: "2px 8px", borderRadius: 100, display: "inline-flex", color: "var(--text3)", background: "rgba(255,255,255,0.04)" }}>Monthly statements</div></div>
                <div style={{ padding: 20, background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 14 }}><div style={{ fontSize: 11, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text3)", marginBottom: 8, fontWeight: 500 }}>Currency</div><div style={{ fontFamily: "var(--fd)", fontSize: 26, color: "var(--accent)" }}>{cur}</div><div style={{ fontSize: 11, marginTop: 6, fontWeight: 500, padding: "2px 8px", borderRadius: 100, display: "inline-flex", color: "var(--text3)", background: "rgba(255,255,255,0.04)" }}>{cur === "USD" ? "US Dollar" : "Mexican Peso"}</div></div>
              </div>

              {/* Recent activity */}
              <div style={{ fontFamily: "var(--fd)", fontSize: 20, marginBottom: 16 }}>Recent activity</div>
              <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 14, padding: 20 }}>
                {expenses.slice(0, 5).map(e => (
                  <div key={e.id} style={{ display: "flex", gap: 14, padding: "14px 0", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", marginTop: 6, flexShrink: 0, background: "var(--red)" }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, lineHeight: 1.5 }}>Expense: <strong>{e.description || e.category}</strong> — <span style={{ color: "var(--red)" }}>{fmt(e.amount)} {cur}</span></div>
                      <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 3 }}>{e.date ? new Date(e.date + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : ""}</div>
                    </div>
                  </div>
                ))}
                {deposits.slice(0, 2).map(d => (
                  <div key={d.id} style={{ display: "flex", gap: 14, padding: "14px 0", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", marginTop: 6, flexShrink: 0, background: "var(--green)" }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, lineHeight: 1.5 }}>Deposit received — <span style={{ color: "var(--green)" }}>+{fmt(d.amount)} {cur}</span></div>
                      <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 3 }}>{d.date ? new Date(d.date + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : ""}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>)}

            {/* FINANCIALS */}
            {activePage === "financials" && (<>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
                <div><div style={{ fontFamily: "var(--fd)", fontSize: 28, marginBottom: 6 }}>Financial Statement</div><div style={{ fontSize: 14, color: "var(--text2)" }}>Monthly account summary for {property?.name}</div></div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button onClick={() => setCurrentMonth(Math.min(currentMonth + 1, reports.length - 1))} disabled={currentMonth >= reports.length - 1} style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid var(--border2)", background: "transparent", color: currentMonth >= reports.length - 1 ? "var(--text3)" : "var(--text2)", cursor: currentMonth >= reports.length - 1 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, opacity: currentMonth >= reports.length - 1 ? 0.3 : 1 }}>‹</button>
                  <div style={{ fontFamily: "var(--fd)", fontSize: 18, minWidth: 160, textAlign: "center" as const }}>{report?.month || "No reports"}</div>
                  <button onClick={() => setCurrentMonth(Math.max(currentMonth - 1, 0))} disabled={currentMonth <= 0} style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid var(--border2)", background: "transparent", color: currentMonth <= 0 ? "var(--text3)" : "var(--text2)", cursor: currentMonth <= 0 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, opacity: currentMonth <= 0 ? 0.3 : 1 }}>›</button>
                </div>
              </div>

              {report ? (<>
                {/* Stat cards */}
                <div style={{ display: "grid", gridTemplateColumns: cur === "USD" ? "repeat(4, 1fr)" : "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
                  <div style={{ padding: 20, background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 14 }}><div style={{ fontSize: 11, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text3)", marginBottom: 8, fontWeight: 500 }}>Deposits</div><div style={{ fontFamily: "var(--fd)", fontSize: 26, color: "var(--teal-l)" }}>{fmt(report.totalDeposits)}</div></div>
                  <div style={{ padding: 20, background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 14 }}><div style={{ fontSize: 11, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text3)", marginBottom: 8, fontWeight: 500 }}>Total Charges</div><div style={{ fontFamily: "var(--fd)", fontSize: 26 }}>{fmt(report.totalExpenses)}</div></div>
                  {cur === "USD" && <div style={{ padding: 20, background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 14 }}><div style={{ fontSize: 11, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text3)", marginBottom: 8, fontWeight: 500 }}>Exchange Rate</div><div style={{ fontFamily: "var(--fd)", fontSize: 26 }}>{report.exchangeRate > 0 ? report.exchangeRate.toFixed(2) : "—"}</div></div>}
                  <div style={{ padding: 20, background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 14 }}><div style={{ fontSize: 11, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text3)", marginBottom: 8, fontWeight: 500 }}>Final Balance</div><div style={{ fontFamily: "var(--fd)", fontSize: 26, color: report.finalBalance < 0 ? "var(--red)" : "var(--green)" }}>{report.finalBalance < 0 ? "-" : ""}{fmt(report.finalBalance)}</div></div>
                </div>

                {/* Account Summary card */}
                <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 14, marginBottom: 20, overflow: "hidden" }}>
                  <div style={{ padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>Account Summary</span>
                    <span style={{ padding: "4px 10px", borderRadius: 100, fontSize: 11, fontWeight: 600, background: "var(--teal-s)", color: "var(--teal-l)" }}>{report.month.split(" ")[0]}</span>
                  </div>
                  <div style={{ padding: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}><div style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, background: "var(--green-s)" }}>↓</div><div><div style={{ fontSize: 13, color: "var(--text2)" }}>Starting Balance</div></div></div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{fmt(report.startingBalance)} {cur}</div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}><div style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, background: "var(--teal-s)" }}>↓</div><div><div style={{ fontSize: 13, color: "var(--text2)" }}>Owner Deposits</div></div></div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: "var(--green)" }}>+{fmt(report.totalDeposits)} {cur}</div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}><div style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, background: "var(--accent-s)" }}>↑</div><div><div style={{ fontSize: 13, color: "var(--text2)" }}>Total Operating Expenses</div><div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{cats.length} categories</div></div></div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: "var(--red)" }}>-{fmt(report.totalExpenses)} {cur}</div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0 4px", borderTop: "2px solid var(--border2)", marginTop: 4 }}>
                      <div><div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Ending Balance</div><div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>Carried forward</div></div>
                      <div style={{ fontSize: 18, fontWeight: 500, fontFamily: "var(--fd)", color: report.finalBalance < 0 ? "var(--red)" : "var(--green)" }}>{report.finalBalance < 0 ? "-" : ""}{fmt(report.finalBalance)} {cur}</div>
                    </div>
                  </div>
                </div>

                {/* Expense Breakdown card */}
                <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
                  <div style={{ padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>Expense Breakdown</span>
                    <span style={{ padding: "4px 10px", borderRadius: 100, fontSize: 11, fontWeight: 600, background: "var(--accent-s)", color: "var(--accent)" }}>{cats.length} items</span>
                  </div>
                  <div style={{ padding: 20 }}>
                    {cats.map(c => (
                      <div key={c.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, background: `var(--${c.bg})` }}>{c.icon}</div>
                          <div><div style={{ fontSize: 13, color: "var(--text2)" }}>{c.name}</div><div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{c.sub}</div></div>
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{fmt(c.val)} {cur}</div>
                      </div>
                    ))}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0 4px", borderTop: "2px solid var(--border2)", marginTop: 4 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Total Operating Expenses</div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{fmt(report.totalExpenses)} {cur}</div>
                    </div>
                  </div>
                </div>
              </>) : (
                <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 14, padding: 40, textAlign: "center" as const, color: "var(--text3)" }}>No reports available yet.</div>
              )}
            </>)}

            {/* EXPENSES */}
            {activePage === "expenses" && (<>
              <div style={{ fontFamily: "var(--fd)", fontSize: 28, marginBottom: 6 }}>Expenses</div>
              <div style={{ fontSize: 14, color: "var(--text2)", marginBottom: 32 }}>Recent charges to your property account</div>
              <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
                {expenses.map((e, i) => (
                  <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: i < expenses.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, background: "var(--accent-s)" }}>↑</div>
                      <div>
                        <div style={{ fontSize: 13, color: "var(--text2)" }}>{e.description || "Expense"}</div>
                        <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{e.category} · {e.date ? new Date(e.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}{e.receiptUrl ? <> · <a href={e.receiptUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--teal-l)", textDecoration: "none" }}>Receipt</a></> : ""}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: "var(--red)" }}>{fmt(e.amount)} {cur}</div>
                  </div>
                ))}
                {expenses.length === 0 && <div style={{ padding: 40, textAlign: "center" as const, color: "var(--text3)" }}>No expenses recorded yet.</div>}
              </div>
            </>)}

            {/* DEPOSITS */}
            {activePage === "deposits" && (<>
              <div style={{ fontFamily: "var(--fd)", fontSize: 28, marginBottom: 6 }}>Deposits</div>
              <div style={{ fontSize: 14, color: "var(--text2)", marginBottom: 32 }}>Funds received into your property account</div>
              <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
                {deposits.map((d, i) => (
                  <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: i < deposits.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, background: "var(--green-s)" }}>↓</div>
                      <div>
                        <div style={{ fontSize: 13, color: "var(--text2)" }}>Owner Deposit</div>
                        <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{d.date ? new Date(d.date + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : ""}{d.notes ? ` · ${d.notes}` : ""}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: "var(--green)" }}>+{fmt(d.amount)} {cur}</div>
                  </div>
                ))}
                {deposits.length === 0 && <div style={{ padding: 40, textAlign: "center" as const, color: "var(--text3)" }}>No deposits recorded yet.</div>}
              </div>
            </>)}
          </div>

          {/* Footer */}
          <div style={{ padding: "20px 40px", borderTop: "1px solid var(--border)", textAlign: "center" as const, fontSize: 11, color: "var(--text3)" }}>
            Powered by Cape PM OS · Axvia Solutions
          </div>
        </div>
      </div>
    </div>
  );
}