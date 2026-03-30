"use client";

import { useEffect, useState } from "react";
import { useUser, UserButton } from "@clerk/nextjs";

type Report = {
  id: string; month: string; status: string; startingBalance: number;
  totalExpenses: number; totalDeposits: number; finalBalance: number;
  exchangeRate: number;
  categories: { cleaningSupplies: number; groceries: number; maintenance: number; miscellaneous: number; utilities: number; villaStaff: number };
};
type Expense = { id: string; description: string; amount: number; category: string; date: string; receiptUrl: string; monthYear: string };
type Deposit = { id: string; amount: number; date: string; notes: string; monthYear: string };

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
  const [ytdByCategory, setYtdByCategory] = useState<Record<string, number>>({});
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
          setYtdByCategory(d.ytdByCategory || {});
        }
        setLoading(false);
      })
      .catch(() => { setError("Failed to load data"); setLoading(false); });
  }, [linkedProperty]);

  function fmt(val: number): string {
    const abs = Math.abs(val);
    return `$${abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function fmtDate(dateStr: string): string {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr + "T12:00:00");
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch { return dateStr; }
  }

  const cur = property?.currency || "USD";
  const report = reports[currentMonth] || null;
  const isNeg = currentBalance < 0;

  // Filter expenses and deposits for the selected month
  const monthExpenses = report ? expenses.filter(e => e.monthYear === report.month).sort((a, b) => (a.date || "").localeCompare(b.date || "")) : [];
  const monthDeposits = report ? deposits.filter(d => d.monthYear === report.month) : [];

  // Category colors for chart
  const catColors: Record<string, string> = {
    "Villa Staff": "var(--accent)", "Utilities": "var(--blue)", "Maintenance": "var(--orange)",
    "Cleaning Supplies": "var(--teal-l)", "Groceries": "var(--green)", "Miscellaneous": "var(--text3)",
    "Others": "var(--text3)", "Rental Expenses": "var(--red)",
  };

  if (loading) return <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text3)", fontFamily: "'DM Sans', system-ui, sans-serif" }}>Loading your property data...</div>;
  if (!linkedProperty) return <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", color: "var(--text2)", fontFamily: "'DM Sans', system-ui, sans-serif", textAlign: "center" as const, padding: 40 }}><img src="/cape-logo.png" alt="Cape PM" style={{ height: 50, marginBottom: 20, opacity: 0.6 }} /><h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 8 }}>No property linked</h2><p style={{ fontSize: 14, color: "var(--text3)" }}>Contact your property manager to link your property.</p></div>;
  if (error) return <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--red)", fontFamily: "'DM Sans', system-ui, sans-serif" }}>{error}</div>;

  const navItems = [
    { id: "home", icon: "⌂", label: "Home" },
    { id: "financials", icon: "◈", label: "Financials" },
  ];

  // YTD totals for chart
  const ytdEntries = Object.entries(ytdByCategory).filter(([_, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const ytdTotal = ytdEntries.reduce((sum, [_, v]) => sum + v, 0);

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
          <div style={{ padding: "8px 20px", borderTop: "1px solid var(--border)" }}>
            <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} style={{ padding: "5px 14px", borderRadius: 6, border: "1px solid var(--border2)", background: "transparent", color: "var(--text3)", fontSize: 11, cursor: "pointer", fontFamily: "inherit", width: "100%" }}>{theme === "dark" ? "Switch to Light" : "Switch to Dark"}</button>
          </div>
          <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, color: "var(--text3)" }}>{ownerName}</span>
            <UserButton />
          </div>
        </div>

        {/* MAIN */}
        <div style={{ overflowY: "auto" as const }}>
          <div style={{ padding: "32px 40px", maxWidth: 960 }}>
            {/* Page header for Home */}
            {activePage === "home" && (
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 14, color: "var(--text3)", marginBottom: 4 }}>Welcome back,</div>
                <div style={{ fontFamily: "var(--fd)", fontSize: 28, marginBottom: 4 }}>{property?.name}</div>
                <div style={{ fontSize: 14, color: "var(--text2)" }}>{property?.owner} · {cur}</div>
              </div>
            )}
            {/* HOME */}
            {activePage === "home" && (<>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
                <div style={{ padding: 20, background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 14 }}>
                  <div style={{ fontSize: 11, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text3)", marginBottom: 8, fontWeight: 500 }}>Account Balance</div>
                  <div style={{ fontFamily: "var(--fd)", fontSize: 26, color: isNeg ? "var(--red)" : "var(--green)" }}>{isNeg ? "-" : ""}{fmt(currentBalance)}</div>
                  <div style={{ fontSize: 11, marginTop: 6, fontWeight: 500, padding: "2px 8px", borderRadius: 100, display: "inline-flex", color: isNeg ? "var(--red)" : "var(--green)", background: isNeg ? "var(--red-s)" : "var(--green-s)" }}>{isNeg ? "Needs deposit" : "Healthy"}</div>
                </div>
                <div style={{ padding: 20, background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 14 }}>
                  <div style={{ fontSize: 11, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text3)", marginBottom: 8, fontWeight: 500 }}>Reports Available</div>
                  <div style={{ fontFamily: "var(--fd)", fontSize: 26 }}>{reports.length}</div>
                  <div style={{ fontSize: 11, marginTop: 6, fontWeight: 500, padding: "2px 8px", borderRadius: 100, display: "inline-flex", color: "var(--text3)", background: "var(--bg4)" }}>Monthly statements</div>
                </div>
                <div style={{ padding: 20, background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 14 }}>
                  <div style={{ fontSize: 11, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text3)", marginBottom: 8, fontWeight: 500 }}>Currency</div>
                  <div style={{ fontFamily: "var(--fd)", fontSize: 26, color: "var(--accent)" }}>{cur}</div>
                  <div style={{ fontSize: 11, marginTop: 6, fontWeight: 500, padding: "2px 8px", borderRadius: 100, display: "inline-flex", color: "var(--text3)", background: "var(--bg4)" }}>{cur === "USD" ? "US Dollar" : "Mexican Peso"}</div>
                </div>
              </div>

              {/* Recent activity */}
              <div style={{ fontFamily: "var(--fd)", fontSize: 20, marginBottom: 16 }}>Recent activity</div>
              <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 14, padding: 20 }}>
                {expenses.slice(-10).reverse().slice(0, 7).map(e => (
                  <div key={e.id} style={{ display: "flex", gap: 14, padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", marginTop: 6, flexShrink: 0, background: "var(--red)" }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, lineHeight: 1.5 }}>{e.description || e.category} — <span style={{ color: "var(--red)" }}>{fmt(e.amount)} {cur}</span></div>
                      <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 3 }}>{fmtDate(e.date)}</div>
                    </div>
                  </div>
                ))}
                {deposits.slice(0, 3).map(d => (
                  <div key={d.id} style={{ display: "flex", gap: 14, padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", marginTop: 6, flexShrink: 0, background: "var(--green)" }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, lineHeight: 1.5 }}>Deposit received — <span style={{ color: "var(--green)" }}>+{fmt(d.amount)} {cur}</span></div>
                      <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 3 }}>{fmtDate(d.date)}</div>
                    </div>
                  </div>
                ))}
                {expenses.length === 0 && deposits.length === 0 && <div style={{ padding: 20, color: "var(--text3)", textAlign: "center" as const }}>No recent activity.</div>}
              </div>
            </>)}

            {/* FINANCIALS */}
            {activePage === "financials" && (<>
              {/* Header + month selector */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
                <div>
                  <div style={{ fontFamily: "var(--fd)", fontSize: 28, marginBottom: 6 }}>Financial Statement</div>
                  <div style={{ fontSize: 14, color: "var(--text2)" }}>Monthly account summary for {property?.name}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button onClick={() => setCurrentMonth(Math.min(currentMonth + 1, reports.length - 1))} disabled={currentMonth >= reports.length - 1} style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid var(--border2)", background: "transparent", color: currentMonth >= reports.length - 1 ? "var(--text3)" : "var(--text2)", cursor: currentMonth >= reports.length - 1 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, opacity: currentMonth >= reports.length - 1 ? 0.3 : 1 }}>&lsaquo;</button>
                  <div style={{ fontFamily: "var(--fd)", fontSize: 18, minWidth: 160, textAlign: "center" as const }}>{report?.month || "No reports"}</div>
                  <button onClick={() => setCurrentMonth(Math.max(currentMonth - 1, 0))} disabled={currentMonth <= 0} style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid var(--border2)", background: "transparent", color: currentMonth <= 0 ? "var(--text3)" : "var(--text2)", cursor: currentMonth <= 0 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, opacity: currentMonth <= 0 ? 0.3 : 1 }}>&rsaquo;</button>
                </div>
              </div>

              {report ? (<>
                {/* Stat cards */}
                <div style={{ display: "grid", gridTemplateColumns: cur === "USD" ? "repeat(4, 1fr)" : "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
                  <div style={{ padding: 20, background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 14 }}><div style={{ fontSize: 11, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text3)", marginBottom: 8, fontWeight: 500 }}>Deposits</div><div style={{ fontFamily: "var(--fd)", fontSize: 26, color: "var(--teal-l)" }}>{fmt(report.totalDeposits)}</div></div>
                  <div style={{ padding: 20, background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 14 }}><div style={{ fontSize: 11, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text3)", marginBottom: 8, fontWeight: 500 }}>Total Charges</div><div style={{ fontFamily: "var(--fd)", fontSize: 26 }}>{fmt(report.totalExpenses)}</div></div>
                  {cur === "USD" && <div style={{ padding: 20, background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 14 }}><div style={{ fontSize: 11, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text3)", marginBottom: 8, fontWeight: 500 }}>Exchange Rate</div><div style={{ fontFamily: "var(--fd)", fontSize: 26 }}>{report.exchangeRate > 0 ? report.exchangeRate.toFixed(2) : "—"}</div></div>}
                  <div style={{ padding: 20, background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 14 }}><div style={{ fontSize: 11, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text3)", marginBottom: 8, fontWeight: 500 }}>Final Balance</div><div style={{ fontFamily: "var(--fd)", fontSize: 26, color: report.finalBalance < 0 ? "var(--red)" : "var(--green)" }}>{report.finalBalance < 0 ? "-" : ""}{fmt(report.finalBalance)}</div></div>
                </div>

                {/* Account Summary */}
                <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 14, marginBottom: 20, overflow: "hidden" }}>
                  <div style={{ padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>Account Summary</span>
                    <span style={{ padding: "4px 10px", borderRadius: 100, fontSize: 11, fontWeight: 600, background: "var(--teal-s)", color: "var(--teal-l)" }}>{(report.month || "").split(" ")[0]}</span>
                  </div>
                  <div style={{ padding: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}><div style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, background: "var(--green-s)" }}>↓</div><div style={{ fontSize: 13, color: "var(--text2)" }}>Starting Balance</div></div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{fmt(report.startingBalance)} {cur}</div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}><div style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, background: "var(--teal-s)" }}>↓</div><div style={{ fontSize: 13, color: "var(--text2)" }}>Owner Deposits</div></div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: "var(--green)" }}>+{fmt(report.totalDeposits)} {cur}</div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}><div style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, background: "var(--accent-s)" }}>↑</div><div><div style={{ fontSize: 13, color: "var(--text2)" }}>Total Operating Expenses</div><div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{monthExpenses.length} line items</div></div></div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: "var(--red)" }}>-{fmt(report.totalExpenses)} {cur}</div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0 4px", borderTop: "2px solid var(--border2)", marginTop: 4 }}>
                      <div><div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Ending Balance</div><div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>Carried forward</div></div>
                      <div style={{ fontSize: 18, fontWeight: 500, fontFamily: "var(--fd)", color: report.finalBalance < 0 ? "var(--red)" : "var(--green)" }}>{report.finalBalance < 0 ? "-" : ""}{fmt(report.finalBalance)} {cur}</div>
                    </div>
                  </div>
                </div>

                {/* Expense Statement (individual line items) */}
                <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 14, marginBottom: 20, overflow: "hidden" }}>
                  <div style={{ padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>Expenses</span>
                    <span style={{ padding: "4px 10px", borderRadius: 100, fontSize: 11, fontWeight: 600, background: "var(--accent-s)", color: "var(--accent)" }}>{monthExpenses.length} items</span>
                  </div>
                  <div style={{ padding: "0 20px" }}>
                    {/* Table header */}
                    <div style={{ display: "grid", gridTemplateColumns: "90px 1fr 100px 120px 60px", padding: "12px 0", borderBottom: "2px solid var(--border2)" }}>
                      <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: "var(--text3)" }}>Date</div>
                      <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: "var(--text3)" }}>Description</div>
                      <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: "var(--text3)", textAlign: "right" as const }}>Amount</div>
                      <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: "var(--text3)", textAlign: "center" as const }}>Category</div>
                      <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: "var(--text3)", textAlign: "center" as const }}>Receipt</div>
                    </div>
                    {/* Expense rows */}
                    {monthExpenses.map((e, i) => (
                      <div key={e.id} style={{ display: "grid", gridTemplateColumns: "90px 1fr 100px 120px 60px", padding: "10px 0", borderBottom: i < monthExpenses.length - 1 ? "1px solid var(--border)" : "none", alignItems: "center" }}>
                        <div style={{ fontSize: 12, color: "var(--text3)" }}>{fmtDate(e.date)}</div>
                        <div style={{ fontSize: 13, color: "var(--text)" }}>{e.description || "Expense"}</div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", textAlign: "right" as const }}>{fmt(e.amount)}</div>
                        <div style={{ textAlign: "center" as const }}><span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "var(--bg4)", color: "var(--text3)", whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis", maxWidth: 110, display: "inline-block" }}>{e.category}</span></div>
                        <div style={{ textAlign: "center" as const }}>{e.receiptUrl ? <a href={e.receiptUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--teal-l)", textDecoration: "none", fontSize: 11, fontWeight: 500 }}>View</a> : <span style={{ fontSize: 11, color: "var(--text3)" }}>-</span>}</div>
                      </div>
                    ))}
                    {monthExpenses.length === 0 && <div style={{ padding: "20px 0", color: "var(--text3)", fontSize: 13, textAlign: "center" as const }}>No expenses for this month.</div>}
                    {/* Total row */}
                    {monthExpenses.length > 0 && (
                      <div style={{ display: "grid", gridTemplateColumns: "90px 1fr 100px 120px 60px", padding: "12px 0", borderTop: "2px solid var(--border2)", marginTop: 4 }}>
                        <div />
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Total</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", textAlign: "right" as const }}>{fmt(report.totalExpenses)}</div>
                        <div /><div />
                      </div>
                    )}
                  </div>
                </div>

                {/* Deposits for this month */}
                {monthDeposits.length > 0 && (
                  <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 14, marginBottom: 20, overflow: "hidden" }}>
                    <div style={{ padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)" }}>
                      <span style={{ fontSize: 14, fontWeight: 500 }}>Deposits</span>
                      <span style={{ padding: "4px 10px", borderRadius: 100, fontSize: 11, fontWeight: 600, background: "var(--green-s)", color: "var(--green)" }}>{monthDeposits.length}</span>
                    </div>
                    <div style={{ padding: 20 }}>
                      {monthDeposits.map((d, i) => (
                        <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < monthDeposits.length - 1 ? "1px solid var(--border)" : "none" }}>
                          <div style={{ fontSize: 13, color: "var(--text2)" }}>{fmtDate(d.date)}{d.notes ? ` — ${d.notes}` : ""}</div>
                          <div style={{ fontSize: 14, fontWeight: 500, color: "var(--green)" }}>+{fmt(d.amount)} {cur}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Category Breakdown (bar chart) */}
                {report.categories && (
                  <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 14, marginBottom: 20, overflow: "hidden" }}>
                    <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--border)" }}>
                      <span style={{ fontSize: 14, fontWeight: 500 }}>Expense by Category</span>
                    </div>
                    <div style={{ padding: 20 }}>
                      {[
                        { name: "Villa Staff", val: report.categories.villaStaff },
                        { name: "Utilities", val: report.categories.utilities },
                        { name: "Maintenance", val: report.categories.maintenance },
                        { name: "Cleaning Supplies", val: report.categories.cleaningSupplies },
                        { name: "Groceries", val: report.categories.groceries },
                        { name: "Miscellaneous", val: report.categories.miscellaneous },
                      ].filter(c => c.val > 0).map(c => {
                        const pct = report.totalExpenses > 0 ? (c.val / report.totalExpenses) * 100 : 0;
                        return (
                          <div key={c.name} style={{ marginBottom: 14 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
                              <span style={{ color: "var(--text2)" }}>{c.name}</span>
                              <span style={{ color: "var(--text3)" }}>{fmt(c.val)} ({pct.toFixed(0)}%)</span>
                            </div>
                            <div style={{ height: 8, background: "var(--bg)", borderRadius: 4, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${pct}%`, borderRadius: 4, background: catColors[c.name] || "var(--text3)", transition: "width 0.5s" }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* YTD Category Rollup */}
                {ytdEntries.length > 0 && (
                  <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 14, marginBottom: 20, overflow: "hidden" }}>
                    <div style={{ padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)" }}>
                      <span style={{ fontSize: 14, fontWeight: 500 }}>Year-to-Date Spending</span>
                      <span style={{ padding: "4px 10px", borderRadius: 100, fontSize: 11, fontWeight: 600, background: "var(--accent-s)", color: "var(--accent)" }}>{new Date().getFullYear()}</span>
                    </div>
                    <div style={{ padding: 20 }}>
                      <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 16 }}>Total YTD: {fmt(ytdTotal)} {cur}</div>
                      {ytdEntries.map(([cat, val]) => {
                        const pct = ytdTotal > 0 ? (val / ytdTotal) * 100 : 0;
                        return (
                          <div key={cat} style={{ marginBottom: 14 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
                              <span style={{ color: "var(--text2)" }}>{cat}</span>
                              <span style={{ color: "var(--text3)" }}>{fmt(val)} ({pct.toFixed(0)}%)</span>
                            </div>
                            <div style={{ height: 8, background: "var(--bg)", borderRadius: 4, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${pct}%`, borderRadius: 4, background: catColors[cat] || "var(--text3)", transition: "width 0.5s" }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Balance History */}
                {reports.length > 1 && (
                  <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
                    <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--border)" }}>
                      <span style={{ fontSize: 14, fontWeight: 500 }}>Balance History</span>
                    </div>
                    <div style={{ padding: "0 20px" }}>
                      {reports.map((r, i) => {
                        const neg = r.finalBalance < 0;
                        return (
                          <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: i < reports.length - 1 ? "1px solid var(--border)" : "none" }}>
                            <span style={{ fontSize: 13, color: "var(--text2)" }}>{r.month}</span>
                            <span style={{ fontSize: 13, fontWeight: 500, color: neg ? "var(--red)" : "var(--green)" }}>{neg ? "-" : ""}{fmt(r.finalBalance)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>) : (
                <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 14, padding: 40, textAlign: "center" as const, color: "var(--text3)" }}>No reports available yet. Reports will appear here once your property manager publishes them.</div>
              )}
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