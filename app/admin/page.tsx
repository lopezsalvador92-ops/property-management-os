"use client";

import { useEffect, useState } from "react";

type Property = { id: string; name: string; owner: string; status: string; currency: string; pmFee: number };
type Expense = { id: string; receiptNo: string; date: string; category: string; supplier: string; house: string; total: number; currency: string; description: string; receiptUrl: string; owner: string };
type Deposit = { id: string; date: string; house: string; houseId: string; owner: string; currency: string; amount: number; notes: string; month: string };
type AppUser = { id: string; firstName: string; lastName: string; email: string; role: string; linkedProperty: string; createdAt: number; lastSignInAt: number | null; imageUrl: string };
type PropertyDetail = { id: string; name: string; owner: string; email: string; secondaryEmail: string; currency: string; status: string; pmFeeUSD: number; pmFeeMXN: number; landscapingFeeUSD: number; landscapingFeeMXN: number; poolFeeUSD: number; poolFeeMXN: number; hskCadence: string; includedCleans: number; hskFeeUSD: number; hskFeeMXN: number; housemanFeeUSD: number; housemanFeeMXN: number };
type HskLog = { id: string; housekeeper: string; weekStart: string; days: { mon: string; tue: string; wed: string; thu: string; fri: string; sat: string; sun: string }; status: string; expensesCreated: boolean; comments: string; approvedAt: string };
type HskSummary = { property: string; totalCleans: number; includedPerWeek: number; includedMonthly: number; extraCleans: number; cadence: string; weeksInMonth: number };
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

  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserFirst, setNewUserFirst] = useState("");
  const [newUserLast, setNewUserLast] = useState("");
  const [newUserPass, setNewUserPass] = useState("");
  const [newUserRole, setNewUserRole] = useState("owner");
  const [newUserProp, setNewUserProp] = useState("");
  const [addingUser, setAddingUser] = useState(false);
  const [userError, setUserError] = useState("");
  const [propDetails, setPropDetails] = useState<PropertyDetail[]>([]);
  const [propLoading, setPropLoading] = useState(false);
  const [selectedProp, setSelectedProp] = useState<string | null>(null);
  const [propTab, setPropTab] = useState<"overview" | "fees" | "housekeeping" | "history">("overview");
  const [propSaving, setPropSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPropName, setNewPropName] = useState("");
  const [newPropOwner, setNewPropOwner] = useState("");
  const [newPropEmail, setNewPropEmail] = useState("");
  const [newPropCurrency, setNewPropCurrency] = useState("MXN");
  const [addingProp, setAddingProp] = useState(false);
  const [propSaved, setPropSaved] = useState(false);
  const [hskLogs, setHskLogs] = useState<HskLog[]>([]);
  const [hskSummary, setHskSummary] = useState<HskSummary[]>([]);
  const [hskMonth, setHskMonth] = useState("");
  const [hskLoading, setHskLoading] = useState(false);
  const [hskUpdating, setHskUpdating] = useState<string | null>(null);
  const [hskView, setHskView] = useState<"individual" | "weekly" | "summary">("individual");
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

  useEffect(() => {
    if (activePage === "users") {
      setUsersLoading(true);
      fetch("/api/users").then(r => r.json()).then(d => { setAppUsers(d.users || []); setUsersLoading(false); }).catch(() => setUsersLoading(false));
    }
  }, [activePage]);

  async function createUser() {
    if (!newUserEmail || !newUserPass || !newUserRole) return;
    setAddingUser(true);
    setUserError("");
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newUserEmail, firstName: newUserFirst, lastName: newUserLast, password: newUserPass, role: newUserRole, linkedProperty: newUserProp }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowAddUser(false); setNewUserEmail(""); setNewUserFirst(""); setNewUserLast(""); setNewUserPass(""); setNewUserProp("");
        fetch("/api/users").then(r => r.json()).then(d => setAppUsers(d.users || []));
      } else {
        setUserError(data.error || "Failed to create user");
      }
    } catch (e) { setUserError("Failed to create user"); }
    setAddingUser(false);
  }

  async function updateUserRole(userId: string, role: string, linkedProperty?: string) {
    try {
      await fetch("/api/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, role, ...(linkedProperty !== undefined ? { linkedProperty } : {}) }) });
      fetch("/api/users").then(r => r.json()).then(d => setAppUsers(d.users || []));
    } catch (e) { console.error(e); }
  }

  useEffect(() => {
    if (activePage === "properties" || activePage === "users") {
      setPropLoading(true);
      fetch("/api/properties-detail").then(r => r.json()).then(d => { setPropDetails(d.properties || []); setPropLoading(false); }).catch(() => setPropLoading(false));
    }
  }, [activePage]);

  async function addProperty() {
    if (!newPropName || !newPropOwner) return;
    setAddingProp(true);
    try {
      const res = await fetch("/api/properties-detail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newPropName, owner: newPropOwner, email: newPropEmail, currency: newPropCurrency }),
      });
      if (res.ok) {
        setShowAddForm(false); setNewPropName(""); setNewPropOwner(""); setNewPropEmail("");
        fetch("/api/properties-detail").then(r => r.json()).then(d => setPropDetails(d.properties || []));
      }
    } catch (e) { console.error(e); }
    setAddingProp(false);
  }

  async function saveProperty(recordId: string, fields: Record<string, any>) {
    setPropSaving(true);
    try {
      const res = await fetch("/api/properties-detail", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recordId, fields }) });
      if (res.ok) {
        setPropSaved(true);
        setTimeout(() => setPropSaved(false), 2000);
        fetch("/api/properties-detail").then(r => r.json()).then(d => setPropDetails(d.properties || []));
      }
    } catch (e) { console.error(e); }
    setPropSaving(false);
  }

  useEffect(() => {
    if (activePage === "housekeeping") {
      setHskLoading(true);
      fetch("/api/housekeeping").then(r => r.json()).then(d => { setHskLogs(d.logs || []); setHskSummary(d.monthlySummary || []); setHskMonth(d.currentMonth || ""); setHskLoading(false); }).catch(() => setHskLoading(false));
    }
  }, [activePage]);

  async function updateHsk(action: string, ids: string[]) {
    setHskUpdating(action);
    try {
      const res = await fetch("/api/housekeeping", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, recordIds: ids }) });
      if (res.ok) { fetch("/api/housekeeping").then(r => r.json()).then(d => { setHskLogs(d.logs || []); setHskSummary(d.monthlySummary || []); }); }
    } catch (e) { console.error(e); }
    setHskUpdating(null);
  }

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

        
        {/* ====== HOUSEKEEPING ====== */}
        {activePage === "housekeeping" && (() => {
          const pending = hskLogs.filter(l => l.status === "Pending");
          const approved = hskLogs.filter(l => l.status === "Approved");
          const dayKeys: (keyof HskLog["days"])[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
          const dayLabels = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

          function formatWeek(dateStr: string) {
            if (!dateStr) return "";
            try { const d = new Date(dateStr + "T12:00:00"); return `Week of ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`; } catch { return dateStr; }
          }

          function PropertyPill({ name }: { name: string }) {
            const colors = ["var(--teal)", "var(--accent)", "var(--green)", "var(--blue)", "var(--orange)", "#9B8EC4", "#CFC46E"];
            const idx = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length;
            return <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 500, background: `${colors[idx]}18`, color: colors[idx], whiteSpace: "nowrap" as const, margin: "1px 2px" }}>{name}</span>;
          }

          return (
            <div style={{ padding: "32px 40px" }}>
              <h1 style={h1s}>Housekeeping Logs</h1>
              <p style={{ fontSize: 14, color: "var(--text2)", marginBottom: 24 }}>Review and approve weekly cleaning schedules</p>

              {/* Tabs */}
              <div style={{ display: "flex", gap: 0, marginBottom: 24 }}>
                <button onClick={() => setHskView("individual")}
                  style={{ padding: "8px 20px", borderRadius: "8px 0 0 8px", border: "1px solid var(--border2)", background: hskView === "individual" ? "var(--accent-s)" : "transparent", color: hskView === "individual" ? "var(--accent)" : "var(--text3)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Individual Logs</button>
                <button onClick={() => setHskView("weekly")}
                  style={{ padding: "8px 20px", borderRadius: "0 0 0 0", border: "1px solid var(--border2)", borderLeft: "none", background: hskView === "weekly" ? "var(--accent-s)" : "transparent", color: hskView === "weekly" ? "var(--accent)" : "var(--text3)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Weekly Overview</button>
                <button onClick={() => setHskView("summary")}
                  style={{ padding: "8px 20px", borderRadius: "0 8px 8px 0", border: "1px solid var(--border2)", borderLeft: "none", background: hskView === "summary" ? "var(--accent-s)" : "transparent", color: hskView === "summary" ? "var(--accent)" : "var(--text3)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Monthly Summary</button>
              </div>

              {/* Summary bar */}
              {pending.length > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 10, marginBottom: 24 }}>
                  <span style={{ fontSize: 14 }}>{pending.length} {pending.length === 1 ? "log" : "logs"} pending your approval</span>
                  <button onClick={() => updateHsk("approve", pending.map(l => l.id))} disabled={hskUpdating !== null}
                    style={{ padding: "8px 20px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--accent)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                    {hskUpdating === "approve" ? "Approving..." : "Approve All"}
                  </button>
                </div>
              )}

              {hskLoading && <div style={{ padding: 20, color: "var(--text3)" }}>Loading logs...</div>}

              {/* INDIVIDUAL VIEW */}
              {hskView === "individual" && (<>
                {/* Pending */}
                {pending.map(log => (
                  <div key={log.id} style={{ ...card, marginBottom: 16, padding: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
                      <div style={{ fontSize: 15, fontWeight: 500 }}>{formatWeek(log.weekStart)} — {log.housekeeper}</div>
                      <span style={{ fontSize: 11, padding: "3px 12px", borderRadius: 100, fontWeight: 500, background: "var(--accent-s)", color: "var(--accent)" }}>PENDING</span>
                    </div>
                    {/* Grid */}
                    <div style={{ overflowX: "auto" as const, padding: "16px 20px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "120px repeat(7, 1fr)", gap: 0, minWidth: 700 }}>
                        <div />
                        {dayLabels.map(d => <div key={d} style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text3)", textAlign: "center" as const, padding: "0 4px 8px" }}>{d}</div>)}
                        <div style={{ fontSize: 13, color: "var(--text2)", padding: "8px 0", display: "flex", alignItems: "center" }}>{log.housekeeper.split(" ")[0]}</div>
                        {dayKeys.map(dk => (
                          <div key={dk} style={{ padding: "4px", textAlign: "center" as const, minHeight: 36, display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap" as const, gap: 2 }}>
                            {log.days[dk] ? log.days[dk].split(", ").map((h, i) => <PropertyPill key={i} name={h.trim()} />) : <span style={{ color: "var(--text3)", fontSize: 12 }}>—</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Comments */}
                    {log.comments && (
                      <div style={{ padding: "0 20px 12px", fontSize: 12, color: "var(--text3)", fontStyle: "italic" }}>{log.comments}</div>
                    )}
                    {/* Actions */}
                    <div style={{ display: "flex", gap: 8, padding: "12px 20px", borderTop: "1px solid var(--border)", justifyContent: "flex-end" }}>
                      <button onClick={() => updateHsk("reject", [log.id])} disabled={hskUpdating !== null}
                        style={{ padding: "7px 18px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--text3)", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>Reject</button>
                      <button onClick={() => updateHsk("approve", [log.id])} disabled={hskUpdating !== null}
                        style={{ padding: "7px 18px", borderRadius: 100, border: "none", background: "linear-gradient(135deg, var(--teal), #2A6B7C)", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Approve & Create Expenses</button>
                    </div>
                  </div>
                ))}

                {/* Approved */}
                {approved.length > 0 && (
                  <>
                    <h2 style={{ ...h2s, marginTop: 28, marginBottom: 12 }}>Approved</h2>
                    {approved.slice(0, 10).map(log => (
                      <div key={log.id} style={{ ...card, marginBottom: 12, padding: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
                          <div style={{ fontSize: 15, fontWeight: 500 }}>{formatWeek(log.weekStart)} — {log.housekeeper}</div>
                          <span style={{ fontSize: 11, padding: "3px 12px", borderRadius: 100, fontWeight: 500, background: "var(--green-s)", color: "var(--green)" }}>APPROVED</span>
                        </div>
                        <div style={{ overflowX: "auto" as const, padding: "16px 20px" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "120px repeat(7, 1fr)", gap: 0, minWidth: 700 }}>
                            <div />
                            {dayLabels.map(d => <div key={d} style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text3)", textAlign: "center" as const, padding: "0 4px 8px" }}>{d}</div>)}
                            <div style={{ fontSize: 13, color: "var(--text2)", padding: "8px 0", display: "flex", alignItems: "center" }}>{log.housekeeper.split(" ")[0]}</div>
                            {dayKeys.map(dk => (
                              <div key={dk} style={{ padding: "4px", textAlign: "center" as const, minHeight: 36, display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap" as const, gap: 2 }}>
                                {log.days[dk] ? log.days[dk].split(", ").map((h, i) => <PropertyPill key={i} name={h.trim()} />) : <span style={{ color: "var(--text3)", fontSize: 12 }}>—</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div style={{ padding: "10px 20px", borderTop: "1px solid var(--border)", fontSize: 12, color: "var(--green)" }}>
                          {log.expensesCreated ? "✓ Expenses created" : "Expenses will be created on next Wednesday run"}
                          {log.comments && <span style={{ color: "var(--text3)", marginLeft: 12 }}>{log.comments}</span>}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </>)}


              {/* MONTHLY SUMMARY */}
              {hskView === "summary" && (
                <div>
                  <h2 style={{ ...h2s, marginBottom: 12 }}>Clean count summary, {hskMonth}</h2>
                  <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 16 }}>Validate clean counts per property before generating housekeeping charges</p>
                  <div style={{ ...card, padding: 0 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 100px 100px 100px", padding: "10px 20px", borderBottom: "2px solid var(--border2)" }}>
                      <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text3)" }}>Property</div>
                      <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text3)", textAlign: "center" as const }}>Total</div>
                      <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text3)", textAlign: "center" as const }}>Included</div>
                      <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text3)", textAlign: "center" as const }}>Extra</div>
                      <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text3)", textAlign: "center" as const }}>Cadence</div>
                    </div>
                    {hskSummary.map((s, i) => {
                      const hasExtra = s.extraCleans > 0;
                      return (
                        <div key={s.property} style={{ display: "grid", gridTemplateColumns: "1fr 100px 100px 100px 100px", padding: "12px 20px", borderBottom: i < hskSummary.length - 1 ? "1px solid var(--border)" : "none" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 500 }}>{s.property}</div>
                            <div style={{ fontSize: 11, color: "var(--text3)" }}>{s.includedPerWeek} included/week</div>
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 500, textAlign: "center" as const, display: "flex", alignItems: "center", justifyContent: "center" }}>{s.totalCleans}</div>
                          <div style={{ fontSize: 14, textAlign: "center" as const, color: "var(--text2)", display: "flex", alignItems: "center", justifyContent: "center" }}>{s.includedMonthly}</div>
                          <div style={{ fontSize: 14, fontWeight: 600, textAlign: "center" as const, color: hasExtra ? "var(--orange)" : "var(--green)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {hasExtra ? s.extraCleans : "✓"}
                          </div>
                          <div style={{ fontSize: 11, textAlign: "center" as const, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ padding: "2px 10px", borderRadius: 100, background: s.cadence === "Weekly" ? "var(--teal-s)" : "var(--accent-s)", color: s.cadence === "Weekly" ? "var(--teal-l)" : "var(--accent)" }}>{s.cadence}</span>
                          </div>
                        </div>
                      );
                    })}
                    {hskSummary.length === 0 && <div style={{ padding: 20, color: "var(--text3)", fontSize: 13 }}>No housekeeping data for this month.</div>}
                  </div>
                  {hskSummary.some(s => s.extraCleans > 0) && (
                    <div style={{ marginTop: 16, padding: "12px 20px", background: "var(--orange-s)", border: "1px solid rgba(207,149,110,0.12)", borderRadius: 10, fontSize: 13 }}>
                      {hskSummary.filter(s => s.extraCleans > 0).length} {hskSummary.filter(s => s.extraCleans > 0).length === 1 ? "property has" : "properties have"} extra cleans that will be charged beyond the included amount.
                    </div>
                  )}
                </div>
              )}

              {/* WEEKLY OVERVIEW */}
              {hskView === "weekly" && (() => {
                const weeks = Array.from(new Set(hskLogs.map(l => l.weekStart))).sort((a, b) => b.localeCompare(a));
                return (<>
                  {weeks.slice(0, 6).map(week => {
                    const weekLogs = hskLogs.filter(l => l.weekStart === week);
                    return (
                      <div key={week} style={{ ...card, marginBottom: 16, padding: 0 }}>
                        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", fontSize: 15, fontWeight: 500 }}>{formatWeek(week)}</div>
                        <div style={{ overflowX: "auto" as const, padding: "16px 20px" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "140px repeat(7, 1fr)", gap: 0, minWidth: 800 }}>
                            <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text3)", padding: "0 0 8px" }}>Housekeeper</div>
                            {dayLabels.map(d => <div key={d} style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text3)", textAlign: "center" as const, padding: "0 4px 8px" }}>{d}</div>)}
                            {weekLogs.map(log => (<>
                              <div key={`name-${log.id}`} style={{ fontSize: 13, color: "var(--text2)", padding: "8px 0", display: "flex", alignItems: "center", gap: 6, borderTop: "1px solid var(--border)" }}>
                                {log.housekeeper.split(" ")[0]}
                                <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 100, background: log.status === "Approved" ? "var(--green-s)" : "var(--accent-s)", color: log.status === "Approved" ? "var(--green)" : "var(--accent)" }}>{log.status === "Approved" ? "✓" : "○"}</span>
                              </div>
                              {dayKeys.map(dk => (
                                <div key={`${log.id}-${dk}`} style={{ padding: "4px", textAlign: "center" as const, minHeight: 36, display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap" as const, gap: 2, borderTop: "1px solid var(--border)" }}>
                                  {log.days[dk] ? log.days[dk].split(", ").map((h, i) => <PropertyPill key={i} name={h.trim()} />) : <span style={{ color: "var(--text3)", fontSize: 12 }}>—</span>}
                                </div>
                              ))}
                            </>))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>);
              })()}
            </div>
          );
        })()}


        {/* ====== PROPERTIES ====== */}
        {activePage === "properties" && (() => {
          const activePropList = propDetails.filter(p => p.status === "Active");
          const otherPropList = propDetails.filter(p => p.status !== "Active");
          const sel_prop = selectedProp ? propDetails.find(p => p.id === selectedProp) : null;


          // DETAIL VIEW
          if (sel_prop) {
            const isUSD = sel_prop.currency === "USD";
            const pmFee = isUSD ? sel_prop.pmFeeUSD : sel_prop.pmFeeMXN;
            const landscapingFee = isUSD ? sel_prop.landscapingFeeUSD : sel_prop.landscapingFeeMXN;
            const poolFee = isUSD ? sel_prop.poolFeeUSD : sel_prop.poolFeeMXN;
            const hskFee = isUSD ? sel_prop.hskFeeUSD : sel_prop.hskFeeMXN;
            const housemanFee = isUSD ? sel_prop.housemanFeeUSD : sel_prop.housemanFeeMXN;
            const bal = balances.find(b => b.house === sel_prop.name);
            const isNeg = bal && bal.finalBalance < 0;
            const tabStyle = (active: boolean): React.CSSProperties => ({ padding: "8px 20px", border: "1px solid var(--border2)", background: active ? "var(--accent-s)" : "transparent", color: active ? "var(--accent)" : "var(--text3)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" });

            return (
              <div style={{ padding: "32px 40px", maxWidth: 900 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                  <span onClick={() => { setSelectedProp(null); setPropTab("overview"); }} style={{ fontSize: 13, color: "var(--teal-l)", cursor: "pointer" }}>Properties</span>
                  <span style={{ fontSize: 13, color: "var(--text3)" }}>/</span>
                  <span style={{ fontSize: 13, color: "var(--text)" }}>{sel_prop.name}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
                  <div>
                    <h1 style={h1s}>{sel_prop.name}</h1>
                    <p style={{ fontSize: 14, color: "var(--text2)" }}>{sel_prop.owner} · {sel_prop.currency} · {sel_prop.status}</p>
                  </div>
                  {bal && (
                    <div style={{ textAlign: "right" as const }}>
                      <div style={{ fontSize: 20, fontWeight: 600, fontFamily: "'Georgia', serif", color: isNeg ? "var(--red)" : "var(--green)" }}>{isNeg ? "-" : ""}{fmtCur(bal.finalBalance, bal.currency)}</div>
                      <div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase" as const }}>Current balance</div>
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 0, marginBottom: 24 }}>
                  <button onClick={() => setPropTab("overview")} style={{ ...tabStyle(propTab === "overview"), borderRadius: "8px 0 0 8px" }}>Overview</button>
                  <button onClick={() => setPropTab("fees")} style={{ ...tabStyle(propTab === "fees"), borderLeft: "none" }}>Fee Config</button>
                  <button onClick={() => setPropTab("housekeeping")} style={{ ...tabStyle(propTab === "housekeeping"), borderLeft: "none" }}>Housekeeping</button>
                  <button onClick={() => setPropTab("history")} style={{ ...tabStyle(propTab === "history"), borderLeft: "none", borderRadius: "0 8px 8px 0" }}>History</button>
                </div>
                {propSaved && <div style={{ padding: "10px 16px", background: "var(--green-s)", border: "1px solid rgba(110,207,151,0.2)", borderRadius: 8, marginBottom: 16, fontSize: 13, color: "var(--green)" }}>✓ Changes saved to Airtable</div>}

                {propTab === "overview" && (
                  <div style={{ ...card }}>
                    <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 16 }}>Owner information</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                      <div><label style={lbl}>Owner name</label><input defaultValue={sel_prop.owner} onBlur={e => saveProperty(sel_prop.id, { owner: e.target.value })} style={inp} /></div>
                      <div>
                        <label style={lbl}>Preferred currency</label>
                        <select defaultValue={sel_prop.currency} onChange={e => saveProperty(sel_prop.id, { currency: e.target.value })} style={{ ...inp, appearance: "none" as const }}>
                          <option value="USD">USD</option>
                          <option value="MXN">MXN</option>
                        </select>
                      </div>
                      <div><label style={lbl}>Primary email</label><input defaultValue={sel_prop.email} onBlur={e => saveProperty(sel_prop.id, { email: e.target.value })} style={inp} /></div>
                      <div><label style={lbl}>Secondary email</label><input defaultValue={sel_prop.secondaryEmail} onBlur={e => saveProperty(sel_prop.id, { secondaryEmail: e.target.value })} style={inp} /></div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12, paddingTop: 16, borderTop: "1px solid var(--border)" }}>Quick actions</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => { setExpFilter(sel_prop.name); setActivePage("expenses"); }} style={{ padding: "8px 18px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--teal-l)", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>View expenses</button>
                      <button onClick={() => setActivePage("reports")} style={{ padding: "8px 18px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--accent)", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>View reports</button>
                      <button onClick={() => setActivePage("deposits")} style={{ padding: "8px 18px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--green)", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>View deposits</button>
                    </div>
                  </div>
                )}

                {propTab === "fees" && (
                  <div style={{ ...card }}>
                    <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 16 }}>Monthly recurring fees ({sel_prop.currency})</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                      <div><label style={lbl}>PM Fee</label><input type="number" defaultValue={pmFee || ""} onBlur={e => saveProperty(sel_prop.id, { [isUSD ? "pmFeeUSD" : "pmFeeMXN"]: e.target.value })} style={inp} placeholder="0.00" /></div>
                      <div><label style={lbl}>Landscaping Fee</label><input type="number" defaultValue={landscapingFee || ""} onBlur={e => saveProperty(sel_prop.id, { [isUSD ? "landscapingFeeUSD" : "landscapingFeeMXN"]: e.target.value })} style={inp} placeholder="0.00" /></div>
                      <div><label style={lbl}>Pool Fee</label><input type="number" defaultValue={poolFee || ""} onBlur={e => saveProperty(sel_prop.id, { [isUSD ? "poolFeeUSD" : "poolFeeMXN"]: e.target.value })} style={inp} placeholder="0.00" /></div>
                    </div>
                    <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 12 }}>Changes save automatically when you click away from a field.</p>
                  </div>
                )}

                {propTab === "housekeeping" && (
                  <div style={{ ...card }}>
                    <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 16 }}>Housekeeping configuration</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                      <div><label style={lbl}>Cadence</label><div style={{ padding: "10px 14px", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 14, color: "var(--text2)" }}>{sel_prop.hskCadence}</div></div>
                      <div><label style={lbl}>Included cleans per week</label><input type="number" defaultValue={sel_prop.includedCleans || ""} onBlur={e => saveProperty(sel_prop.id, { includedCleans: e.target.value })} style={inp} placeholder="0" /></div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      <div><label style={lbl}>HSK Fee ({sel_prop.currency})</label><input type="number" defaultValue={hskFee || ""} onBlur={e => saveProperty(sel_prop.id, { [isUSD ? "hskFeeUSD" : "hskFeeMXN"]: e.target.value })} style={inp} placeholder="0.00" /></div>
                      <div><label style={lbl}>Houseman Fee ({sel_prop.currency})</label><input type="number" defaultValue={housemanFee || ""} onBlur={e => saveProperty(sel_prop.id, { [isUSD ? "housemanFeeUSD" : "housemanFeeMXN"]: e.target.value })} style={inp} placeholder="0.00" /></div>
                    </div>
                    <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 12 }}>Changes save automatically when you click away from a field.</p>
                  </div>
                )}

                {propTab === "history" && (
                  <div style={{ ...card, padding: 0 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 100px 100px 130px", padding: "10px 20px", borderBottom: "2px solid var(--border2)" }}>
                      <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text3)" }}>Month</div>
                      <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text3)", textAlign: "right" as const }}>Starting</div>
                      <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text3)", textAlign: "right" as const }}>Expenses</div>
                      <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text3)", textAlign: "right" as const }}>Deposits</div>
                      <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text3)", textAlign: "right" as const }}>Final Balance</div>
                    </div>
                    {balances.filter(b => b.house === sel_prop.name).length > 0 ? (
                      balances.filter(b => b.house === sel_prop.name).map((b, i, arr) => {
                        const neg = b.finalBalance < 0;
                        return (
                          <div key={`hist-${b.houseId}-${i}`} style={{ display: "grid", gridTemplateColumns: "1fr 120px 100px 100px 130px", padding: "12px 20px", borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none" }}>
                            <div style={{ fontSize: 13, fontWeight: 500 }}>{b.month}</div>
                            <div style={{ fontSize: 13, color: "var(--text2)", textAlign: "right" as const }}>{fmtCur(b.startingBalance, b.currency)}</div>
                            <div style={{ fontSize: 13, color: "var(--red)", textAlign: "right" as const }}>{fmtCur(b.totalExpenses, b.currency)}</div>
                            <div style={{ fontSize: 13, color: "var(--green)", textAlign: "right" as const }}>{fmtCur(b.totalDeposits, b.currency)}</div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: neg ? "var(--red)" : "var(--green)", textAlign: "right" as const }}>{neg ? "-" : ""}{fmtCur(b.finalBalance, b.currency)}</div>
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ padding: 20, color: "var(--text3)", fontSize: 13 }}>No financial history available.</div>
                    )}
                  </div>
                )}
              </div>
            );
          }

          // DASHBOARD LIST VIEW
          const totalBalance = balances.reduce((sum, b) => sum + (b.currency === "USD" ? b.finalBalance : 0), 0);
          const negCount = balances.filter(b => b.finalBalance < 0).length;
          const usdProps = activePropList.filter(p => p.currency === "USD").length;
          const mxnProps = activePropList.filter(p => p.currency === "MXN").length;

          return (
            <div style={{ padding: "32px 40px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
                <div>
                  <h1 style={h1s}>Properties</h1>
                  <p style={{ fontSize: 14, color: "var(--text2)" }}>{propLoading ? "Loading..." : `${activePropList.length} active, ${otherPropList.length} other`}</p>
                </div>
                <button onClick={() => setShowAddForm(!showAddForm)}
                  style={{ padding: "9px 20px", borderRadius: 100, border: "none", background: "linear-gradient(135deg, var(--teal), #2A6B7C)", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  + Add Property
                </button>
              </div>

              {/* Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
                <div style={card}><div style={lbl}>Active</div><div style={{ fontFamily: "'Georgia', serif", fontSize: 26, color: "var(--teal-l)" }}>{activePropList.length}</div></div>
                <div style={card}><div style={lbl}>USD Properties</div><div style={{ fontFamily: "'Georgia', serif", fontSize: 26, color: "var(--blue)" }}>{usdProps}</div></div>
                <div style={card}><div style={lbl}>MXN Properties</div><div style={{ fontFamily: "'Georgia', serif", fontSize: 26, color: "var(--teal-l)" }}>{mxnProps}</div></div>
                <div style={card}><div style={lbl}>Negative Balances</div><div style={{ fontFamily: "'Georgia', serif", fontSize: 26, color: negCount > 0 ? "var(--red)" : "var(--green)" }}>{negCount}</div></div>
              </div>

              {/* Add property form */}
              {showAddForm && (
                <div style={{ ...card, marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 16 }}>Add a new property</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                    <div><label style={lbl}>Property name</label><input value={newPropName} onChange={e => setNewPropName(e.target.value)} placeholder="e.g. Chileno RE40" style={inp} /></div>
                    <div><label style={lbl}>Owner name</label><input value={newPropOwner} onChange={e => setNewPropOwner(e.target.value)} placeholder="e.g. Mr. & Mrs. Smith" style={inp} /></div>
                    <div><label style={lbl}>Owner email</label><input value={newPropEmail} onChange={e => setNewPropEmail(e.target.value)} placeholder="email@example.com" style={inp} /></div>
                    <div>
                      <label style={lbl}>Preferred currency</label>
                      <select value={newPropCurrency} onChange={e => setNewPropCurrency(e.target.value)} style={{ ...inp, appearance: "none" as const }}>
                        <option value="MXN">MXN</option>
                        <option value="USD">USD</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button onClick={() => setShowAddForm(false)} style={{ padding: "8px 18px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--text3)", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                    <button onClick={addProperty} disabled={addingProp || !newPropName || !newPropOwner}
                      style={{ padding: "8px 18px", borderRadius: 100, border: "none", background: (!newPropName || !newPropOwner) ? "var(--bg2)" : "linear-gradient(135deg, var(--teal), #2A6B7C)", color: (!newPropName || !newPropOwner) ? "var(--text3)" : "#fff", fontSize: 12, fontWeight: 600, cursor: (!newPropName || !newPropOwner) ? "default" : "pointer", fontFamily: "inherit" }}>
                      {addingProp ? "Adding..." : "Add Property"}
                    </button>
                  </div>
                </div>
              )}

              {/* Property cards grid */}
              <h2 style={{ ...h2s, marginBottom: 12 }}>Active properties</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 28 }}>
                {activePropList.map(p => {
                  const bal = balances.find(b => b.house === p.name);
                  const isNeg = bal && bal.finalBalance < 0;
                  return (
                    <div key={p.id} onClick={() => { setSelectedProp(p.id); setPropTab("overview"); }}
                      style={{ ...card, cursor: "pointer", transition: "border-color 0.15s", border: `1px solid ${isNeg ? "rgba(207,110,110,0.15)" : "var(--border)"}`, padding: 16 }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)")}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = isNeg ? "rgba(207,110,110,0.15)" : "rgba(255,255,255,0.06)")}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                        <div style={{ fontSize: 15, fontWeight: 500 }}>{p.name}</div>
                        <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 100, background: p.currency === "USD" ? "var(--blue-s)" : "var(--teal-s)", color: p.currency === "USD" ? "var(--blue)" : "var(--teal-l)" }}>{p.currency}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 10 }}>{p.owner}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", gap: 12 }}>
                          <div style={{ fontSize: 11, color: "var(--text3)" }}>HSK: <span style={{ color: "var(--text2)" }}>{p.hskCadence}</span></div>
                          {p.includedCleans > 0 && <div style={{ fontSize: 11, color: "var(--text3)" }}>Cleans: <span style={{ color: "var(--text2)" }}>{p.includedCleans}/wk</span></div>}
                        </div>
                        {bal ? (
                          <div style={{ fontSize: 14, fontWeight: 600, color: isNeg ? "var(--red)" : "var(--green)" }}>{isNeg ? "-" : ""}{fmtCur(bal.finalBalance, bal.currency)}</div>
                        ) : (
                          <span style={{ fontSize: 11, color: "var(--green)" }}>Active</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {otherPropList.length > 0 && (
                <>
                  <h2 style={{ ...h2s, marginBottom: 12 }}>Other</h2>
                  {otherPropList.map(p => (
                    <div key={p.id} onClick={() => { setSelectedProp(p.id); setPropTab("overview"); }}
                      style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 20px", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 10, marginBottom: 8, cursor: "pointer", opacity: 0.6 }}>
                      <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>{p.name}</div><div style={{ fontSize: 12, color: "var(--text3)" }}>{p.owner || "No owner"}</div></div>
                      <span style={{ fontSize: 12, color: "var(--text3)", padding: "3px 12px", borderRadius: 100, background: "var(--bg3)" }}>{p.status}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          );
        })()}

        
        {/* ====== USERS ====== */}
        {activePage === "users" && (
          <div style={{ padding: "32px 40px", maxWidth: 900 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
              <div>
                <h1 style={h1s}>Users</h1>
                <p style={{ fontSize: 14, color: "var(--text2)" }}>{usersLoading ? "Loading..." : `${appUsers.length} users registered`}</p>
              </div>
              <button onClick={() => setShowAddUser(!showAddUser)}
                style={{ padding: "9px 20px", borderRadius: 100, border: "none", background: "linear-gradient(135deg, var(--teal), #2A6B7C)", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                + Add User
              </button>
            </div>

            {/* Stat cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
              <div style={card}><div style={lbl}>Admins</div><div style={{ fontFamily: "'Georgia', serif", fontSize: 26, color: "var(--teal-l)" }}>{appUsers.filter(u => u.role === "admin").length}</div></div>
              <div style={card}><div style={lbl}>Owners</div><div style={{ fontFamily: "'Georgia', serif", fontSize: 26, color: "var(--accent)" }}>{appUsers.filter(u => u.role === "owner").length}</div></div>
              <div style={card}><div style={lbl}>Other</div><div style={{ fontFamily: "'Georgia', serif", fontSize: 26, color: "var(--text3)" }}>{appUsers.filter(u => u.role !== "admin" && u.role !== "owner").length}</div></div>
            </div>

            {/* Add user form */}
            {showAddUser && (
              <div style={{ ...card, marginBottom: 24 }}>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 16 }}>Create a new user</div>
                {userError && <div style={{ padding: "10px 16px", background: "var(--red-s)", borderRadius: 8, marginBottom: 12, fontSize: 13, color: "var(--red)" }}>{userError}</div>}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <div><label style={lbl}>First name</label><input value={newUserFirst} onChange={e => setNewUserFirst(e.target.value)} placeholder="Sofia" style={inp} /></div>
                  <div><label style={lbl}>Last name</label><input value={newUserLast} onChange={e => setNewUserLast(e.target.value)} placeholder="Garcia" style={inp} /></div>
                  <div><label style={lbl}>Email</label><input value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} placeholder="email@example.com" style={inp} /></div>
                  <div><label style={lbl}>Password</label><input type="password" value={newUserPass} onChange={e => setNewUserPass(e.target.value)} placeholder="Min 8 characters" style={inp} /></div>
                  <div>
                    <label style={lbl}>Role</label>
                    <select value={newUserRole} onChange={e => setNewUserRole(e.target.value)} style={inp}>
                      <option value="admin">Admin</option>
                      <option value="owner">Owner</option>
                      <option value="house_manager">House Manager</option>
                    </select>
                  </div>
                  {newUserRole === "owner" && (
                    <div>
                      <label style={lbl}>Linked property</label>
                      <select value={newUserProp} onChange={e => setNewUserProp(e.target.value)} style={inp}>
                        <option value="">Select a property...</option>
                        {propDetails.filter(p => p.status === "Active").map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                      </select>
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button onClick={() => { setShowAddUser(false); setUserError(""); }} style={{ padding: "8px 18px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--text3)", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                  <button onClick={createUser} disabled={addingUser || !newUserEmail || !newUserPass}
                    style={{ padding: "8px 18px", borderRadius: 100, border: "none", background: (!newUserEmail || !newUserPass) ? "var(--bg2)" : "linear-gradient(135deg, var(--teal), #2A6B7C)", color: (!newUserEmail || !newUserPass) ? "var(--text3)" : "#fff", fontSize: 12, fontWeight: 600, cursor: (!newUserEmail || !newUserPass) ? "default" : "pointer", fontFamily: "inherit" }}>
                    {addingUser ? "Creating..." : "Create User"}
                  </button>
                </div>
              </div>
            )}

            {/* User list */}
            <div style={{ ...card, padding: 0 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px 140px", padding: "10px 20px", borderBottom: "2px solid var(--border2)" }}>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text3)" }}>User</div>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text3)" }}>Email</div>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text3)" }}>Role</div>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text3)" }}>Last sign in</div>
              </div>
              {appUsers.map((u, i) => {
                const roleColor = u.role === "admin" ? "var(--teal-l)" : u.role === "owner" ? "var(--accent)" : "var(--text3)";
                const roleBg = u.role === "admin" ? "var(--teal-s)" : u.role === "owner" ? "var(--accent-s)" : "var(--bg2)";
                return (
                  <div key={u.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px 140px", padding: "12px 20px", borderBottom: i < appUsers.length - 1 ? "1px solid var(--border)" : "none", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{u.firstName} {u.lastName}</div>
                      {u.linkedProperty && <div style={{ fontSize: 11, color: "var(--text3)" }}>{u.linkedProperty}</div>}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text2)" }}>{u.email}</div>
                    <div>
                      <select defaultValue={u.role} onChange={e => updateUserRole(u.id, e.target.value)}
                        style={{ padding: "3px 8px", borderRadius: 100, border: "none", background: roleBg, color: roleColor, fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", appearance: "none" as const, textAlign: "center" as const, minWidth: 80 }}>
                        <option value="admin">Admin</option>
                        <option value="owner">Owner</option>
                        <option value="house_manager">House Mgr</option>
                        <option value="none">None</option>
                      </select>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text3)" }}>
                      {u.lastSignInAt ? new Date(u.lastSignInAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Never"}
                    </div>
                  </div>
                );
              })}
              {appUsers.length === 0 && !usersLoading && <div style={{ padding: 20, color: "var(--text3)", fontSize: 13 }}>No users found.</div>}
            </div>
          </div>
        )}

        {/* PLACEHOLDER */}
        {activePage !== "dashboard" && activePage !== "expenses" && activePage !== "deposits" && activePage !== "reports" && activePage !== "housekeeping" && activePage !== "properties" && activePage !== "users" && (
          <div style={{ padding: "32px 40px" }}><h1 style={h1s}>{navItems.find(n => n.id === activePage)?.label || ""}</h1><p style={{ fontSize: 14, color: "var(--text3)", marginTop: 20 }}>Coming soon — this module will be built next.</p></div>
        )}
      </main>
    </div>
  );
}