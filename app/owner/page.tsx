"use client";

import { useEffect, useState } from "react";
import { useUser, UserButton } from "@clerk/nextjs";
import FirstLoginGate from "@/components/FirstLoginGate";

type Report = {
  id: string; month: string; status: string; startingBalance: number;
  totalExpenses: number; totalDeposits: number; finalBalance: number;
  exchangeRate: number;
  categories: { cleaningSupplies: number; groceries: number; maintenance: number; miscellaneous: number; utilities: number; villaStaff: number };
};
type Expense = { id: string; description: string; amount: number; category: string; date: string; receiptUrl: string; monthYear: string };
type Deposit = { id: string; amount: number; date: string; notes: string; monthYear: string };
type MaintTask = { id: string; title: string; type: string; status: string; priority: string; vendorName: string; scheduledDate: string; completedDate: string; cost: number; notes: string; expenseCreated: boolean; attachments: { url: string; filename: string }[]; photos: { url: string; filename: string }[]; approvalStatus: string; approvedBy: string; approvalDate: string };
type Visit = { id: string; visitName: string; guestName: string; visitType: string; checkIn: string; checkOut: string; status: string; notes: string; adults: number; children: number; published: boolean };
type ItineraryEvent = { id: string; eventName: string; visitId: string; date: string; time: string; details: string; status: string; eventType: string; showVendor: boolean; vendorName: string; total: number; currency: string; extraDetails: Record<string, any> };

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
  const [enabledModules, setEnabledModules] = useState<string[]>(["home", "financials", "maintenance", "calendar", "concierge", "help"]);
  const [helpArticles, setHelpArticles] = useState<any[]>([]);
  const [helpLoading, setHelpLoading] = useState(false);
  const [helpSelectedId, setHelpSelectedId] = useState<string | null>(null);
  const [helpSearch, setHelpSearch] = useState("");
  const [maintTasks, setMaintTasks] = useState<MaintTask[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [itineraryEvents, setItineraryEvents] = useState<ItineraryEvent[]>([]);
  const [propertyId, setPropertyId] = useState("");
  const [expandedMaintId, setExpandedMaintId] = useState<string | null>(null);
  const [showRegisterVisit, setShowRegisterVisit] = useState(false);
  const [newVisitCheckIn, setNewVisitCheckIn] = useState("");
  const [newVisitCheckOut, setNewVisitCheckOut] = useState("");
  const [newVisitAdults, setNewVisitAdults] = useState(2);
  const [newVisitChildren, setNewVisitChildren] = useState(0);
  const [newVisitName, setNewVisitName] = useState("");
  const [newVisitGuestName, setNewVisitGuestName] = useState("");
  const [newVisitType, setNewVisitType] = useState("Owner");
  const [newVisitNotes, setNewVisitNotes] = useState("");
  const [addingVisit, setAddingVisit] = useState(false);
  const [approvingMaint, setApprovingMaint] = useState<string | null>(null);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [showBalanceHistory, setShowBalanceHistory] = useState(false);

  useEffect(() => {
    fetch("/api/platform-config").then(r => r.json()).then(d => {
      const roles: { roleId: string; modules: string[]; active: boolean }[] = d.roles || [];
      const ownerRole = roles.find(r => r.roleId === "owner");
      if (ownerRole && ownerRole.active) {
        const mods = ownerRole.modules.includes("home") ? ownerRole.modules : ["home", ...ownerRole.modules];
        setEnabledModules(mods);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (activePage === "help" && helpArticles.length === 0) {
      setHelpLoading(true);
      fetch("/api/help?audience=owner").then(r => r.json()).then(d => {
        setHelpArticles(d.articles || []);
        if ((d.articles || []).length > 0) setHelpSelectedId(d.articles[0].id);
        setHelpLoading(false);
      }).catch(() => setHelpLoading(false));
    }
  }, [activePage]);

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
          setMaintTasks(d.maintTasks || []);
          setVisits(d.visits || []);
          setItineraryEvents(d.itineraryEvents || []);
          setPropertyId(d.propertyId || "");
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

  if (loading) return <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text3)", fontFamily: "var(--fb)", fontSize: 13, letterSpacing: "0.02em" }}>Loading your property data…</div>;
  if (!linkedProperty) return <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", color: "var(--text2)", fontFamily: "var(--fb)", textAlign: "center" as const, padding: 40 }}><img src="/axvia-icon.svg" alt="Property Management OS" style={{ height: 52, marginBottom: 22, opacity: 0.65 }} /><h2 style={{ fontFamily: "var(--fd)", fontSize: 26, fontWeight: 400, marginBottom: 10, color: "var(--text)" }}>No property linked</h2><p style={{ fontSize: 14, color: "var(--text3)", maxWidth: 360, lineHeight: 1.6 }}>Contact your property manager to link your property to this account.</p></div>;
  if (error) return <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--red)", fontFamily: "var(--fb)" }}>{error}</div>;

  const navItems = [
    { id: "home", icon: "⌂", label: "Home" },
    { id: "financials", icon: "◈", label: "Financials" },
    { id: "maintenance", icon: "⟡", label: "Maintenance" },
    { id: "calendar", icon: "▦", label: "Availability" },
    { id: "concierge", icon: "✦", label: "Concierge" },
    { id: "help", icon: "?", label: "Help" },
  ];

  // YTD totals for chart
  const ytdEntries = Object.entries(ytdByCategory).filter(([_, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const ytdTotal = ytdEntries.reduce((sum, [_, v]) => sum + v, 0);

  return (
    <div style={{ fontFamily: "var(--fb)" }}>
      <FirstLoginGate />
      <style>{`
        @media(max-width:900px){
          .owner-shell{grid-template-columns:1fr !important;}
          .owner-sidebar{display:none !important;}
          .owner-main{padding:24px 18px !important;max-width:100% !important;}
          .owner-stats{grid-template-columns:1fr 1fr !important;gap:12px !important;}
          .owner-hero h1{font-size:30px !important;}
          .fin-header{flex-direction:column !important;gap:18px !important;align-items:flex-start !important;}
          .fin-stats{grid-template-columns:1fr 1fr !important;gap:12px !important;}
          .exp-table-grid{grid-template-columns:74px 1fr 88px !important;}
          .exp-table-cat,.exp-table-receipt-hd{display:none !important;}
          .exp-cat-cell,.exp-receipt-cell{display:none !important;}
          .fin-section-title{font-size:30px !important;}
          .month-selector{align-self:flex-start !important;}
          .owner-2col{grid-template-columns:1fr !important;gap:12px !important;}
          .visit-form-grid{grid-template-columns:1fr 1fr !important;}
        }
        @media(max-width:520px){
          .owner-stats{grid-template-columns:1fr !important;}
          .fin-stats{grid-template-columns:1fr !important;}
          .exp-table-grid{grid-template-columns:60px 1fr 76px !important;}
          .visit-form-grid{grid-template-columns:1fr !important;}
        }
        .nav-item{transition:background var(--dur) var(--ease),color var(--dur) var(--ease);}
        .nav-item:hover{background:var(--bg3);}
        .stat-card{transition:transform var(--dur) var(--ease),box-shadow var(--dur) var(--ease),border-color var(--dur) var(--ease);}
        .stat-card:hover{transform:translateY(-1px);border-color:var(--border2);box-shadow:var(--shadow-md);}
        .panel{transition:border-color var(--dur) var(--ease);}
        .month-btn{transition:background var(--dur) var(--ease),color var(--dur) var(--ease),border-color var(--dur) var(--ease);}
        .month-btn:not(:disabled):hover{background:var(--bg3);color:var(--accent);border-color:var(--accent-line);}
        .receipt-link{transition:color var(--dur) var(--ease),background var(--dur) var(--ease);padding:3px 9px;border-radius:4px;background:var(--teal-s);}
        .receipt-link:hover{background:var(--teal-l);color:var(--bg) !important;}
        .stmt-row{transition:background var(--dur) var(--ease);}
        .stmt-row:hover{background:var(--bg2);}
        .fin-num{font-variant-numeric:tabular-nums;font-feature-settings:"tnum";}
        .gold-rule{display:block;width:36px;height:1px;background:var(--accent-line);margin-top:10px;}
        .maint-row{transition:background var(--dur) var(--ease);}
        .maint-row:hover{background:var(--bg2);}
        .cal-day{transition:transform var(--dur) var(--ease),box-shadow var(--dur) var(--ease);}
        .cal-day:hover{transform:scale(1.04);box-shadow:var(--shadow-sm);}
        .timeline-event{transition:background var(--dur) var(--ease);}
        .timeline-event:hover{background:var(--bg2);}
        .pill-btn{transition:all var(--dur) var(--ease);}
        .pill-btn:hover:not(:disabled){border-color:var(--accent-line);color:var(--accent);}
        .approve-btn{transition:background var(--dur) var(--ease),transform var(--dur) var(--ease);}
        .approve-btn:hover:not(:disabled){background:var(--green) !important;filter:brightness(1.08);transform:translateY(-1px);}
        .stmt-doc{background:var(--bg2);border:1px solid var(--border);border-radius:14px;box-shadow:var(--shadow-md);overflow:hidden;}
        .stmt-section{padding:24px 30px;}
        .stmt-divider{height:1px;background:var(--border);margin:0 30px;}
        .collapse-btn{display:flex;align-items:center;justify-content:space-between;width:100%;padding:14px 22px;background:transparent;border:1px solid var(--border);border-radius:12px;cursor:pointer;font-family:inherit;transition:all var(--dur) var(--ease);}
        .collapse-btn:hover{border-color:var(--accent-line);background:var(--bg2);}
        .chev{transition:transform var(--dur) var(--ease);display:inline-block;}
        .chev.open{transform:rotate(90deg);}
        .print-btn{display:flex;align-items:center;gap:7px;padding:9px 16px;border-radius:100px;border:1px solid var(--border2);background:var(--bg2);color:var(--text2);font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;cursor:pointer;font-family:inherit;box-shadow:var(--shadow-sm);transition:all var(--dur) var(--ease);}
        .print-btn:hover{border-color:var(--accent-line);color:var(--accent);}
        @media print {
          body{background:#fff !important;}
          .owner-sidebar,.owner-mobile-bar,.no-print{display:none !important;}
          .owner-shell{grid-template-columns:1fr !important;}
          .owner-main{padding:0 !important;max-width:100% !important;}
          .panel,.stmt-doc,.stat-card{box-shadow:none !important;border-color:#ccc !important;break-inside:avoid;}
          .fin-header{margin-bottom:18px !important;}
          h1{color:#000 !important;}
        }
      `}</style>
      {theme === "light" && <style>{`
        :root {
          --bg: #F4F1EC !important; --bg2: #FFFFFF !important; --bg3: #FFFFFF !important; --bg4: #EFEBE3 !important;
          --text: #15202B !important; --text2: #4A5568 !important; --text3: #8B96A4 !important;
          --border: rgba(15,30,45,0.07) !important; --border2: rgba(15,30,45,0.13) !important; --border3: rgba(15,30,45,0.20) !important;
          --accent: #A8842A !important; --accent-h: #B8942E !important; --accent-s: rgba(168,132,42,0.10) !important; --accent-line: rgba(168,132,42,0.40) !important;
          --teal: #237A88 !important; --teal-l: #196372 !important; --teal-s: rgba(35,122,136,0.09) !important;
          --green: #2D8B57 !important; --green-s: rgba(45,139,87,0.09) !important;
          --red: #B84A4A !important; --red-s: rgba(184,74,74,0.09) !important;
          --blue: #3F7AB0 !important; --blue-s: rgba(63,122,176,0.09) !important;
          --orange: #B5733B !important; --orange-s: rgba(181,115,59,0.09) !important;
        }
      `}</style>}

      <div className="owner-shell" style={{ display: "grid", gridTemplateColumns: "264px 1fr", minHeight: "100vh" }}>

        {/* Mobile top bar */}
        <div className="owner-mobile-bar" style={{ display: "none" }}>
          <style>{`
            @media(max-width:900px){
              .owner-mobile-bar{display:flex !important;padding:14px 18px;background:var(--bg2);border-bottom:1px solid var(--border);flex-wrap:wrap;gap:10px;position:sticky;top:0;z-index:10;}
            }
          `}</style>
          <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", marginBottom: 4 }}>
            <img src="/axvia-icon.svg" alt="Property Management OS" style={{ height: 24 }} />
            <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.01em" }}>{property?.name}</span>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
              <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} style={{ width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, border: "1px solid var(--border2)", background: "transparent", color: "var(--text2)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>{theme === "dark" ? "☀" : "🌙"}</button>
              <UserButton appearance={{ elements: { avatarBox: { width: 26, height: 26 } } }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
            {navItems.filter(n => enabledModules.includes(n.id)).map(n => (
              <button key={n.id} onClick={() => setActivePage(n.id)} style={{ padding: "6px 12px", borderRadius: 6, border: activePage === n.id ? "1px solid var(--accent-line)" : "1px solid var(--border)", background: activePage === n.id ? "var(--accent-s)" : "transparent", color: activePage === n.id ? "var(--accent)" : "var(--text3)", fontSize: 10, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit" }}>{n.label}</button>
            ))}
          </div>
        </div>

        {/* SIDEBAR */}
        <div className="owner-sidebar" style={{ background: "var(--bg2)", borderRight: "1px solid var(--border)", position: "sticky", top: 0, height: "100vh", display: "flex", flexDirection: "column" as const, overflow: "hidden" }}>
          <div style={{ padding: "26px 22px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 13 }}>
            <img src="/axvia-icon.svg" alt="Property Management OS" style={{ height: 30 }} />
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "var(--text)" }}>Property Management OS</div>
              <div style={{ fontSize: 10, color: "var(--text3)", letterSpacing: "0.06em", marginTop: 2 }}>by Axvia Solutions</div>
            </div>
          </div>
          <div style={{ padding: "20px 14px 12px" }}>
            <div style={{ padding: "16px 16px", borderRadius: 12, background: "var(--bg3)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
              <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--text3)", marginBottom: 7, fontWeight: 700 }}>Property</div>
              <div style={{ fontFamily: "var(--fd)", fontSize: 21, lineHeight: 1.15, marginBottom: 5, color: "var(--text)" }}>{property?.name}</div>
              <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 11 }}>{property?.owner}</div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 9, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "var(--green)", background: "var(--green-s)", padding: "4px 10px", borderRadius: 100 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)" }} /> Active</div>
            </div>
          </div>
          <div style={{ padding: "8px 14px 8px" }}>
            <div style={{ fontSize: 9, textTransform: "uppercase" as const, letterSpacing: "0.16em", color: "var(--text3)", padding: "8px 14px 10px", fontWeight: 700 }}>Navigation</div>
            {navItems.filter(n => enabledModules.includes(n.id)).map(n => (
              <div key={n.id} className="nav-item" onClick={() => setActivePage(n.id)}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 8, fontSize: 13, fontWeight: activePage === n.id ? 600 : 500, color: activePage === n.id ? "var(--accent)" : "var(--text2)", background: activePage === n.id ? "var(--accent-s)" : "transparent", borderLeft: activePage === n.id ? "2px solid var(--accent)" : "2px solid transparent", cursor: "pointer", marginBottom: 2 }}>
                <span style={{ width: 18, textAlign: "center" as const, fontSize: 14, opacity: activePage === n.id ? 1 : 0.55 }}>{n.icon}</span> {n.label}
              </div>
            ))}
          </div>
          <div style={{ flex: 1, minHeight: 0 }} />
          <div style={{ flexShrink: 0, padding: "10px 22px", borderTop: "1px solid var(--border)" }}>
            <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border2)", background: "transparent", color: "var(--text3)", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit", width: "100%" }}>{theme === "dark" ? "Light Mode" : "Dark Mode"}</button>
          </div>
          <div style={{ flexShrink: 0, padding: "12px 22px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <span style={{ fontSize: 12, color: "var(--text2)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ownerName}</span>
            <UserButton />
          </div>
        </div>

        {/* MAIN */}
        <div style={{ overflowY: "auto" as const, background: "var(--bg)" }}>
          <div className="owner-main" style={{ padding: "40px 48px 48px", maxWidth: 1080, margin: "0 auto" }}>
            {/* Page header for Home */}
            {activePage === "home" && (
              <div className="owner-hero" style={{ marginBottom: 32 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 10 }}>Welcome back</div>
                <h1 style={{ fontFamily: "var(--fd)", fontSize: 38, fontWeight: 400, lineHeight: 1.05, marginBottom: 8, color: "var(--text)", letterSpacing: "-0.005em" }}>{property?.name}</h1>
                <div style={{ fontSize: 13, color: "var(--text2)", letterSpacing: "0.01em" }}>{property?.owner} <span style={{ color: "var(--text3)", margin: "0 8px" }}>·</span> {cur}</div>
                <span className="gold-rule" />
              </div>
            )}
            {/* HOME */}
            {activePage === "home" && (<>
              <div className="owner-stats" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 28 }}>
                <div className="stat-card" style={{ padding: "20px 22px", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "var(--shadow-sm)" }}>
                  <div style={{ fontSize: 9, textTransform: "uppercase" as const, letterSpacing: "0.16em", color: "var(--text3)", marginBottom: 12, fontWeight: 700 }}>Account Balance</div>
                  <div className="fin-num" style={{ fontFamily: "var(--fd)", fontSize: 28, lineHeight: 1, fontWeight: 400, color: isNeg ? "var(--red)" : "var(--text)" }}>{isNeg ? "−" : ""}{fmt(currentBalance)}</div>
                  <div style={{ fontSize: 9, marginTop: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 100, display: "inline-flex", letterSpacing: "0.1em", textTransform: "uppercase", color: isNeg ? "var(--red)" : "var(--green)", background: isNeg ? "var(--red-s)" : "var(--green-s)" }}>{isNeg ? "Needs deposit" : "Healthy"}</div>
                </div>
                <div className="stat-card" style={{ padding: "20px 22px", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "var(--shadow-sm)" }}>
                  <div style={{ fontSize: 9, textTransform: "uppercase" as const, letterSpacing: "0.16em", color: "var(--text3)", marginBottom: 12, fontWeight: 700 }}>Reports Available</div>
                  <div className="fin-num" style={{ fontFamily: "var(--fd)", fontSize: 28, lineHeight: 1, fontWeight: 400, color: "var(--text)" }}>{reports.length}</div>
                  <div style={{ fontSize: 9, marginTop: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 100, display: "inline-flex", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text2)", background: "var(--bg4)" }}>Monthly statements</div>
                </div>
                <div className="stat-card" style={{ padding: "20px 22px", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "var(--shadow-sm)" }}>
                  <div style={{ fontSize: 9, textTransform: "uppercase" as const, letterSpacing: "0.16em", color: "var(--text3)", marginBottom: 12, fontWeight: 700 }}>Currency</div>
                  <div className="fin-num" style={{ fontFamily: "var(--fd)", fontSize: 28, lineHeight: 1, fontWeight: 400, color: "var(--accent)" }}>{cur}</div>
                  <div style={{ fontSize: 9, marginTop: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 100, display: "inline-flex", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text2)", background: "var(--bg4)" }}>{cur === "USD" ? "US Dollar" : "Mexican Peso"}</div>
                </div>
              </div>

              {/* Two-column layout: Upcoming maintenance + Recent activity */}
              <div className="owner-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {/* Upcoming maintenance */}
                <div className="panel" style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
                  <div style={{ padding: "16px 22px", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ fontFamily: "var(--fd)", fontSize: 18, fontWeight: 400, color: "var(--text)" }}>Upcoming maintenance</span>
                  </div>
                  <div style={{ padding: "8px 22px 18px" }}>
                    {maintTasks.filter(t => t.status === "Scheduled" || t.status === "Upcoming").slice(0, 3).map((t, i, arr) => (
                      <div key={t.id} style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none", alignItems: "flex-start" }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", marginTop: 6, flexShrink: 0, background: t.status === "Scheduled" ? "var(--accent)" : "var(--blue)", boxShadow: t.status === "Scheduled" ? "0 0 0 3px var(--accent-s)" : "0 0 0 3px var(--blue-s)" }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.45 }}>{t.title}</div>
                          <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>{fmtDate(t.scheduledDate)}{t.vendorName ? ` · ${t.vendorName}` : ""}</div>
                        </div>
                      </div>
                    ))}
                    {maintTasks.filter(t => t.status === "Scheduled" || t.status === "Upcoming").length === 0 && (
                      <div style={{ padding: "20px 0", color: "var(--text3)", fontSize: 13, textAlign: "center" as const }}>No upcoming tasks.</div>
                    )}
                    {enabledModules.includes("maintenance") && (
                      <div onClick={() => setActivePage("maintenance")} style={{ marginTop: 14, fontSize: 11, color: "var(--accent)", cursor: "pointer", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>View full maintenance program →</div>
                    )}
                  </div>
                </div>

                {/* Recent activity */}
                <div className="panel" style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
                  <div style={{ padding: "16px 22px", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ fontFamily: "var(--fd)", fontSize: 18, fontWeight: 400, color: "var(--text)" }}>Recent activity</span>
                  </div>
                  <div style={{ padding: "8px 22px 18px" }}>
                    {(() => {
                      const combined: { id: string; type: string; label: string; amount: number; date: string; color: string }[] = [
                        ...expenses.slice(-20).map(e => ({ id: e.id, type: "expense", label: e.description || e.category, amount: -e.amount, date: e.date, color: "var(--red)" })),
                        ...deposits.slice(0, 10).map(d => ({ id: d.id, type: "deposit", label: d.notes || "Deposit received", amount: d.amount, date: d.date, color: "var(--green)" })),
                        ...maintTasks.filter(t => t.status === "Completed").slice(0, 5).map(t => ({ id: t.id, type: "maint", label: `${t.title} completed`, amount: t.cost || 0, date: t.completedDate || t.scheduledDate, color: "var(--teal-l)" })),
                      ].sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 5);
                      if (combined.length === 0) return <div style={{ padding: "20px 0", color: "var(--text3)", fontSize: 13, textAlign: "center" as const }}>No recent activity.</div>;
                      return combined.map((item, i) => (
                        <div key={item.id + item.type} style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: i < combined.length - 1 ? "1px solid var(--border)" : "none", alignItems: "flex-start" }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", marginTop: 6, flexShrink: 0, background: item.color, boxShadow: `0 0 0 3px ${item.color === "var(--red)" ? "var(--red-s)" : item.color === "var(--green)" ? "var(--green-s)" : "var(--teal-s)"}` }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, lineHeight: 1.45, color: "var(--text)" }}>{item.label}{item.amount !== 0 ? <> <span className="fin-num" style={{ color: item.color, fontWeight: 500 }}>— {item.amount < 0 ? "" : "+"}{fmt(Math.abs(item.amount))} {cur}</span></> : null}</div>
                            <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>{fmtDate(item.date)}</div>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>
            </>)}

            {/* FINANCIALS */}
            {activePage === "financials" && (<>
              {/* Header + month selector + print */}
              <div className="fin-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 10 }}>Owner Statement</div>
                  <h1 className="fin-section-title" style={{ fontFamily: "var(--fd)", fontSize: 38, fontWeight: 400, lineHeight: 1.05, marginBottom: 8, color: "var(--text)", letterSpacing: "-0.005em" }}>Financial Statement</h1>
                  <div style={{ fontSize: 13, color: "var(--text2)" }}>Monthly account summary for {property?.name}</div>
                  <span className="gold-rule" />
                </div>
                <div className="no-print" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div className="month-selector" style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 14px", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 100, boxShadow: "var(--shadow-sm)" }}>
                    <button className="month-btn" onClick={() => setCurrentMonth(Math.min(currentMonth + 1, reports.length - 1))} disabled={currentMonth >= reports.length - 1} style={{ width: 30, height: 30, borderRadius: "50%", border: "1px solid var(--border2)", background: "transparent", color: currentMonth >= reports.length - 1 ? "var(--text3)" : "var(--text2)", cursor: currentMonth >= reports.length - 1 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, opacity: currentMonth >= reports.length - 1 ? 0.35 : 1 }}>‹</button>
                    <div className="fin-num" style={{ fontFamily: "var(--fd)", fontSize: 17, minWidth: 158, textAlign: "center" as const, color: "var(--text)" }}>{report?.month || "No reports"}</div>
                    <button className="month-btn" onClick={() => setCurrentMonth(Math.max(currentMonth - 1, 0))} disabled={currentMonth <= 0} style={{ width: 30, height: 30, borderRadius: "50%", border: "1px solid var(--border2)", background: "transparent", color: currentMonth <= 0 ? "var(--text3)" : "var(--text2)", cursor: currentMonth <= 0 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, opacity: currentMonth <= 0 ? 0.35 : 1 }}>›</button>
                  </div>
                  <button className="print-btn" onClick={() => window.print()} aria-label="Print statement" title="Print or save as PDF"><span style={{ fontSize: 13 }}>⎙</span> Print</button>
                </div>
              </div>

              {report ? (<>
                {/* KPI strip */}
                <div className="fin-stats" style={{ display: "grid", gridTemplateColumns: cur === "USD" ? "repeat(4, 1fr)" : "repeat(3, 1fr)", gap: 14, marginBottom: 22 }}>
                  <div className="stat-card" style={{ padding: "16px 20px", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "var(--shadow-sm)" }}>
                    <div style={{ fontSize: 9, textTransform: "uppercase" as const, letterSpacing: "0.16em", color: "var(--text3)", marginBottom: 10, fontWeight: 700 }}>Deposits</div>
                    <div className="fin-num" style={{ fontFamily: "var(--fd)", fontSize: 24, lineHeight: 1, fontWeight: 400, color: "var(--teal)" }}>{fmt(report.totalDeposits)}</div>
                  </div>
                  <div className="stat-card" style={{ padding: "16px 20px", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "var(--shadow-sm)" }}>
                    <div style={{ fontSize: 9, textTransform: "uppercase" as const, letterSpacing: "0.16em", color: "var(--text3)", marginBottom: 10, fontWeight: 700 }}>Total Charges</div>
                    <div className="fin-num" style={{ fontFamily: "var(--fd)", fontSize: 24, lineHeight: 1, fontWeight: 400, color: "var(--text)" }}>{fmt(report.totalExpenses)}</div>
                  </div>
                  {cur === "USD" && <div className="stat-card" style={{ padding: "16px 20px", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "var(--shadow-sm)" }}>
                    <div style={{ fontSize: 9, textTransform: "uppercase" as const, letterSpacing: "0.16em", color: "var(--text3)", marginBottom: 10, fontWeight: 700 }}>Exchange Rate</div>
                    <div className="fin-num" style={{ fontFamily: "var(--fd)", fontSize: 24, lineHeight: 1, fontWeight: 400, color: "var(--text)" }}>{report.exchangeRate > 0 ? report.exchangeRate.toFixed(2) : "—"}</div>
                  </div>}
                  <div className="stat-card" style={{ padding: "16px 20px", background: "var(--bg2)", border: "1px solid var(--accent-line)", borderRadius: 12, boxShadow: "var(--shadow-md)" }}>
                    <div style={{ fontSize: 9, textTransform: "uppercase" as const, letterSpacing: "0.16em", color: "var(--accent)", marginBottom: 10, fontWeight: 700 }}>Final Balance</div>
                    <div className="fin-num" style={{ fontFamily: "var(--fd)", fontSize: 24, lineHeight: 1, fontWeight: 400, color: report.finalBalance < 0 ? "var(--red)" : "var(--text)" }}>{report.finalBalance < 0 ? "−" : ""}{fmt(report.finalBalance)}</div>
                  </div>
                </div>

                {/* THE STATEMENT DOCUMENT — single bordered page containing summary, expenses, deposits */}
                <div className="stmt-doc" style={{ marginBottom: 22 }}>
                  {/* Document header */}
                  <div style={{ padding: "22px 30px 18px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid var(--border)", background: "var(--bg2)" }}>
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 5 }}>Statement of Account</div>
                      <div style={{ fontFamily: "var(--fd)", fontSize: 22, fontWeight: 400, color: "var(--text)", lineHeight: 1.15 }}>{property?.name}</div>
                      <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 3 }}>{property?.owner}</div>
                    </div>
                    <div style={{ textAlign: "right" as const }}>
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--text3)", marginBottom: 5 }}>Period</div>
                      <div style={{ fontFamily: "var(--fd)", fontSize: 18, color: "var(--text)" }}>{report.month}</div>
                      <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 3, letterSpacing: "0.04em" }}>Currency: {cur}</div>
                    </div>
                  </div>

                  {/* Account Summary block */}
                  <div className="stmt-section">
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text3)", marginBottom: 12 }}>Account Summary</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: "1px solid var(--border)" }}>
                      <div style={{ fontSize: 13, color: "var(--text2)", fontWeight: 500 }}>Starting Balance</div>
                      <div className="fin-num" style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>{fmt(report.startingBalance)} <span style={{ color: "var(--text3)", fontSize: 10, marginLeft: 4, fontWeight: 600 }}>{cur}</span></div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: "1px solid var(--border)" }}>
                      <div style={{ fontSize: 13, color: "var(--text2)", fontWeight: 500 }}>Owner Deposits</div>
                      <div className="fin-num" style={{ fontSize: 14, fontWeight: 500, color: "var(--green)" }}>+{fmt(report.totalDeposits)} <span style={{ color: "var(--text3)", fontSize: 10, marginLeft: 4, fontWeight: 600 }}>{cur}</span></div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0" }}>
                      <div style={{ fontSize: 13, color: "var(--text2)", fontWeight: 500 }}>Total Operating Expenses <span style={{ color: "var(--text3)", marginLeft: 6, fontSize: 11 }}>({monthExpenses.length} items)</span></div>
                      <div className="fin-num" style={{ fontSize: 14, fontWeight: 500, color: "var(--red)" }}>−{fmt(report.totalExpenses)} <span style={{ color: "var(--text3)", fontSize: 10, marginLeft: 4, fontWeight: 600 }}>{cur}</span></div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0 4px", borderTop: "2px solid var(--border2)", marginTop: 6 }}>
                      <div><div style={{ fontSize: 11, fontWeight: 700, color: "var(--text)", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>Ending Balance</div><div style={{ fontSize: 11, color: "var(--text3)", marginTop: 3 }}>Carried forward to next period</div></div>
                      <div className="fin-num" style={{ fontSize: 24, fontWeight: 400, fontFamily: "var(--fd)", color: report.finalBalance < 0 ? "var(--red)" : "var(--text)" }}>{report.finalBalance < 0 ? "−" : ""}{fmt(report.finalBalance)} <span style={{ color: "var(--text3)", fontSize: 11, marginLeft: 4, fontWeight: 600, fontFamily: "var(--fb)" }}>{cur}</span></div>
                    </div>
                  </div>

                  <div className="stmt-divider" />

                  {/* Expense Ledger block */}
                  <div className="stmt-section">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text3)" }}>Expense Ledger</div>
                      <div style={{ fontSize: 10, color: "var(--text3)", fontWeight: 600 }}>{monthExpenses.length} line items</div>
                    </div>
                    {/* Table header */}
                    <div className="exp-table-grid" style={{ display: "grid", gridTemplateColumns: "96px 1fr 108px 124px 64px", padding: "10px 0 10px", borderBottom: "1px solid var(--border2)" }}>
                      <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.12em", color: "var(--text3)" }}>Date</div>
                      <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.12em", color: "var(--text3)" }}>Description</div>
                      <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.12em", color: "var(--text3)", textAlign: "right" as const }}>Amount</div>
                      <div className="exp-table-cat" style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.12em", color: "var(--text3)", textAlign: "center" as const }}>Category</div>
                      <div className="exp-table-receipt-hd" style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.12em", color: "var(--text3)", textAlign: "center" as const }}>Receipt</div>
                    </div>
                    {/* Expense rows */}
                    {monthExpenses.map((e, i) => (
                      <div key={e.id} className="exp-table-grid stmt-row" style={{ display: "grid", gridTemplateColumns: "96px 1fr 108px 124px 64px", padding: "11px 0", borderBottom: i < monthExpenses.length - 1 ? "1px solid var(--border)" : "none", alignItems: "center" }}>
                        <div className="fin-num" style={{ fontSize: 12, color: "var(--text3)" }}>{fmtDate(e.date)}</div>
                        <div style={{ fontSize: 13, color: "var(--text)", paddingRight: 12 }}>{e.description || "Expense"}</div>
                        <div className="fin-num" style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", textAlign: "right" as const }}>{fmt(e.amount)}</div>
                        <div className="exp-cat-cell" style={{ textAlign: "center" as const }}><span style={{ fontSize: 10, padding: "3px 9px", borderRadius: 4, background: "var(--bg4)", color: "var(--text2)", fontWeight: 600, whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis", maxWidth: 116, display: "inline-block" }}>{e.category}</span></div>
                        <div className="exp-receipt-cell" style={{ textAlign: "center" as const }}>{e.receiptUrl ? <a href={e.receiptUrl} target="_blank" rel="noopener noreferrer" className="receipt-link" style={{ color: "var(--teal)", textDecoration: "none", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>View</a> : <span style={{ fontSize: 11, color: "var(--text3)" }}>—</span>}</div>
                      </div>
                    ))}
                    {monthExpenses.length === 0 && <div style={{ padding: "26px 0", color: "var(--text3)", fontSize: 13, textAlign: "center" as const }}>No expenses for this month.</div>}
                    {/* Total row */}
                    {monthExpenses.length > 0 && (
                      <div className="exp-table-grid" style={{ display: "grid", gridTemplateColumns: "96px 1fr 108px 124px 64px", padding: "13px 0 4px", borderTop: "2px solid var(--border2)", marginTop: 4 }}>
                        <div />
                        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text2)", letterSpacing: "0.12em", textTransform: "uppercase" as const }}>Total Expenses</div>
                        <div className="fin-num" style={{ fontSize: 16, fontWeight: 400, fontFamily: "var(--fd)", color: "var(--text)", textAlign: "right" as const }}>{fmt(report.totalExpenses)}</div>
                        <div /><div />
                      </div>
                    )}
                  </div>

                  {/* Deposits block (inline within statement document) */}
                  {monthDeposits.length > 0 && (<>
                    <div className="stmt-divider" />
                    <div className="stmt-section">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text3)" }}>Deposits Received</div>
                        <div style={{ fontSize: 10, color: "var(--text3)", fontWeight: 600 }}>{monthDeposits.length} {monthDeposits.length === 1 ? "deposit" : "deposits"}</div>
                      </div>
                      {monthDeposits.map((d, i) => (
                        <div key={d.id} className="stmt-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: i < monthDeposits.length - 1 ? "1px solid var(--border)" : "none" }}>
                          <div style={{ fontSize: 13, color: "var(--text2)" }}><span className="fin-num" style={{ color: "var(--text3)", marginRight: 12 }}>{fmtDate(d.date)}</span>{d.notes ? d.notes : "Owner deposit"}</div>
                          <div className="fin-num" style={{ fontSize: 14, fontWeight: 500, color: "var(--green)" }}>+{fmt(d.amount)} <span style={{ color: "var(--text3)", fontSize: 10, marginLeft: 4, fontWeight: 600 }}>{cur}</span></div>
                        </div>
                      ))}
                    </div>
                  </>)}
                </div>

                {/* SECONDARY: Categories + YTD side by side */}
                {(report.categories || ytdEntries.length > 0) && (
                  <div className="owner-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
                    {/* Category Breakdown (this month) */}
                    {report.categories && (
                      <div className="panel" style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
                        <div style={{ padding: "16px 22px", borderBottom: "1px solid var(--border)" }}>
                          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text3)", marginBottom: 3 }}>This Month</div>
                          <span style={{ fontFamily: "var(--fd)", fontSize: 17, fontWeight: 400, color: "var(--text)" }}>By Category</span>
                        </div>
                        <div style={{ padding: "18px 22px 20px" }}>
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
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
                                  <span style={{ color: "var(--text2)", fontWeight: 500 }}>{c.name}</span>
                                  <span className="fin-num" style={{ color: "var(--text2)", fontWeight: 500 }}>{fmt(c.val)} <span style={{ color: "var(--text3)", marginLeft: 4 }}>({pct.toFixed(0)}%)</span></span>
                                </div>
                                <div style={{ height: 8, background: "var(--bg4)", borderRadius: 100, overflow: "hidden" }}>
                                  <div style={{ height: "100%", width: `${pct}%`, borderRadius: 100, background: catColors[c.name] || "var(--text3)", transition: "width 0.6s var(--ease)" }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* YTD Category Rollup */}
                    {ytdEntries.length > 0 && (
                      <div className="panel" style={{ background: "var(--bg2)", border: "1px solid var(--accent-line)", borderRadius: 12, overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
                        <div style={{ padding: "16px 22px", borderBottom: "1px solid var(--border)", background: "var(--accent-s)" }}>
                          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 3 }}>Year to Date</div>
                          <span style={{ fontFamily: "var(--fd)", fontSize: 17, fontWeight: 400, color: "var(--text)" }}>{new Date().getFullYear()} Rollup</span>
                        </div>
                        <div style={{ padding: "18px 22px 20px" }}>
                          <div className="fin-num" style={{ fontFamily: "var(--fd)", fontSize: 22, color: "var(--text)", marginBottom: 16, lineHeight: 1 }}>{fmt(ytdTotal)} <span style={{ color: "var(--text3)", fontSize: 11, marginLeft: 4, fontWeight: 600, fontFamily: "var(--fb)" }}>{cur}</span></div>
                          {ytdEntries.map(([cat, val]) => {
                            const pct = ytdTotal > 0 ? (val / ytdTotal) * 100 : 0;
                            return (
                              <div key={cat} style={{ marginBottom: 14 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
                                  <span style={{ color: "var(--text2)", fontWeight: 500 }}>{cat}</span>
                                  <span className="fin-num" style={{ color: "var(--text2)", fontWeight: 500 }}>{fmt(val)} <span style={{ color: "var(--text3)", marginLeft: 4 }}>({pct.toFixed(0)}%)</span></span>
                                </div>
                                <div style={{ height: 8, background: "var(--bg4)", borderRadius: 100, overflow: "hidden" }}>
                                  <div style={{ height: "100%", width: `${pct}%`, borderRadius: 100, background: catColors[cat] || "var(--text3)", transition: "width 0.6s var(--ease)" }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Balance History — collapsible */}
                {reports.length > 1 && (
                  <div className="no-print" style={{ marginBottom: 8 }}>
                    <button className="collapse-btn" onClick={() => setShowBalanceHistory(!showBalanceHistory)}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span className={`chev ${showBalanceHistory ? "open" : ""}`} style={{ fontSize: 11, color: "var(--text3)" }}>▸</span>
                        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text2)" }}>Balance History</span>
                        <span style={{ fontSize: 11, color: "var(--text3)" }}>({reports.length} months)</span>
                      </div>
                      <span style={{ fontSize: 10, color: "var(--text3)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>{showBalanceHistory ? "Hide" : "Show"}</span>
                    </button>
                    {showBalanceHistory && (
                      <div className="panel" style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderTop: "none", borderRadius: "0 0 12px 12px", marginTop: -1, overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
                        <div style={{ padding: "4px 22px 8px" }}>
                          {reports.map((r, i) => {
                            const neg = r.finalBalance < 0;
                            return (
                              <div key={r.id} className="stmt-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: i < reports.length - 1 ? "1px solid var(--border)" : "none" }}>
                                <span style={{ fontSize: 13, color: "var(--text2)", fontWeight: 500 }}>{r.month}</span>
                                <span className="fin-num" style={{ fontSize: 14, fontWeight: 500, color: neg ? "var(--red)" : "var(--text)" }}>{neg ? "−" : ""}{fmt(r.finalBalance)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>) : (
                <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: 50, textAlign: "center" as const, color: "var(--text3)", boxShadow: "var(--shadow-sm)" }}>
                  <div style={{ fontFamily: "var(--fd)", fontSize: 22, color: "var(--text2)", marginBottom: 8 }}>No reports yet</div>
                  <div style={{ fontSize: 13, maxWidth: 400, margin: "0 auto", lineHeight: 1.6 }}>Reports will appear here once your property manager publishes them.</div>
                </div>
              )}
            </>)}

            {/* MAINTENANCE */}
            {activePage === "maintenance" && (<>
              <div style={{ marginBottom: 32 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 10 }}>Property Care</div>
                <h1 style={{ fontFamily: "var(--fd)", fontSize: 38, fontWeight: 400, lineHeight: 1.05, marginBottom: 8, color: "var(--text)", letterSpacing: "-0.005em" }}>Maintenance Program</h1>
                <div style={{ fontSize: 13, color: "var(--text2)" }}>Preventive and reactive maintenance for {property?.name}</div>
                <span className="gold-rule" />
              </div>

              {/* This Month - Preventive */}
              <div className="panel" style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, marginBottom: 18, overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
                <div style={{ padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ fontFamily: "var(--fd)", fontSize: 18, fontWeight: 400, color: "var(--text)" }}>This Month</span>
                  <span style={{ padding: "4px 11px", borderRadius: 100, fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", background: "var(--accent-s)", color: "var(--accent)" }}>{maintTasks.filter(t => t.type !== "Reactive").length} tasks</span>
                </div>
                <div style={{ padding: "0 24px 6px" }}>
                  {maintTasks.filter(t => t.type !== "Reactive").length === 0 && (
                    <div style={{ padding: "26px 0", color: "var(--text3)", fontSize: 13, textAlign: "center" as const }}>No preventive tasks this month.</div>
                  )}
                  {maintTasks.filter(t => t.type !== "Reactive").map((t, i, arr) => {
                    const statusColor = t.status === "Completed" ? "var(--green)" : t.status === "Scheduled" ? "var(--accent)" : "var(--blue)";
                    const statusBg = t.status === "Completed" ? "var(--green-s)" : t.status === "Scheduled" ? "var(--accent-s)" : "var(--blue-s)";
                    const isExpanded = expandedMaintId === t.id;
                    return (
                      <div key={t.id} style={{ borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none" }}>
                        <div
                          className="maint-row"
                          onClick={() => setExpandedMaintId(isExpanded ? null : t.id)}
                          style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 4px", cursor: "pointer", borderRadius: 8 }}
                        >
                          <div style={{ width: 10, height: 10, borderRadius: "50%", flexShrink: 0, background: statusColor, boxShadow: `0 0 0 3px ${statusBg}` }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{t.title}</div>
                            <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>{fmtDate(t.scheduledDate)}{t.priority ? ` · ${t.priority}` : ""}</div>
                          </div>
                          <span style={{ fontSize: 9, fontWeight: 700, padding: "4px 11px", borderRadius: 100, color: statusColor, background: statusBg, letterSpacing: "0.08em", textTransform: "uppercase" }}>{t.status}</span>
                          <span style={{ fontSize: 12, color: "var(--text3)", marginLeft: 4, transition: "transform var(--dur) var(--ease)", display: "inline-block", transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}>▸</span>
                        </div>
                        {isExpanded && (
                          <div style={{ padding: "4px 4px 18px 28px", background: "var(--bg2)" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                              {t.vendorName && <div><div style={{ fontSize: 9, textTransform: "uppercase" as const, letterSpacing: "0.12em", color: "var(--text3)", marginBottom: 4, fontWeight: 700 }}>Vendor</div><div style={{ fontSize: 13, color: "var(--text)" }}>{t.vendorName}</div></div>}
                              {t.scheduledDate && <div><div style={{ fontSize: 9, textTransform: "uppercase" as const, letterSpacing: "0.12em", color: "var(--text3)", marginBottom: 4, fontWeight: 700 }}>Scheduled</div><div className="fin-num" style={{ fontSize: 13, color: "var(--text)" }}>{fmtDate(t.scheduledDate)}</div></div>}
                              {t.completedDate && <div><div style={{ fontSize: 9, textTransform: "uppercase" as const, letterSpacing: "0.12em", color: "var(--text3)", marginBottom: 4, fontWeight: 700 }}>Completed</div><div className="fin-num" style={{ fontSize: 13, color: "var(--text)" }}>{fmtDate(t.completedDate)}</div></div>}
                              {t.cost > 0 && <div><div style={{ fontSize: 9, textTransform: "uppercase" as const, letterSpacing: "0.12em", color: "var(--text3)", marginBottom: 4, fontWeight: 700 }}>Cost</div><div className="fin-num" style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>{fmt(t.cost)} {cur}</div></div>}
                              {t.notes && <div style={{ gridColumn: "1 / -1" }}><div style={{ fontSize: 9, textTransform: "uppercase" as const, letterSpacing: "0.12em", color: "var(--text3)", marginBottom: 4, fontWeight: 700 }}>Notes</div><div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.55 }}>{t.notes}</div></div>}
                            </div>
                            {t.photos && t.photos.length > 0 && (
                              <div style={{ marginTop: 14 }}>
                                <div style={{ fontSize: 9, textTransform: "uppercase" as const, letterSpacing: "0.12em", color: "var(--text3)", marginBottom: 7, fontWeight: 700 }}>Photos</div>
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                                  {t.photos.map((ph, pi) => (
                                    <a key={pi} href={ph.url} target="_blank" rel="noopener noreferrer" title={ph.filename || `Photo ${pi + 1}`}>
                                      <img src={ph.url} alt={ph.filename || `Photo ${pi + 1}`} style={{ width: 84, height: 64, objectFit: "cover" as const, borderRadius: 8, border: "1px solid var(--border2)", transition: "transform var(--dur) var(--ease)" }} />
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                            {t.attachments && t.attachments.length > 0 && (
                              <div style={{ marginTop: 14 }}>
                                <div style={{ fontSize: 9, textTransform: "uppercase" as const, letterSpacing: "0.12em", color: "var(--text3)", marginBottom: 7, fontWeight: 700 }}>Documents</div>
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                                  {t.attachments.map((a, ai) => (
                                    <a key={ai} href={a.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "var(--accent)", textDecoration: "none", padding: "6px 12px", background: "var(--accent-s)", borderRadius: 6, fontWeight: 600 }}>{a.filename || "Document"}</a>
                                  ))}
                                </div>
                              </div>
                            )}
                            <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
                              {t.approvalStatus === "Approved" ? (
                                <div style={{ fontSize: 11, color: "var(--green)", fontWeight: 600, letterSpacing: "0.04em" }}>✓ Approved by {t.approvedBy || "owner"}{t.approvalDate ? ` on ${fmtDate(t.approvalDate)}` : ""}</div>
                              ) : (
                                <button
                                  className="approve-btn"
                                  disabled={approvingMaint === t.id}
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    setApprovingMaint(t.id);
                                    try {
                                      const today = new Date().toISOString().slice(0, 10);
                                      const res = await fetch("/api/maintenance", {
                                        method: "PATCH",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ id: t.id, approvalStatus: "Approved", approvedBy: ownerName, approvalDate: today }),
                                      });
                                      if (res.ok) {
                                        setMaintTasks(prev => prev.map(m => m.id === t.id ? { ...m, approvalStatus: "Approved", approvedBy: ownerName, approvalDate: today } : m));
                                      }
                                    } catch { /* ignore */ }
                                    setApprovingMaint(null);
                                  }}
                                  style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "var(--green)", color: "#fff", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit", opacity: approvingMaint === t.id ? 0.6 : 1 }}
                                >{approvingMaint === t.id ? "Approving…" : "✓ Approve"}</button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reactive Repairs */}
              {maintTasks.filter(t => t.type === "Reactive").length > 0 && (
                <div className="panel" style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
                  <div style={{ padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ fontFamily: "var(--fd)", fontSize: 18, fontWeight: 400, color: "var(--text)" }}>Reactive Repairs</span>
                    <span style={{ padding: "4px 11px", borderRadius: 100, fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", background: "var(--orange-s)", color: "var(--orange)" }}>{maintTasks.filter(t => t.type === "Reactive").length}</span>
                  </div>
                  <div style={{ padding: "0 24px 6px" }}>
                    {maintTasks.filter(t => t.type === "Reactive").map((t, i, arr) => {
                      const statusColor = t.status === "Completed" ? "var(--green)" : t.status === "Scheduled" ? "var(--accent)" : "var(--blue)";
                      const statusBg = t.status === "Completed" ? "var(--green-s)" : t.status === "Scheduled" ? "var(--accent-s)" : "var(--blue-s)";
                      const isExpanded = expandedMaintId === t.id;
                      return (
                        <div key={t.id} style={{ borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none" }}>
                          <div
                            className="maint-row"
                            onClick={() => setExpandedMaintId(isExpanded ? null : t.id)}
                            style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 4px", cursor: "pointer", borderRadius: 8 }}
                          >
                            <div style={{ width: 10, height: 10, borderRadius: "50%", flexShrink: 0, background: statusColor, boxShadow: `0 0 0 3px ${statusBg}` }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{t.title}</div>
                              <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>{fmtDate(t.scheduledDate)}{t.priority ? ` · ${t.priority}` : ""}</div>
                            </div>
                            <span style={{ fontSize: 9, fontWeight: 700, padding: "4px 11px", borderRadius: 100, color: statusColor, background: statusBg, letterSpacing: "0.08em", textTransform: "uppercase" }}>{t.status}</span>
                            <span style={{ fontSize: 12, color: "var(--text3)", marginLeft: 4, transition: "transform var(--dur) var(--ease)", display: "inline-block", transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}>▸</span>
                          </div>
                          {isExpanded && (
                            <div style={{ padding: "4px 4px 18px 28px", background: "var(--bg2)" }}>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                                {t.vendorName && <div><div style={{ fontSize: 9, textTransform: "uppercase" as const, letterSpacing: "0.12em", color: "var(--text3)", marginBottom: 4, fontWeight: 700 }}>Vendor</div><div style={{ fontSize: 13, color: "var(--text)" }}>{t.vendorName}</div></div>}
                                {t.scheduledDate && <div><div style={{ fontSize: 9, textTransform: "uppercase" as const, letterSpacing: "0.12em", color: "var(--text3)", marginBottom: 4, fontWeight: 700 }}>Scheduled</div><div className="fin-num" style={{ fontSize: 13, color: "var(--text)" }}>{fmtDate(t.scheduledDate)}</div></div>}
                                {t.completedDate && <div><div style={{ fontSize: 9, textTransform: "uppercase" as const, letterSpacing: "0.12em", color: "var(--text3)", marginBottom: 4, fontWeight: 700 }}>Completed</div><div className="fin-num" style={{ fontSize: 13, color: "var(--text)" }}>{fmtDate(t.completedDate)}</div></div>}
                                {t.cost > 0 && <div><div style={{ fontSize: 9, textTransform: "uppercase" as const, letterSpacing: "0.12em", color: "var(--text3)", marginBottom: 4, fontWeight: 700 }}>Cost</div><div className="fin-num" style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>{fmt(t.cost)} {cur}</div></div>}
                                {t.notes && <div style={{ gridColumn: "1 / -1" }}><div style={{ fontSize: 9, textTransform: "uppercase" as const, letterSpacing: "0.12em", color: "var(--text3)", marginBottom: 4, fontWeight: 700 }}>Notes</div><div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.55 }}>{t.notes}</div></div>}
                              </div>
                              {t.photos && t.photos.length > 0 && (
                                <div style={{ marginTop: 14 }}>
                                  <div style={{ fontSize: 9, textTransform: "uppercase" as const, letterSpacing: "0.12em", color: "var(--text3)", marginBottom: 7, fontWeight: 700 }}>Photos</div>
                                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                                    {t.photos.map((ph, pi) => (
                                      <a key={pi} href={ph.url} target="_blank" rel="noopener noreferrer" title={ph.filename || `Photo ${pi + 1}`}>
                                        <img src={ph.url} alt={ph.filename || `Photo ${pi + 1}`} style={{ width: 84, height: 64, objectFit: "cover" as const, borderRadius: 8, border: "1px solid var(--border2)" }} />
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {t.attachments && t.attachments.length > 0 && (
                                <div style={{ marginTop: 14 }}>
                                  <div style={{ fontSize: 9, textTransform: "uppercase" as const, letterSpacing: "0.12em", color: "var(--text3)", marginBottom: 7, fontWeight: 700 }}>Documents</div>
                                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                                    {t.attachments.map((a, ai) => (
                                      <a key={ai} href={a.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "var(--accent)", textDecoration: "none", padding: "6px 12px", background: "var(--accent-s)", borderRadius: 6, fontWeight: 600 }}>{a.filename || "Document"}</a>
                                    ))}
                                  </div>
                                </div>
                              )}
                              <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
                                {t.approvalStatus === "Approved" ? (
                                  <div style={{ fontSize: 11, color: "var(--green)", fontWeight: 600, letterSpacing: "0.04em" }}>✓ Approved by {t.approvedBy || "owner"}{t.approvalDate ? ` on ${fmtDate(t.approvalDate)}` : ""}</div>
                                ) : (
                                  <button
                                    className="approve-btn"
                                    disabled={approvingMaint === t.id}
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      setApprovingMaint(t.id);
                                      try {
                                        const today = new Date().toISOString().slice(0, 10);
                                        const res = await fetch("/api/maintenance", {
                                          method: "PATCH",
                                          headers: { "Content-Type": "application/json" },
                                          body: JSON.stringify({ id: t.id, approvalStatus: "Approved", approvedBy: ownerName, approvalDate: today }),
                                        });
                                        if (res.ok) {
                                          setMaintTasks(prev => prev.map(m => m.id === t.id ? { ...m, approvalStatus: "Approved", approvedBy: ownerName, approvalDate: today } : m));
                                        }
                                      } catch { /* ignore */ }
                                      setApprovingMaint(null);
                                    }}
                                    style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "var(--green)", color: "#fff", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit", opacity: approvingMaint === t.id ? 0.6 : 1 }}
                                  >{approvingMaint === t.id ? "Approving…" : "✓ Approve"}</button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>)}

            {/* AVAILABILITY / CALENDAR */}
            {activePage === "calendar" && (<>
              <div style={{ marginBottom: 32 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 10 }}>Schedule</div>
                <h1 style={{ fontFamily: "var(--fd)", fontSize: 38, fontWeight: 400, lineHeight: 1.05, marginBottom: 8, color: "var(--text)", letterSpacing: "-0.005em" }}>Availability</h1>
                <div style={{ fontSize: 13, color: "var(--text2)" }}>Calendar overview for {property?.name}</div>
                <span className="gold-rule" />
              </div>

              {/* Calendar grid */}
              {(() => {
                const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
                const firstDay = new Date(calYear, calMonth, 1).getDay();
                const monthName = new Date(calYear, calMonth).toLocaleString("en-US", { month: "long", year: "numeric" });

                const getDayInfo = (day: number): { status: "owner" | "rental" | "guest" | "available"; visitLabel: string; isCheckIn: boolean } => {
                  const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  for (const v of visits) {
                    if (v.checkIn && v.checkOut && dateStr >= v.checkIn.slice(0, 10) && dateStr <= v.checkOut.slice(0, 10)) {
                      const status = v.visitType === "Rental" ? "rental" as const : v.visitType === "Guest" ? "guest" as const : "owner" as const;
                      const isCheckIn = dateStr === v.checkIn.slice(0, 10);
                      return { status, visitLabel: v.guestName || v.visitName || v.visitType, isCheckIn };
                    }
                  }
                  return { status: "available", visitLabel: "", isCheckIn: false };
                };

                return (
                  <div className="panel" style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, marginBottom: 18, overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
                    <div style={{ padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)" }}>
                      <button className="month-btn" onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); } else setCalMonth(calMonth - 1); }} style={{ width: 30, height: 30, borderRadius: "50%", border: "1px solid var(--border2)", background: "transparent", color: "var(--text2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>‹</button>
                      <span style={{ fontFamily: "var(--fd)", fontSize: 20, color: "var(--text)" }}>{monthName}</span>
                      <button className="month-btn" onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); } else setCalMonth(calMonth + 1); }} style={{ width: 30, height: 30, borderRadius: "50%", border: "1px solid var(--border2)", background: "transparent", color: "var(--text2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>›</button>
                    </div>
                    <div style={{ padding: "20px 24px 22px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, textAlign: "center" as const, marginBottom: 10 }}>
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                          <div key={d} style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.12em", color: "var(--text3)", padding: "4px 0" }}>{d}</div>
                        ))}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
                        {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                          const day = i + 1;
                          const info = getDayInfo(day);
                          const bg = info.status === "owner" ? "var(--accent)" : info.status === "rental" ? "var(--teal)" : info.status === "guest" ? "#9B8EC4" : "var(--bg4)";
                          const clr = info.status === "available" ? "var(--text3)" : "#fff";
                          return (
                            <div key={day} className="cal-day" title={info.visitLabel || undefined} style={{ width: "100%", minHeight: 76, display: "flex", flexDirection: "column" as const, alignItems: "stretch", justifyContent: "flex-start", borderRadius: 10, background: bg, color: clr, position: "relative" as const, overflow: "hidden", cursor: info.status === "available" ? "default" : "pointer", padding: "8px 8px 6px" }}>
                              <span style={{ fontSize: 13, fontWeight: 700, lineHeight: 1, opacity: info.status === "available" ? 0.7 : 1 }}>{day}</span>
                              {info.isCheckIn && info.visitLabel && <span style={{ fontSize: 11, lineHeight: 1.25, marginTop: 6, fontWeight: 600, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden", wordBreak: "break-word" as const, opacity: 0.95 }}>{info.visitLabel}</span>}
                            </div>
                          );
                        })}
                      </div>
                      <div style={{ display: "flex", gap: 18, marginTop: 18, justifyContent: "center", flexWrap: "wrap" as const, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 10, color: "var(--text3)", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}><div style={{ width: 11, height: 11, borderRadius: 3, background: "var(--accent)" }} /> Owner visit</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 10, color: "var(--text3)", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}><div style={{ width: 11, height: 11, borderRadius: 3, background: "var(--teal)" }} /> Rental</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 10, color: "var(--text3)", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}><div style={{ width: 11, height: 11, borderRadius: 3, background: "#9B8EC4" }} /> Guest</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 10, color: "var(--text3)", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}><div style={{ width: 11, height: 11, borderRadius: 3, background: "var(--bg4)", border: "1px solid var(--border2)" }} /> Available</div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Upcoming visits */}
              <div className="panel" style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, marginBottom: 18, overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
                <div style={{ padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ fontFamily: "var(--fd)", fontSize: 18, fontWeight: 400, color: "var(--text)" }}>Upcoming visits</span>
                  <span style={{ padding: "4px 11px", borderRadius: 100, fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", background: "var(--teal-s)", color: "var(--teal)" }}>{visits.filter(v => v.status === "Active" || v.status === "Upcoming").length}</span>
                </div>
                <div style={{ padding: "0 24px 6px" }}>
                  {visits.filter(v => v.status === "Active" || v.status === "Upcoming").length === 0 && (
                    <div style={{ padding: "26px 0", color: "var(--text3)", fontSize: 13, textAlign: "center" as const }}>No upcoming visits.</div>
                  )}
                  {visits.filter(v => v.status === "Active" || v.status === "Upcoming").map((v, i, arr) => (
                    <div key={v.id} className="stmt-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none" }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{v.guestName || v.visitName}</div>
                        <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}><span className="fin-num">{fmtDate(v.checkIn)} — {fmtDate(v.checkOut)}</span>{v.adults ? ` · ${v.adults} adult${v.adults > 1 ? "s" : ""}` : ""}{v.children ? `, ${v.children} child${v.children > 1 ? "ren" : ""}` : ""}</div>
                      </div>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: "4px 11px", borderRadius: 100, color: v.visitType === "Rental" ? "var(--teal)" : "var(--accent)", background: v.visitType === "Rental" ? "var(--teal-s)" : "var(--accent-s)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{v.visitType}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Register a visit */}
              <div className="panel" style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
                <div style={{ padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: showRegisterVisit ? "1px solid var(--border)" : "none" }}>
                  <span style={{ fontFamily: "var(--fd)", fontSize: 18, fontWeight: 400, color: "var(--text)" }}>Register a visit</span>
                  <button className="pill-btn" onClick={() => setShowRegisterVisit(!showRegisterVisit)} style={{ padding: "7px 16px", borderRadius: 100, border: "1px solid var(--border2)", background: showRegisterVisit ? "var(--accent-s)" : "transparent", color: showRegisterVisit ? "var(--accent)" : "var(--text2)", fontSize: 10, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>{showRegisterVisit ? "Cancel" : "+ New Visit"}</button>
                </div>
                {showRegisterVisit && (
                  <div style={{ padding: "20px 24px 22px" }}>
                    <div className="visit-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, marginBottom: 16 }}>
                      <div>
                        <label style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.12em", color: "var(--text3)", display: "block", marginBottom: 6 }}>Check-in</label>
                        <input type="date" value={newVisitCheckIn} onChange={e => setNewVisitCheckIn(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border2)", background: "var(--bg2)", color: "var(--text)", fontSize: 13, fontFamily: "inherit" }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.12em", color: "var(--text3)", display: "block", marginBottom: 6 }}>Check-out</label>
                        <input type="date" value={newVisitCheckOut} onChange={e => setNewVisitCheckOut(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border2)", background: "var(--bg2)", color: "var(--text)", fontSize: 13, fontFamily: "inherit" }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.12em", color: "var(--text3)", display: "block", marginBottom: 6 }}>Adults</label>
                        <input type="number" min={1} value={newVisitAdults} onChange={e => setNewVisitAdults(Number(e.target.value))} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border2)", background: "var(--bg2)", color: "var(--text)", fontSize: 13, fontFamily: "inherit" }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.12em", color: "var(--text3)", display: "block", marginBottom: 6 }}>Children</label>
                        <input type="number" min={0} value={newVisitChildren} onChange={e => setNewVisitChildren(Number(e.target.value))} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border2)", background: "var(--bg2)", color: "var(--text)", fontSize: 13, fontFamily: "inherit" }} />
                      </div>
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.12em", color: "var(--text3)", display: "block", marginBottom: 6 }}>Notes</label>
                      <textarea value={newVisitNotes} onChange={e => setNewVisitNotes(e.target.value)} rows={3} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border2)", background: "var(--bg2)", color: "var(--text)", fontSize: 13, fontFamily: "inherit", resize: "vertical" as const }} />
                    </div>
                    <button
                      disabled={addingVisit || !newVisitCheckIn || !newVisitCheckOut}
                      onClick={async () => {
                        setAddingVisit(true);
                        try {
                          const res = await fetch("/api/visits", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ propertyId, checkIn: newVisitCheckIn, checkOut: newVisitCheckOut, adults: newVisitAdults, children: newVisitChildren, notes: newVisitNotes, status: "Upcoming", visitType: "Owner" }),
                          });
                          if (res.ok) {
                            const v = await res.json();
                            setVisits(prev => [...prev, v]);
                            setShowRegisterVisit(false);
                            setNewVisitCheckIn(""); setNewVisitCheckOut(""); setNewVisitAdults(2); setNewVisitChildren(0); setNewVisitNotes("");
                          }
                        } catch { /* ignore */ }
                        setAddingVisit(false);
                      }}
                      style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: !newVisitCheckIn || !newVisitCheckOut ? "var(--bg4)" : "var(--accent)", color: !newVisitCheckIn || !newVisitCheckOut ? "var(--text3)" : "#fff", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", cursor: !newVisitCheckIn || !newVisitCheckOut ? "default" : "pointer", fontFamily: "inherit", opacity: addingVisit ? 0.6 : 1 }}
                    >{addingVisit ? "Saving…" : "Register Visit"}</button>
                  </div>
                )}
              </div>
            </>)}

            {/* CONCIERGE */}
            {activePage === "concierge" && (<>
              <div style={{ marginBottom: 32 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 10 }}>Guest Experience</div>
                <h1 style={{ fontFamily: "var(--fd)", fontSize: 38, fontWeight: 400, lineHeight: 1.05, marginBottom: 8, color: "var(--text)", letterSpacing: "-0.005em" }}>Concierge &amp; Itinerary</h1>
                <div style={{ fontSize: 13, color: "var(--text2)" }}>Upcoming visit details and itinerary for {property?.name}</div>
                <span className="gold-rule" />
              </div>

              {(() => {
                const nextVisit = visits.find(v => (v.status === "Active" || v.status === "Upcoming") && v.published);
                if (!nextVisit) {
                  return (
                    <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: 50, textAlign: "center" as const, color: "var(--text3)", boxShadow: "var(--shadow-sm)" }}>
                      <div style={{ fontFamily: "var(--fd)", fontSize: 22, color: "var(--text2)", marginBottom: 8 }}>No upcoming visits</div>
                      <div style={{ fontSize: 13, maxWidth: 400, margin: "0 auto", lineHeight: 1.6 }}>Itinerary events will appear here when a visit is scheduled.</div>
                    </div>
                  );
                }

                const visitEvents = itineraryEvents.filter(e => e.visitId === nextVisit.id).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
                const grouped: Record<string, ItineraryEvent[]> = {};
                visitEvents.forEach(e => {
                  const key = e.date || "Unscheduled";
                  if (!grouped[key]) grouped[key] = [];
                  grouped[key].push(e);
                });
                const sortedDays = Object.keys(grouped).sort();

                return (<>
                  {/* Visit info card */}
                  <div className="panel" style={{ background: "var(--bg2)", border: "1px solid var(--accent-line)", borderRadius: 12, marginBottom: 22, padding: "22px 26px", boxShadow: "var(--shadow-md)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                      <div>
                        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 6 }}>Next Visit</div>
                        <div style={{ fontFamily: "var(--fd)", fontSize: 24, fontWeight: 400, color: "var(--text)", marginBottom: 6, lineHeight: 1.15 }}>{nextVisit.guestName || nextVisit.visitName}</div>
                        <div className="fin-num" style={{ fontSize: 13, color: "var(--text2)" }}>{fmtDate(nextVisit.checkIn)} — {fmtDate(nextVisit.checkOut)}</div>
                        {nextVisit.adults > 0 && <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 5 }}>{nextVisit.adults} adult{nextVisit.adults > 1 ? "s" : ""}{nextVisit.children > 0 ? `, ${nextVisit.children} child${nextVisit.children > 1 ? "ren" : ""}` : ""}</div>}
                      </div>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: "5px 12px", borderRadius: 100, color: nextVisit.status === "Active" ? "var(--green)" : "var(--blue)", background: nextVisit.status === "Active" ? "var(--green-s)" : "var(--blue-s)", letterSpacing: "0.1em", textTransform: "uppercase", flexShrink: 0 }}>{nextVisit.status}</span>
                    </div>
                    {nextVisit.notes && <div style={{ marginTop: 14, fontSize: 13, color: "var(--text2)", padding: "12px 16px", background: "var(--bg)", borderRadius: 8, lineHeight: 1.55, borderLeft: "2px solid var(--accent-line)" }}>{nextVisit.notes}</div>}
                  </div>

                  {/* Timeline */}
                  {visitEvents.length === 0 ? (
                    <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: 50, textAlign: "center" as const, color: "var(--text3)", boxShadow: "var(--shadow-sm)" }}>
                      <div style={{ fontFamily: "var(--fd)", fontSize: 20, color: "var(--text2)", marginBottom: 8 }}>No itinerary yet</div>
                      <div style={{ fontSize: 13, maxWidth: 400, margin: "0 auto", lineHeight: 1.6 }}>No itinerary events scheduled for this visit yet.</div>
                    </div>
                  ) : (
                    <div>
                      {sortedDays.map(day => (
                        <div key={day} style={{ marginBottom: 22 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)" }} />
                            <div style={{ fontFamily: "var(--fd)", fontSize: 18, color: "var(--accent)" }}>{day === "Unscheduled" ? day : fmtDate(day)}</div>
                            <div style={{ flex: 1, height: 1, background: "var(--accent-line)" }} />
                          </div>
                          <div className="panel" style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
                            {grouped[day].map((ev, i, arr) => {
                              const statusColor = ev.status === "Confirmed" ? "var(--green)" : ev.status === "Pending" ? "var(--accent)" : "var(--text3)";
                              const statusBg = ev.status === "Confirmed" ? "var(--green-s)" : ev.status === "Pending" ? "var(--accent-s)" : "var(--bg4)";
                              return (
                                <div key={ev.id} className="timeline-event" style={{ display: "flex", gap: 16, padding: "16px 22px", borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none", alignItems: "flex-start" }}>
                                  <div className="fin-num" style={{ minWidth: 56, fontSize: 13, fontWeight: 600, color: "var(--teal)", paddingTop: 1 }}>{ev.time || "—:—"}</div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{ev.eventName}</div>
                                    {ev.details && <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4, lineHeight: 1.55 }}>{ev.details}</div>}
                                  </div>
                                  <span style={{ fontSize: 9, fontWeight: 700, padding: "4px 10px", borderRadius: 100, color: statusColor, background: statusBg, letterSpacing: "0.08em", textTransform: "uppercase", flexShrink: 0 }}>{ev.status || "TBD"}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>);
              })()}
            </>)}

            {/* HELP */}
            {activePage === "help" && (() => {
              const q = helpSearch.trim().toLowerCase();
              const filtered = q ? helpArticles.filter(a => a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q) || a.category.toLowerCase().includes(q)) : helpArticles;
              const byCategory: Record<string, any[]> = {};
              filtered.forEach(a => { (byCategory[a.category] = byCategory[a.category] || []).push(a); });
              const selected = helpArticles.find(a => a.id === helpSelectedId) || filtered[0] || null;
              return (<>
                <div style={{ marginBottom: 32 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 10 }}>Knowledge Base</div>
                  <h1 style={{ fontFamily: "var(--fd)", fontSize: 38, fontWeight: 400, lineHeight: 1.05, marginBottom: 8, color: "var(--text)", letterSpacing: "-0.005em" }}>Help Center</h1>
                  <div style={{ fontSize: 13, color: "var(--text2)" }}>Articles and how-tos for your owner portal</div>
                  <span className="gold-rule" />
                </div>
                {helpLoading ? (
                  <div style={{ padding: 40, textAlign: "center" as const, color: "var(--text3)", fontSize: 13 }}>Loading articles…</div>
                ) : helpArticles.length === 0 ? (
                  <div style={{ padding: 40, textAlign: "center" as const, color: "var(--text3)", fontSize: 13 }}>No articles published yet.</div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 24, alignItems: "start" }}>
                    <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: 16, position: "sticky" as const, top: 24 }}>
                      <input value={helpSearch} onChange={e => setHelpSearch(e.target.value)} placeholder="Search help…" style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border2)", background: "var(--bg)", color: "var(--text)", fontSize: 13, fontFamily: "inherit", marginBottom: 14 }} />
                      {Object.keys(byCategory).length === 0 && <div style={{ fontSize: 12, color: "var(--text3)", padding: "8px 4px" }}>No matches.</div>}
                      {Object.entries(byCategory).map(([cat, arts]) => (
                        <div key={cat} style={{ marginBottom: 14 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "var(--text3)", padding: "4px 6px 6px" }}>{cat}</div>
                          {(arts as any[]).map((a: any) => (
                            <div key={a.id} onClick={() => setHelpSelectedId(a.id)} style={{ padding: "8px 10px", borderRadius: 8, cursor: "pointer", fontSize: 13, color: selected?.id === a.id ? "var(--accent)" : "var(--text2)", background: selected?.id === a.id ? "var(--accent-s)" : "transparent" }}>
                              {a.title}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                    <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: "28px 32px", minHeight: 300, boxShadow: "var(--shadow-sm)" }}>
                      {selected ? (
                        <>
                          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "var(--text3)", marginBottom: 8 }}>{selected.category}</div>
                          <h2 style={{ fontFamily: "'Georgia', serif", fontSize: 26, fontWeight: 400, margin: "0 0 16px", color: "var(--text)" }}>{selected.title}</h2>
                          <div style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text2)" }}>
                            {selected.body.split(/(!\[[^\]]*\]\([^)]+\))/g).map((part: string, i: number) => {
                              const m = part.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
                              if (m) return <img key={i} src={m[2]} alt={m[1]} style={{ display: "block", maxWidth: "100%", borderRadius: 8, border: "1px solid var(--border)", margin: "14px 0", boxShadow: "var(--shadow-sm)" }} />;
                              return <span key={i} style={{ whiteSpace: "pre-wrap" as const }}>{part}</span>;
                            })}
                          </div>
                        </>
                      ) : (
                        <div style={{ fontSize: 13, color: "var(--text3)" }}>Select an article from the left.</div>
                      )}
                    </div>
                  </div>
                )}
              </>);
            })()}
          </div>

          {/* Footer */}
          <div style={{ padding: "24px 48px", borderTop: "1px solid var(--border)", textAlign: "center" as const, fontSize: 10, color: "var(--text3)", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}>
            Powered by Property Management OS · Axvia Solutions
          </div>
        </div>
      </div>
    </div>
  );
}
