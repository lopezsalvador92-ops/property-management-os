"use client";

import { useEffect, useState } from "react";

type Property = { id: string; name: string; owner: string; status: string; currency: string; pmFee: number };
type Expense = { id: string; receiptNo: string; date: string; category: string; supplier: string; house: string; total: number; currency: string; description: string; receiptUrl: string; owner: string };
type Deposit = { id: string; date: string; house: string; houseId: string; owner: string; currency: string; amount: number; notes: string; month: string };
type Report = { id: string; reportName: string; house: string; houseId: string; owner: string; month: string; status: string; chargeStatus: string; currency: string; exchangeRate: number; startingBalance: number; totalExpenses: number; totalDeposits: number; finalBalance: number; categories: { cleaningSupplies: number; groceries: number; maintenance: number; miscellaneous: number; utilities: number; villaStaff: number } };
type Balance = { house: string; houseId: string; month: string; status: string; currency: string; startingBalance: number; totalDeposits: number; totalExpenses: number; finalBalance: number };
type ReportStatus = { pending: number; reviewed: number; sent: number; total: number; month: string };

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
  { id: "dashboard", icon: "◈", label: "Dashboard" },
  { id: "expenses", icon: "⎙", label: "Expenses" },
  { id: "housekeeping", icon: "⌂", label: "Housekeeping", badge: "3" },
  { id: "deposits", icon: "↓", label: "Deposits" },
  { id: "reports", icon: "↗", label: "Reports" },
  { id: "properties", icon: "▦", label: "Properties" },
  { id: "users", icon: "◌", label: "Users" },
];

function getMonthOptions(): { label: string; value: string }[] {
  const o: { label: string; value: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 24; i++) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); o.push({ label: d.toLocaleDateString("en-US", { month: "long", year: "numeric" }), value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` }); }
  return o;
}

function fmtCur(amount: number, currency: string) {
  return `${currency} $${Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(dateStr: string) {
  if (!dateStr) return "";
  try { const d = new Date(dateStr + "T12:00:00"); return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); } catch { return dateStr; }
}

const card: React.CSSProperties = { padding: 20, background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 14 };
const lbl: React.CSSProperties = { fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text3)", marginBottom: 8, fontWeight: 500, display: "block" };
const h1s: React.CSSProperties = { fontFamily: "'Georgia', serif", fontSize: 28, fontWeight: 400, marginBottom: 6 };
const h2s: React.CSSProperties = { fontFamily: "'Georgia', serif", fontSize: 20, fontWeight: 400, marginBottom: 16 };
const sel: React.CSSProperties = { padding: "9px 36px 9px 14px", background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: 8, color: "var(--text)", fontFamily: "inherit", fontSize: 13, outline: "none", cursor: "pointer", appearance: "none", backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' fill=\'%23888\'%3E%3Cpath d=\'M1 3l4 4 4-4\'/%3E%3C/svg%3E")', backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" };
const inp: React.CSSProperties = { width: "100%", padding: "10px 14px", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontFamily: "inherit", fontSize: 14, outline: "none" };

export default function AdminDashboard() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [reportStatus, setReportStatus] = useState<ReportStatus>({ pending: 0, reviewed: 0, sent: 0, total: 0, month: "" });
  const [loading, setLoading] = useState(true);
  const [expLoading, setExpLoading] = useState(false);
  const [depLoading, setDepLoading] = useState(false);
  const [expFilter, setExpFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [activePage, setActivePage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [depProperty, setDepProperty] = useState("");
  const [depAmount, setDepAmount] = useState("");
  const [depDate, setDepDate] = useState(new Date().toISOString().split("T")[0]);
  const [depNotes, setDepNotes] = useState("");
  const [depSubmitting, setDepSubmitting] = useState(false);
  const [depSuccess, setDepSuccess] = useState(false);

  const [reports, setReports] = useState<Report[]>([]);
  const [repLoading, setRepLoading] = useState(false);
  const [repMonth, setRepMonth] = useState(new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }));
  const [repUpdating, setRepUpdating] = useState<string | null>(null);

  const [previewId, setPreviewId] = useState<string | null>(null);

  function monthToFilterValue(monthStr: string): string {
    const parts = monthStr.split(" ");
    if (parts.length < 2) return "all";
    const months: Record<string, string> = { January: "01", February: "02", March: "03", April: "04", May: "05", June: "06", July: "07", August: "08", September: "09", October: "10", November: "11", December: "12" };
    return `${parts[1]}-${months[parts[0]] || "01"}`;
  }

  async function updateExchangeRate(recordId: string, rate: string) {
    try {
      await fetch("/api/reports", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "updateExchangeRate", recordId, exchangeRate: rate }) });
    } catch (e) { console.error(e); }
  }

  const monthOptions = getMonthOptions();

  const repMonthOptions = (() => {
    const o: string[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      o.push(d.toLocaleDateString("en-US", { month: "long", year: "numeric" }));
    }
    return o;
  })();

  useEffect(() => { fetch("/api/properties").then(r => r.json()).then(d => { setProperties(d.properties || []); setLoading(false); }).catch(() => setLoading(false)); }, []);

  useEffect(() => {
    if (activePage === "expenses") {
      setExpLoading(true);
      fetch(expFilter === "all" ? "/api/expenses" : `/api/expenses?house=${encodeURIComponent(expFilter)}`)
        .then(r => r.json()).then(d => { setExpenses(d.expenses || []); setExpLoading(false); }).catch(() => setExpLoading(false));
    }
  }, [activePage, expFilter]);

  useEffect(() => {
    if (activePage === "deposits" || activePage === "dashboard") {
      if (deposits.length === 0) { setDepLoading(true); fetch("/api/deposits").then(r => r.json()).then(d => { setDeposits(d.deposits || []); setDepLoading(false); }).catch(() => setDepLoading(false)); }
      fetch("/api/balances").then(r => r.json()).then(d => { setBalances(d.balances || []); if (d.reportStatus) setReportStatus(d.reportStatus); });
    }
  }, [activePage]);

  useEffect(() => {
    if (activePage === "reports") {
      setRepLoading(true);
      fetch(`/api/reports?month=${encodeURIComponent(repMonth)}`)
        .then(r => r.json())
        .then(d => { setReports(d.reports || []); setRepLoading(false); })
        .catch(() => setRepLoading(false));
    }
  }, [activePage, repMonth]);

  async function updateReports(action: string, ids: string[]) {
    setRepUpdating(action);
    try {
      const res = await fetch("/api/reports", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, recordIds: ids }) });
      if (res.ok) {
        fetch(`/api/reports?month=${encodeURIComponent(repMonth)}`).then(r => r.json()).then(d => setReports(d.reports || []));
      }
    } catch (e) { console.error(e); }
    setRepUpdating(null);
  }

  const active = properties.filter(p => p.status === "Active");
  const filteredExpenses = monthFilter === "all" ? expenses : expenses.filter(e => e.date && e.date.startsWith(monthFilter));
  const negativeBalances = balances.filter(b => b.finalBalance < 0);
  const sidebarWidth = sidebarOpen ? 260 : 72;

  // Properties with no deposit this month
  const currentMonth = new Date().toISOString().slice(0, 7);
  const propertiesWithDeposit = new Set(deposits.filter(d => d.date && d.date.startsWith(currentMonth)).map(d => d.house));
  const propertiesNoDeposit = active.filter(p => !propertiesWithDeposit.has(p.name));

  // Recent activity: combine deposits and expenses
  const recentActivity = [
    ...deposits.slice(0, 8).map(d => ({ type: "deposit" as const, date: d.date, house: d.house, owner: d.owner, detail: `${d.currency} $${d.amount.toLocaleString()} deposit received`, notes: d.notes })),
    ...expenses.slice(0, 8).map(e => ({ type: "expense" as const, date: e.date, house: e.house, owner: e.owner, detail: `${e.currency} $${e.total.toLocaleString()} — ${e.supplier}`, notes: e.category })),
  ].sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 10);

  async function submitDeposit() {
    if (!depProperty || !depAmount || !depDate) return;
    setDepSubmitting(true);
    try {
      const res = await fetch("/api/deposits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ houseId: depProperty, amount: depAmount, date: depDate, notes: depNotes }) });
      if (res.ok) {
        setDepSuccess(true); setDepProperty(""); setDepAmount(""); setDepNotes("");
        setTimeout(() => setDepSuccess(false), 3000);
        fetch("/api/deposits").then(r => r.json()).then(d => setDeposits(d.deposits || []));
        fetch("/api/balances").then(r => r.json()).then(d => { setBalances(d.balances || []); if (d.reportStatus) setReportStatus(d.reportStatus); });
      }
    } catch (e) { console.error(e); }
    setDepSubmitting(false);
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: `${sidebarWidth}px 1fr`, minHeight: "100vh", transition: "grid-template-columns 0.2s ease" }}>

      {/* SIDEBAR */}
      <div style={{ background: "var(--bg2)", borderRight: "1px solid var(--border)", height: "100vh", position: "sticky" as const, top: 0, display: "flex", flexDirection: "column" as const, overflow: "hidden", transition: "width 0.2s ease", width: sidebarWidth }}>
        <div style={{ padding: sidebarOpen ? "24px 20px 20px" : "24px 12px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12, minHeight: 78 }}>
          <svg width="28" height="30" viewBox="0 0 54 58" fill="none" style={{ flexShrink: 0 }}><defs><linearGradient id="lg1" x1="27" y1="0" x2="27" y2="36"><stop offset="0%" stopColor="#1A2E4A" /><stop offset="100%" stopColor="#2A6B7C" /></linearGradient><linearGradient id="lg2" x1="27" y1="16" x2="27" y2="46"><stop offset="0%" stopColor="#2A6B7C" /><stop offset="100%" stopColor="#3A9BAA" /></linearGradient><linearGradient id="lg3" x1="27" y1="32" x2="27" y2="56"><stop offset="0%" stopColor="#3A9BAA" /><stop offset="100%" stopColor="#5CC4C9" /></linearGradient></defs><path d="M27 2L50 42H4L27 2Z" fill="url(#lg1)" opacity=".92" /><path d="M27 18L44 48H10L27 18Z" fill="url(#lg2)" opacity=".88" /><path d="M27 32L38 54H16L27 32Z" fill="url(#lg3)" opacity=".95" /></svg>
          {sidebarOpen && <div><div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "var(--text2)" }}>Cape PM</div><div style={{ fontSize: 10, color: "var(--text3)" }}>Admin Panel</div></div>}
        </div>
        <div style={{ padding: sidebarOpen ? "16px 12px 8px" : "16px 8px 8px", flex: 1 }}>
          {sidebarOpen && <div style={{ fontSize: 10, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "var(--text3)", padding: "0 12px 8px", fontWeight: 600 }}>Management</div>}
          {navItems.map(item => (
            <div key={item.id} onClick={() => setActivePage(item.id)} title={sidebarOpen ? undefined : item.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: sidebarOpen ? "10px 12px" : "10px 0", justifyContent: sidebarOpen ? "flex-start" : "center", borderRadius: 8, fontSize: 13, cursor: "pointer", position: "relative" as const, transition: "all 0.15s", userSelect: "none" as const, color: activePage === item.id ? "var(--accent)" : "var(--text2)", background: activePage === item.id ? "var(--accent-s)" : "transparent" }}>
              <span style={{ width: 18, textAlign: "center" as const, fontSize: 14, opacity: activePage === item.id ? 1 : 0.6, flexShrink: 0 }}>{item.icon}</span>
              {sidebarOpen && item.label}
              {item.badge && sidebarOpen && <span style={{ position: "absolute" as const, right: 12, minWidth: 18, height: 18, borderRadius: "50%", background: "var(--red)", color: "#fff", fontSize: 10, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>{item.badge}</span>}
            </div>
          ))}
        </div>
        <div onClick={() => setSidebarOpen(!sidebarOpen)} style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", fontSize: 12, color: "var(--text3)", cursor: "pointer", textAlign: sidebarOpen ? "right" as const : "center" as const }}>{sidebarOpen ? "◀ Collapse" : "▶"}</div>
        {sidebarOpen && <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", fontSize: 11, color: "var(--text3)" }}>Sofia · Admin</div>}
      </div>

      {/* MAIN */}
      <main style={{ overflow: "auto", minWidth: 0 }}>

        {/* ====== DASHBOARD ====== */}
        {activePage === "dashboard" && (
          <div style={{ padding: "32px 40px" }}>
            <h1 style={h1s}>Portfolio Dashboard</h1>
            <p style={{ fontSize: 14, color: "var(--text2)", marginBottom: 28 }}>{loading ? "Loading..." : `${reportStatus.month || "March 2026"} · ${active.length} active properties`}</p>

            {/* ACTION REQUIRED */}
            <h2 style={{ ...h2s, marginBottom: 12 }}>Action required</h2>
            <div style={{ display: "grid", gap: 10, marginBottom: 32 }}>

              {/* Reports pending */}
              {reportStatus.pending > 0 && (
                <div onClick={() => setActivePage("reports")} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 20px", background: "var(--accent-s)", border: "1px solid rgba(201,169,110,0.15)", borderRadius: 10, cursor: "pointer" }}>
                  <span style={{ fontSize: 18 }}>↗</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{reportStatus.pending} monthly {reportStatus.pending === 1 ? "report" : "reports"} pending</div>
                    <div style={{ fontSize: 12, color: "var(--text3)" }}>{reportStatus.sent} of {reportStatus.total} sent for {reportStatus.month}</div>
                  </div>
                  <span style={{ fontSize: 12, color: "var(--text3)" }}>View reports →</span>
                </div>
              )}

              {/* Negative balances */}
              {negativeBalances.length > 0 && (
                <div onClick={() => setActivePage("deposits")} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 20px", background: "var(--red-s)", border: "1px solid rgba(207,110,110,0.15)", borderRadius: 10, cursor: "pointer" }}>
                  <span style={{ fontSize: 18 }}>⚠</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: "var(--red)" }}>{negativeBalances.length} {negativeBalances.length === 1 ? "property has" : "properties have"} a negative balance</div>
                    <div style={{ fontSize: 12, color: "var(--text3)" }}>{negativeBalances.map(b => b.house).join(", ")}</div>
                  </div>
                  <span style={{ fontSize: 12, color: "var(--text3)" }}>View deposits →</span>
                </div>
              )}

              {/* No deposit this month */}
              {propertiesNoDeposit.length > 0 && (
                <div onClick={() => setActivePage("deposits")} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 20px", background: "var(--orange-s)", border: "1px solid rgba(207,149,110,0.12)", borderRadius: 10, cursor: "pointer" }}>
                  <span style={{ fontSize: 18 }}>↓</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{propertiesNoDeposit.length} {propertiesNoDeposit.length === 1 ? "property hasn't" : "properties haven't"} deposited this month</div>
                    <div style={{ fontSize: 12, color: "var(--text3)" }}>{propertiesNoDeposit.slice(0, 5).map(p => p.name).join(", ")}{propertiesNoDeposit.length > 5 ? ` +${propertiesNoDeposit.length - 5} more` : ""}</div>
                  </div>
                  <span style={{ fontSize: 12, color: "var(--text3)" }}>View deposits →</span>
                </div>
              )}

              {/* HSK placeholder */}
              <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 20px", background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 10, opacity: 0.5 }}>
                <span style={{ fontSize: 18 }}>⌂</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>Housekeeping log approvals</div>
                  <div style={{ fontSize: 12, color: "var(--text3)" }}>Coming soon — this will show pending HSK logs</div>
                </div>
              </div>

              {/* All clear */}
              {negativeBalances.length === 0 && reportStatus.pending === 0 && propertiesNoDeposit.length === 0 && (
                <div style={{ padding: "14px 20px", background: "var(--green-s)", border: "1px solid rgba(110,207,151,0.15)", borderRadius: 10 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "var(--green)" }}>✓ All clear — no action items right now</div>
                </div>
              )}
            </div>

            {/* FINANCIAL PULSE */}
            <h2 style={h2s}>Financial pulse, by property</h2>
            <div style={{ ...card, padding: 0, marginBottom: 32 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 130px 120px 120px 140px", padding: "10px 20px", borderBottom: "2px solid var(--border2)" }}>
                <div style={{ fontSize: 10, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text3)", fontWeight: 600 }}>Property</div>
                <div style={{ fontSize: 10, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text3)", fontWeight: 600, textAlign: "right" as const }}>Starting Bal.</div>
                <div style={{ fontSize: 10, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text3)", fontWeight: 600, textAlign: "right" as const }}>Expenses</div>
                <div style={{ fontSize: 10, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text3)", fontWeight: 600, textAlign: "right" as const }}>Deposits</div>
                <div style={{ fontSize: 10, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text3)", fontWeight: 600, textAlign: "right" as const }}>Final Bal.</div>
              </div>
              {balances.map((b, i) => {
                const isNeg = b.finalBalance < 0;
                return (
                  <div key={`fp-${b.houseId}-${i}`} style={{ display: "grid", gridTemplateColumns: "1fr 130px 120px 120px 140px", padding: "12px 20px", borderBottom: i < balances.length - 1 ? "1px solid var(--border)" : "none", cursor: "pointer" }}
                    onClick={() => { setExpFilter(b.house); setActivePage("expenses"); }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{b.house}</div>
                      <div style={{ fontSize: 11, color: "var(--text3)" }}>{b.month}</div>
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text2)", textAlign: "right" as const }}>{fmtCur(b.startingBalance, b.currency)}</div>
                    <div style={{ fontSize: 13, color: "var(--red)", textAlign: "right" as const }}>${b.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                    <div style={{ fontSize: 13, color: "var(--green)", textAlign: "right" as const }}>${b.totalDeposits.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, textAlign: "right" as const, color: isNeg ? "var(--red)" : "var(--green)" }}>{isNeg ? "-" : ""}{fmtCur(b.finalBalance, b.currency)}</div>
                  </div>
                );
              })}
            </div>

            {/* RECENT ACTIVITY */}
            <h2 style={h2s}>Recent activity</h2>
            <div style={{ ...card, padding: 0 }}>
              {recentActivity.length === 0 && <div style={{ padding: 20, color: "var(--text3)", fontSize: 13 }}>Loading activity...</div>}
              {recentActivity.map((a, i) => (
                <div key={`act-${i}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: i < recentActivity.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <span style={{ fontSize: 13, width: 20, textAlign: "center" as const, color: a.type === "deposit" ? "var(--green)" : "var(--text3)" }}>{a.type === "deposit" ? "↓" : "⎙"}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13 }}><strong>{a.house}</strong> — {a.detail}</div>
                    <div style={{ fontSize: 11, color: "var(--text3)" }}>{fmtDate(a.date)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ====== EXPENSES ====== */}
        {activePage === "expenses" && (
          <div style={{ padding: "32px 32px 32px 40px" }}>
            <div style={{ marginBottom: 24 }}>
              <h1 style={h1s}>Expenses</h1>
              <p style={{ fontSize: 14, color: "var(--text2)" }}>
                {expLoading ? "Loading..." : `${filteredExpenses.length} records`}
                {expFilter !== "all" ? ` · ${expFilter}` : ""}
                {monthFilter !== "all" ? ` · ${monthOptions.find(m => m.value === monthFilter)?.label}` : ""}
              </p>
            </div>
            <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center", flexWrap: "wrap" as const }}>
              <select value={expFilter} onChange={e => setExpFilter(e.target.value)} style={{ ...sel, minWidth: 200 }}><option value="all">All properties</option>{active.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}</select>
              <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)} style={{ ...sel, minWidth: 180 }}><option value="all">All months</option>{monthOptions.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}</select>
              {(expFilter !== "all" || monthFilter !== "all") && <span onClick={() => { setExpFilter("all"); setMonthFilter("all"); }} style={{ fontSize: 12, color: "var(--teal-l)", cursor: "pointer", padding: "9px 0" }}>Clear filters</span>}
            </div>
            <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" as const, overflowY: "auto" as const, maxHeight: "calc(100vh - 220px)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" as const }}>
                  <thead><tr>{["Date", "Receipt #", "Property", "Category", "Supplier", "Description", "Amount", "Cur", "Receipt"].map(h => (<th key={h} style={{ textAlign: "left" as const, padding: "12px 14px", fontSize: 10, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text3)", fontWeight: 600, borderBottom: "2px solid var(--border2)", position: "sticky" as const, top: 0, background: "var(--bg3)", whiteSpace: "nowrap" as const, zIndex: 1 }}>{h}</th>))}</tr></thead>
                  <tbody>
                    {filteredExpenses.length === 0 && !expLoading && <tr><td colSpan={9} style={{ padding: "40px 14px", textAlign: "center" as const, color: "var(--text3)", fontSize: 14 }}>No expenses found.</td></tr>}
                    {filteredExpenses.map(e => { const cc = catColors[e.category] || { bg: "var(--bg2)", text: "var(--text2)" }; return (<tr key={e.id} onMouseEnter={ev => (ev.currentTarget.style.background = "rgba(255,255,255,0.02)")} onMouseLeave={ev => (ev.currentTarget.style.background = "transparent")}><td style={{ padding: "11px 14px", fontSize: 13, borderBottom: "1px solid var(--border)", color: "var(--text2)", whiteSpace: "nowrap" as const }}>{e.date}</td><td style={{ padding: "11px 14px", fontSize: 11, borderBottom: "1px solid var(--border)", color: "var(--text3)", whiteSpace: "nowrap" as const, fontFamily: "monospace" }}>{e.receiptNo}</td><td style={{ padding: "11px 14px", fontSize: 13, borderBottom: "1px solid var(--border)", color: "var(--text)", fontWeight: 500, whiteSpace: "nowrap" as const }}>{e.house}</td><td style={{ padding: "11px 14px", fontSize: 13, borderBottom: "1px solid var(--border)" }}><span style={{ display: "inline-block", padding: "3px 12px", borderRadius: 100, fontSize: 11, fontWeight: 500, background: cc.bg, color: cc.text, whiteSpace: "nowrap" as const }}>{e.category}</span></td><td style={{ padding: "11px 14px", fontSize: 13, borderBottom: "1px solid var(--border)", color: "var(--text2)", whiteSpace: "nowrap" as const }}>{e.supplier}</td><td style={{ padding: "11px 14px", fontSize: 13, borderBottom: "1px solid var(--border)", color: "var(--text2)", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }} title={e.description}>{e.description}</td><td style={{ padding: "11px 14px", fontSize: 13, borderBottom: "1px solid var(--border)", color: "var(--text)", fontWeight: 500, whiteSpace: "nowrap" as const, textAlign: "right" as const }}>${e.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td><td style={{ padding: "11px 14px", fontSize: 13, borderBottom: "1px solid var(--border)" }}><span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 100, background: e.currency === "USD" ? "var(--blue-s)" : "var(--teal-s)", color: e.currency === "USD" ? "var(--blue)" : "var(--teal-l)" }}>{e.currency}</span></td><td style={{ padding: "11px 14px", fontSize: 13, borderBottom: "1px solid var(--border)" }}>{e.receiptUrl && <a href={e.receiptUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--teal-l)", textDecoration: "none", fontSize: 12, fontWeight: 500 }}>View</a>}</td></tr>); })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ====== DEPOSITS ====== */}
        {activePage === "deposits" && (
          <div style={{ padding: "32px 40px", maxWidth: 900 }}>
            <h1 style={h1s}>Deposits</h1>
            <p style={{ fontSize: 14, color: "var(--text2)", marginBottom: 28 }}>Log owner deposits and track account balances</p>

            <div style={{ ...card, marginBottom: 28 }}>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 20 }}>Record a new deposit</div>
              {depSuccess && (<div style={{ padding: "10px 16px", background: "var(--green-s)", border: "1px solid rgba(110,207,151,0.2)", borderRadius: 8, marginBottom: 16, fontSize: 13, color: "var(--green)" }}>✓ Deposit recorded and synced to Airtable!</div>)}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div><label style={lbl}>Property</label><select value={depProperty} onChange={e => setDepProperty(e.target.value)} style={{ ...inp, appearance: "none" as const }}><option value="">Select property...</option>{active.map(p => <option key={p.id} value={p.id}>{p.name} — {p.owner}</option>)}</select></div>
                <div><label style={lbl}>Amount</label><input type="number" value={depAmount} onChange={e => setDepAmount(e.target.value)} placeholder="$0.00" style={inp} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div><label style={lbl}>Date received</label><input type="date" value={depDate} onChange={e => setDepDate(e.target.value)} style={inp} /></div>
                <div><label style={lbl}>Notes</label><input type="text" value={depNotes} onChange={e => setDepNotes(e.target.value)} placeholder="e.g. Wire transfer, check #..." style={inp} /></div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button onClick={submitDeposit} disabled={depSubmitting || !depProperty || !depAmount} style={{ padding: "10px 24px", borderRadius: 100, border: "none", background: (!depProperty || !depAmount) ? "var(--bg2)" : "linear-gradient(135deg, var(--teal), #2A6B7C)", color: (!depProperty || !depAmount) ? "var(--text3)" : "#fff", fontSize: 13, fontWeight: 600, cursor: (!depProperty || !depAmount) ? "default" : "pointer", fontFamily: "inherit" }}>{depSubmitting ? "Recording..." : "Record Deposit"}</button>
              </div>
            </div>

            <h2 style={h2s}>Recent deposits</h2>
            <div style={{ ...card, marginBottom: 28, padding: 0 }}>
              {depLoading && <div style={{ padding: 20, color: "var(--text3)", fontSize: 13 }}>Loading...</div>}
              {deposits.slice(0, 15).map((d, i) => (
                <div key={`dep-${d.id}-${i}`} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 20px", borderBottom: i < Math.min(deposits.length, 15) - 1 ? "1px solid var(--border)" : "none" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--green-s)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--green)", fontSize: 14, flexShrink: 0 }}>↓</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, marginBottom: 2 }}>{d.house} — {d.owner}</div>
                    <div style={{ fontSize: 12, color: "var(--text3)" }}>{d.notes || "Deposit"} · {fmtDate(d.date)}</div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "var(--green)", whiteSpace: "nowrap" as const }}>+{d.currency} ${d.amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                </div>
              ))}
            </div>

            <h2 style={h2s}>Account balances</h2>
            <div style={{ ...card, padding: 0 }}>
              {balances.map((b, i) => { const isNeg = b.finalBalance < 0; return (
                <div key={`bal-${b.houseId}-${i}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: i < balances.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <div><div style={{ fontSize: 14, marginBottom: 2 }}>{b.house}</div><div style={{ fontSize: 12, color: "var(--text3)" }}>{b.month}</div></div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: isNeg ? "var(--red)" : "var(--green)" }}>{isNeg ? "-" : ""}{fmtCur(b.finalBalance, b.currency)}</div>
                </div>
              ); })}
            </div>
          </div>
        )}


        {/* ====== REPORTS ====== */}
        {activePage === "reports" && (
          <div style={{ padding: "32px 40px", maxWidth: 960 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
              <div>
                <h1 style={h1s}>Monthly Reports</h1>
                <p style={{ fontSize: 14, color: "var(--text2)" }}>{repLoading ? "Loading..." : `${repMonth} · Review, approve, and send to owners`}</p>
              </div>
              <select value={repMonth} onChange={e => setRepMonth(e.target.value)} style={{ ...sel, minWidth: 180 }}>
                {repMonthOptions.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            {/* Stat cards */}
            {!repLoading && reports.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
                <div style={card}><div style={lbl}>Sent</div><div style={{ fontFamily: "'Georgia', serif", fontSize: 26, color: "var(--green)" }}>{reports.filter(r => r.status === "Sent").length}</div></div>
                <div style={card}><div style={lbl}>Reviewed</div><div style={{ fontFamily: "'Georgia', serif", fontSize: 26, color: "var(--accent)" }}>{reports.filter(r => r.status === "Reviewed").length}</div></div>
                <div style={card}><div style={lbl}>Pending</div><div style={{ fontFamily: "'Georgia', serif", fontSize: 26, color: reports.filter(r => r.status === "Pending").length > 0 ? "var(--red)" : "var(--text)" }}>{reports.filter(r => r.status === "Pending").length}</div></div>
              </div>
            )}

            {/* Bulk actions */}
            <div style={{ display: "flex", gap: 10, marginBottom: 28, flexWrap: "wrap" as const }}>
              {reports.some(r => r.chargeStatus !== "Completed") && (
                <button onClick={() => updateReports("generateCharges", reports.filter(r => r.chargeStatus !== "Completed").map(r => r.id))} disabled={repUpdating !== null}
                  style={{ padding: "8px 18px", borderRadius: 100, border: "none", background: "linear-gradient(135deg, var(--teal), #2A6B7C)", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  {repUpdating === "generateCharges" ? "Running..." : `Generate all charges (${reports.filter(r => r.chargeStatus !== "Completed").length})`}
                </button>
              )}
              {reports.some(r => r.status === "Pending") && (
                <button onClick={() => updateReports("markReviewed", reports.filter(r => r.status === "Pending").map(r => r.id))} disabled={repUpdating !== null}
                  style={{ padding: "8px 18px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--accent)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Mark all Reviewed</button>
              )}
              {reports.some(r => r.status === "Reviewed") && (
                <button onClick={() => updateReports("markSent", reports.filter(r => r.status === "Reviewed").map(r => r.id))} disabled={repUpdating !== null}
                  style={{ padding: "8px 18px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--green)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Mark all Sent</button>
              )}
              {reports.every(r => r.chargeStatus === "Completed") && reports.length > 0 && (
                <span style={{ fontSize: 12, color: "var(--green)", padding: "8px 0", display: "flex", alignItems: "center", gap: 4 }}>✓ All recurring charges generated</span>
              )}
            </div>

            {/* PENDING */}
            {reports.filter(r => r.status === "Pending").length > 0 && (<>
              <h2 style={{ ...h2s, marginBottom: 12 }}>Pending</h2>
              <div style={{ ...card, padding: 0, marginBottom: 24 }}>
                {reports.filter(r => r.status === "Pending").map((r, i, arr) => {
                  const isNeg = r.finalBalance < 0;
                  const isOpen = previewId === r.id;
                  const cats = [
                    { name: "Villa Staff", val: r.categories.villaStaff },
                    { name: "Utilities", val: r.categories.utilities },
                    { name: "Maintenance", val: r.categories.maintenance },
                    { name: "Cleaning Supplies", val: r.categories.cleaningSupplies },
                    { name: "Groceries", val: r.categories.groceries },
                    { name: "Miscellaneous", val: r.categories.miscellaneous },
                  ].filter(c => c.val > 0);
                  return (<div key={r.id}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: (isOpen || i < arr.length - 1) ? "1px solid var(--border)" : "none" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>{r.house} — {r.owner}</div>
                        <div style={{ fontSize: 12, color: "var(--text3)" }}>
                          Expenses: {fmtCur(r.totalExpenses, r.currency)} · Deposits: {fmtCur(r.totalDeposits, r.currency)} · Balance: <span style={{ color: isNeg ? "var(--red)" : "var(--green)" }}>{isNeg ? "-" : ""}{fmtCur(r.finalBalance, r.currency)}</span>
                        </div>
                      </div>
                      {/* Exchange rate inline for USD properties */}
                      {r.currency === "USD" && (
                        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                          <span style={{ fontSize: 10, color: "var(--text3)" }}>FX:</span>
                          <input type="number" step="0.01" defaultValue={r.exchangeRate || ""} onBlur={e => { if (e.target.value) updateExchangeRate(r.id, e.target.value); }}
                            style={{ width: 60, padding: "3px 6px", background: "var(--bg)", border: "1px solid var(--border2)", borderRadius: 6, color: "var(--text)", fontSize: 12, outline: "none", textAlign: "center" as const }} placeholder="0.00" />
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        {r.chargeStatus !== "Completed" && (
                          <button onClick={() => updateReports("generateCharges", [r.id])} disabled={repUpdating !== null}
                            style={{ padding: "5px 12px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--teal-l)", fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" as const }}>Gen. charges</button>
                        )}
                        <button onClick={() => setPreviewId(isOpen ? null : r.id)}
                          style={{ padding: "5px 12px", borderRadius: 100, border: "1px solid var(--border2)", background: isOpen ? "var(--accent-s)" : "transparent", color: "var(--accent)", fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>Preview</button>
                        <button onClick={() => updateReports("markReviewed", [r.id])} disabled={repUpdating !== null}
                          style={{ padding: "5px 12px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--accent)", fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" as const }}>Mark Reviewed</button>
                        <button onClick={() => { setExpFilter(r.house); setMonthFilter(monthToFilterValue(r.month)); setActivePage("expenses"); }}
                          style={{ padding: "5px 12px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--text3)", fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>Expenses</button>
                      </div>
                    </div>
                    {/* Accordion preview */}
                    {isOpen && (
                      <div style={{ padding: "16px 20px", background: "var(--bg2)", borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none" }}>
                        <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text3)", marginBottom: 12 }}>Report preview: {r.house}</div>
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                          <span style={{ fontSize: 13, color: "var(--text2)" }}>Starting Balance</span>
                          <span style={{ fontSize: 13, fontWeight: 500 }}>{fmtCur(r.startingBalance, r.currency)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)", fontWeight: 500 }}>
                          <span style={{ fontSize: 13, color: "var(--text2)" }}>Total Expenses</span>
                          <span style={{ fontSize: 13, color: "var(--red)" }}>-{fmtCur(r.totalExpenses, r.currency)}</span>
                        </div>
                        {cats.map(c => (
                          <div key={c.name} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0 5px 24px", borderBottom: "1px solid var(--border)" }}>
                            <span style={{ fontSize: 12, color: "var(--text3)" }}>{c.name}</span>
                            <span style={{ fontSize: 12, color: "var(--text3)" }}>{fmtCur(c.val, r.currency)}</span>
                          </div>
                        ))}
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                          <span style={{ fontSize: 13, color: "var(--text2)" }}>Deposits</span>
                          <span style={{ fontSize: 13, color: "var(--green)", fontWeight: 500 }}>+{fmtCur(r.totalDeposits, r.currency)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 4px" }}>
                          <span style={{ fontSize: 14, fontWeight: 600 }}>Final Balance</span>
                          <span style={{ fontSize: 14, fontWeight: 600, color: isNeg ? "var(--red)" : "var(--green)" }}>{isNeg ? "-" : ""}{fmtCur(r.finalBalance, r.currency)}</span>
                        </div>
                      </div>
                    )}
                  </div>);
                })}
              </div>
            </>)}

            {/* REVIEWED */}
            {reports.filter(r => r.status === "Reviewed").length > 0 && (<>
              <h2 style={{ ...h2s, marginBottom: 12 }}>Ready to send</h2>
              <div style={{ ...card, padding: 0, marginBottom: 24 }}>
                {reports.filter(r => r.status === "Reviewed").map((r, i, arr) => {
                  const isNeg = r.finalBalance < 0;
                  const isOpen = previewId === r.id;
                  const cats = [
                    { name: "Villa Staff", val: r.categories.villaStaff },
                    { name: "Utilities", val: r.categories.utilities },
                    { name: "Maintenance", val: r.categories.maintenance },
                    { name: "Cleaning Supplies", val: r.categories.cleaningSupplies },
                    { name: "Groceries", val: r.categories.groceries },
                    { name: "Miscellaneous", val: r.categories.miscellaneous },
                  ].filter(c => c.val > 0);
                  return (<div key={r.id}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: (isOpen || i < arr.length - 1) ? "1px solid var(--border)" : "none" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>{r.house} — {r.owner}</div>
                        <div style={{ fontSize: 12, color: "var(--text3)" }}>Balance: <span style={{ color: isNeg ? "var(--red)" : "var(--green)" }}>{isNeg ? "-" : ""}{fmtCur(r.finalBalance, r.currency)}</span></div>
                      </div>
                      {r.currency === "USD" && (
                        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                          <span style={{ fontSize: 10, color: "var(--text3)" }}>FX:</span>
                          <input type="number" step="0.01" defaultValue={r.exchangeRate || ""} onBlur={e => { if (e.target.value) updateExchangeRate(r.id, e.target.value); }}
                            style={{ width: 60, padding: "3px 6px", background: "var(--bg)", border: "1px solid var(--border2)", borderRadius: 6, color: "var(--text)", fontSize: 12, outline: "none", textAlign: "center" as const }} placeholder="0.00" />
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <button onClick={() => setPreviewId(isOpen ? null : r.id)}
                          style={{ padding: "5px 12px", borderRadius: 100, border: "1px solid var(--border2)", background: isOpen ? "var(--accent-s)" : "transparent", color: "var(--accent)", fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>Preview</button>
                        <button onClick={() => updateReports("markSent", [r.id])} disabled={repUpdating !== null}
                          style={{ padding: "6px 16px", borderRadius: 100, border: "none", background: "linear-gradient(135deg, var(--green), #4a9e6e)", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" as const }}>Mark Sent</button>
                        <button onClick={() => { setExpFilter(r.house); setMonthFilter(monthToFilterValue(r.month)); setActivePage("expenses"); }}
                          style={{ padding: "5px 12px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--text3)", fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>Expenses</button>
                      </div>
                    </div>
                    {isOpen && (
                      <div style={{ padding: "16px 20px", background: "var(--bg2)", borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none" }}>
                        <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text3)", marginBottom: 12 }}>Report preview: {r.house}</div>
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}><span style={{ fontSize: 13, color: "var(--text2)" }}>Starting Balance</span><span style={{ fontSize: 13, fontWeight: 500 }}>{fmtCur(r.startingBalance, r.currency)}</span></div>
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)", fontWeight: 500 }}><span style={{ fontSize: 13, color: "var(--text2)" }}>Total Expenses</span><span style={{ fontSize: 13, color: "var(--red)" }}>-{fmtCur(r.totalExpenses, r.currency)}</span></div>
                        {cats.map(c => (<div key={c.name} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0 5px 24px", borderBottom: "1px solid var(--border)" }}><span style={{ fontSize: 12, color: "var(--text3)" }}>{c.name}</span><span style={{ fontSize: 12, color: "var(--text3)" }}>{fmtCur(c.val, r.currency)}</span></div>))}
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}><span style={{ fontSize: 13, color: "var(--text2)" }}>Deposits</span><span style={{ fontSize: 13, color: "var(--green)", fontWeight: 500 }}>+{fmtCur(r.totalDeposits, r.currency)}</span></div>
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 4px" }}><span style={{ fontSize: 14, fontWeight: 600 }}>Final Balance</span><span style={{ fontSize: 14, fontWeight: 600, color: isNeg ? "var(--red)" : "var(--green)" }}>{isNeg ? "-" : ""}{fmtCur(r.finalBalance, r.currency)}</span></div>
                      </div>
                    )}
                  </div>);
                })}
              </div>
            </>)}

            {/* SENT */}
            {reports.filter(r => r.status === "Sent").length > 0 && (<>
              <h2 style={{ ...h2s, marginBottom: 12 }}>Sent</h2>
              <div style={{ ...card, padding: 0 }}>
                {reports.filter(r => r.status === "Sent").map((r, i, arr) => {
                  const isNeg = r.finalBalance < 0;
                  return (
                    <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 20px", borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none" }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--green-s)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--green)", fontSize: 12, flexShrink: 0 }}>✓</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>{r.house} — {r.owner}</div>
                        <div style={{ fontSize: 12, color: "var(--text3)" }}>Sent · Balance: <span style={{ color: isNeg ? "var(--red)" : "var(--green)" }}>{isNeg ? "-" : ""}{fmtCur(r.finalBalance, r.currency)}</span></div>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => updateReports("markPending", [r.id])} disabled={repUpdating !== null}
                          style={{ padding: "5px 12px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--text3)", fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>Reopen</button>
                        <button onClick={() => { setExpFilter(r.house); setMonthFilter(monthToFilterValue(r.month)); setActivePage("expenses"); }}
                          style={{ padding: "5px 12px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--text3)", fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>Expenses</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>)}
          </div>
        )}

                {/* PLACEHOLDER */}
        {activePage !== "dashboard" && activePage !== "expenses" && activePage !== "deposits" && activePage !== "reports" && (
          <div style={{ padding: "32px 40px" }}><h1 style={h1s}>{navItems.find(n => n.id === activePage)?.label || ""}</h1><p style={{ fontSize: 14, color: "var(--text3)", marginTop: 20 }}>Coming soon — this module will be built next.</p></div>
        )}
      </main>
    </div>
  );
}