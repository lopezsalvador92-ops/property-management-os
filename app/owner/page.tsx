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
  const [enabledModules, setEnabledModules] = useState<string[]>(["home", "financials", "maintenance", "calendar", "concierge"]);
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

  if (loading) return <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text3)", fontFamily: "'DM Sans', system-ui, sans-serif" }}>Loading your property data...</div>;
  if (!linkedProperty) return <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", color: "var(--text2)", fontFamily: "'DM Sans', system-ui, sans-serif", textAlign: "center" as const, padding: 40 }}><img src="/cape-logo.png" alt="Cape PM" style={{ height: 50, marginBottom: 20, opacity: 0.6 }} /><h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 8 }}>No property linked</h2><p style={{ fontSize: 14, color: "var(--text3)" }}>Contact your property manager to link your property.</p></div>;
  if (error) return <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--red)", fontFamily: "'DM Sans', system-ui, sans-serif" }}>{error}</div>;

  const navItems = [
    { id: "home", icon: "⌂", label: "Home" },
    { id: "financials", icon: "◈", label: "Financials" },
    { id: "maintenance", icon: "⟡", label: "Maintenance" },
    { id: "calendar", icon: "▦", label: "Availability" },
    { id: "concierge", icon: "✦", label: "Concierge" },
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
        @media(max-width:768px){
          .owner-shell{grid-template-columns:1fr !important;}
          .owner-sidebar{display:none !important;}
          .owner-main{padding:20px 16px !important;max-width:100% !important;}
          .owner-stats{grid-template-columns:1fr !important;}
          .owner-hero{margin-bottom:16px !important;}
          .owner-hero h1{font-size:22px !important;}
          .fin-header{flex-direction:column !important;gap:16px !important;align-items:flex-start !important;}
          .fin-stats{grid-template-columns:1fr 1fr !important;}
          .exp-table-grid{grid-template-columns:70px 1fr 80px !important;}
          .exp-table-cat,.exp-table-receipt-hd{display:none !important;}
          .exp-cat-cell,.exp-receipt-cell{display:none !important;}
          .fin-section-title{font-size:24px !important;}
          .month-selector{align-self:flex-start !important;}
          .owner-2col{grid-template-columns:1fr !important;}
        }
        @media(max-width:480px){
          .fin-stats{grid-template-columns:1fr !important;}
          .exp-table-grid{grid-template-columns:60px 1fr 70px !important;}
        }
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

      <div className="owner-shell" style={{ display: "grid", gridTemplateColumns: "260px 1fr", minHeight: "100vh" }}>

        {/* Mobile top bar */}
        <div className="owner-mobile-bar" style={{ display: "none" }}>
          <style>{`
            @media(max-width:768px){
              .owner-mobile-bar{display:flex !important;padding:12px 16px;background:var(--bg2);border-bottom:1px solid var(--border);align-items:center;justify-content:space-between;}
            }
          `}</style>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/cape-logo.png" alt="Cape PM" style={{ height: 22 }} />
            <span style={{ fontSize: 13, fontWeight: 500 }}>{property?.name}</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {navItems.filter(n => enabledModules.includes(n.id)).map(n => (
              <button key={n.id} onClick={() => setActivePage(n.id)} style={{ padding: "6px 12px", borderRadius: 6, border: activePage === n.id ? "1px solid var(--accent)" : "1px solid var(--border)", background: activePage === n.id ? "var(--accent-s)" : "transparent", color: activePage === n.id ? "var(--accent)" : "var(--text3)", fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>{n.label}</button>
            ))}
          </div>
        </div>

        {/* SIDEBAR */}
        <div className="owner-sidebar" style={{ background: "var(--bg2)", borderRight: "1px solid var(--border)", position: "sticky", top: 0, height: "100vh", display: "flex", flexDirection: "column" as const, overflow: "hidden" }}>
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
            {navItems.filter(n => enabledModules.includes(n.id)).map(n => (
              <div key={n.id} onClick={() => setActivePage(n.id)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, fontSize: 13, color: activePage === n.id ? "var(--accent)" : "var(--text2)", background: activePage === n.id ? "var(--accent-s)" : "transparent", cursor: "pointer", transition: "all 0.15s", marginBottom: 2 }}>
                <span style={{ width: 18, textAlign: "center" as const, fontSize: 14, opacity: activePage === n.id ? 1 : 0.6 }}>{n.icon}</span> {n.label}
              </div>
            ))}
          </div>
          <div style={{ flex: 1, minHeight: 0 }} />
          <div style={{ flexShrink: 0, padding: "8px 20px", borderTop: "1px solid var(--border)" }}>
            <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} style={{ padding: "5px 14px", borderRadius: 6, border: "1px solid var(--border2)", background: "transparent", color: "var(--text3)", fontSize: 11, cursor: "pointer", fontFamily: "inherit", width: "100%" }}>{theme === "dark" ? "Switch to Light" : "Switch to Dark"}</button>
          </div>
          <div style={{ flexShrink: 0, padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, color: "var(--text3)" }}>{ownerName}</span>
            <UserButton />
          </div>
        </div>

        {/* MAIN */}
        <div style={{ overflowY: "auto" as const }}>
          <div className="owner-main" style={{ padding: "32px 40px", maxWidth: 960 }}>
            {/* Page header for Home */}
            {activePage === "home" && (
              <div className="owner-hero" style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 14, color: "var(--text3)", marginBottom: 4 }}>Welcome back,</div>
                <div style={{ fontFamily: "var(--fd)", fontSize: 28, marginBottom: 4 }}>{property?.name}</div>
                <div style={{ fontSize: 14, color: "var(--text2)" }}>{property?.owner} · {cur}</div>
              </div>
            )}
            {/* HOME */}
            {activePage === "home" && (<>
              <div className="owner-stats" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
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

              {/* Two-column layout: Upcoming maintenance + Recent activity */}
              <div className="owner-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {/* Upcoming maintenance */}
                <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
                  <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>Upcoming maintenance</span>
                  </div>
                  <div style={{ padding: 20 }}>
                    {maintTasks.filter(t => t.status === "Scheduled" || t.status === "Upcoming").slice(0, 3).map((t, i, arr) => (
                      <div key={t.id} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none", alignItems: "flex-start" }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", marginTop: 6, flexShrink: 0, background: t.status === "Scheduled" ? "var(--accent)" : "var(--blue)" }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13 }}>{t.title}</div>
                          <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 3 }}>{fmtDate(t.scheduledDate)}{t.vendorName ? ` · ${t.vendorName}` : ""}</div>
                        </div>
                      </div>
                    ))}
                    {maintTasks.filter(t => t.status === "Scheduled" || t.status === "Upcoming").length === 0 && (
                      <div style={{ padding: 10, color: "var(--text3)", fontSize: 13, textAlign: "center" as const }}>No upcoming tasks.</div>
                    )}
                    {enabledModules.includes("maintenance") && (
                      <div onClick={() => setActivePage("maintenance")} style={{ marginTop: 12, fontSize: 12, color: "var(--accent)", cursor: "pointer", fontWeight: 500 }}>View full maintenance program &rarr;</div>
                    )}
                  </div>
                </div>

                {/* Recent activity */}
                <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
                  <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>Recent activity</span>
                  </div>
                  <div style={{ padding: 20 }}>
                    {(() => {
                      const combined: { id: string; type: string; label: string; amount: number; date: string; color: string }[] = [
                        ...expenses.slice(-20).map(e => ({ id: e.id, type: "expense", label: e.description || e.category, amount: -e.amount, date: e.date, color: "var(--red)" })),
                        ...deposits.slice(0, 10).map(d => ({ id: d.id, type: "deposit", label: d.notes || "Deposit received", amount: d.amount, date: d.date, color: "var(--green)" })),
                        ...maintTasks.filter(t => t.status === "Completed").slice(0, 5).map(t => ({ id: t.id, type: "maint", label: `${t.title} completed`, amount: t.cost || 0, date: t.completedDate || t.scheduledDate, color: "var(--teal-l)" })),
                      ].sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 5);
                      if (combined.length === 0) return <div style={{ padding: 10, color: "var(--text3)", fontSize: 13, textAlign: "center" as const }}>No recent activity.</div>;
                      return combined.map((item, i) => (
                        <div key={item.id + item.type} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: i < combined.length - 1 ? "1px solid var(--border)" : "none", alignItems: "flex-start" }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", marginTop: 6, flexShrink: 0, background: item.color }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, lineHeight: 1.5 }}>{item.label}{item.amount !== 0 ? <> — <span style={{ color: item.color }}>{item.amount < 0 ? "" : "+"}{fmt(Math.abs(item.amount))} {cur}</span></> : null}</div>
                            <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 3 }}>{fmtDate(item.date)}</div>
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
              {/* Header + month selector */}
              <div className="fin-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
                <div>
                  <div className="fin-section-title" style={{ fontFamily: "var(--fd)", fontSize: 28, marginBottom: 6 }}>Financial Statement</div>
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
                <div className="fin-stats" style={{ display: "grid", gridTemplateColumns: cur === "USD" ? "repeat(4, 1fr)" : "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
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
                    <div className="exp-table-grid" style={{ display: "grid", gridTemplateColumns: "90px 1fr 100px 120px 60px", padding: "12px 0", borderBottom: "2px solid var(--border2)" }}>
                      <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: "var(--text3)" }}>Date</div>
                      <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: "var(--text3)" }}>Description</div>
                      <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: "var(--text3)", textAlign: "right" as const }}>Amount</div>
                      <div className="exp-table-cat" style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: "var(--text3)", textAlign: "center" as const }}>Category</div>
                      <div className="exp-table-receipt-hd" style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: "var(--text3)", textAlign: "center" as const }}>Receipt</div>
                    </div>
                    {/* Expense rows */}
                    {monthExpenses.map((e, i) => (
                      <div key={e.id} className="exp-table-grid" style={{ display: "grid", gridTemplateColumns: "90px 1fr 100px 120px 60px", padding: "10px 0", borderBottom: i < monthExpenses.length - 1 ? "1px solid var(--border)" : "none", alignItems: "center" }}>
                        <div style={{ fontSize: 12, color: "var(--text3)" }}>{fmtDate(e.date)}</div>
                        <div style={{ fontSize: 13, color: "var(--text)" }}>{e.description || "Expense"}</div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", textAlign: "right" as const }}>{fmt(e.amount)}</div>
                        <div className="exp-cat-cell" style={{ textAlign: "center" as const }}><span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "var(--bg4)", color: "var(--text3)", whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis", maxWidth: 110, display: "inline-block" }}>{e.category}</span></div>
                        <div className="exp-receipt-cell" style={{ textAlign: "center" as const }}>{e.receiptUrl ? <a href={e.receiptUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--teal-l)", textDecoration: "none", fontSize: 11, fontWeight: 500 }}>View</a> : <span style={{ fontSize: 11, color: "var(--text3)" }}>-</span>}</div>
                      </div>
                    ))}
                    {monthExpenses.length === 0 && <div style={{ padding: "20px 0", color: "var(--text3)", fontSize: 13, textAlign: "center" as const }}>No expenses for this month.</div>}
                    {/* Total row */}
                    {monthExpenses.length > 0 && (
                      <div className="exp-table-grid" style={{ display: "grid", gridTemplateColumns: "90px 1fr 100px 120px 60px", padding: "12px 0", borderTop: "2px solid var(--border2)", marginTop: 4 }}>
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

            {/* MAINTENANCE */}
            {activePage === "maintenance" && (<>
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontFamily: "var(--fd)", fontSize: 28, marginBottom: 6 }}>Maintenance Program</div>
                <div style={{ fontSize: 14, color: "var(--text2)" }}>Preventive and reactive maintenance for {property?.name}</div>
              </div>

              {/* This Month - Preventive */}
              <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 14, marginBottom: 20, overflow: "hidden" }}>
                <div style={{ padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>This Month</span>
                  <span style={{ padding: "4px 10px", borderRadius: 100, fontSize: 11, fontWeight: 600, background: "var(--accent-s)", color: "var(--accent)" }}>{maintTasks.filter(t => t.type !== "Reactive").length} tasks</span>
                </div>
                <div style={{ padding: "0 20px" }}>
                  {maintTasks.filter(t => t.type !== "Reactive").length === 0 && (
                    <div style={{ padding: 20, color: "var(--text3)", fontSize: 13, textAlign: "center" as const }}>No preventive tasks this month.</div>
                  )}
                  {maintTasks.filter(t => t.type !== "Reactive").map((t, i, arr) => {
                    const statusColor = t.status === "Completed" ? "var(--green)" : t.status === "Scheduled" ? "var(--accent)" : "var(--blue)";
                    const isExpanded = expandedMaintId === t.id;
                    return (
                      <div key={t.id} style={{ borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none" }}>
                        <div
                          onClick={() => setExpandedMaintId(isExpanded ? null : t.id)}
                          style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", cursor: "pointer" }}
                        >
                          <div style={{ width: 10, height: 10, borderRadius: "50%", flexShrink: 0, background: statusColor }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 500 }}>{t.title}</div>
                            <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 3 }}>{fmtDate(t.scheduledDate)}{t.priority ? ` · ${t.priority}` : ""}</div>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 100, color: statusColor, background: t.status === "Completed" ? "var(--green-s)" : t.status === "Scheduled" ? "var(--accent-s)" : "var(--blue-s)" }}>{t.status}</span>
                          <span style={{ fontSize: 12, color: "var(--text3)", marginLeft: 4 }}>{isExpanded ? "▾" : "▸"}</span>
                        </div>
                        {isExpanded && (
                          <div style={{ padding: "0 0 14px 24px" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                              {t.vendorName && <div><div style={{ fontSize: 10, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: "var(--text3)", marginBottom: 2 }}>Vendor</div><div style={{ fontSize: 13 }}>{t.vendorName}</div></div>}
                              {t.scheduledDate && <div><div style={{ fontSize: 10, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: "var(--text3)", marginBottom: 2 }}>Scheduled</div><div style={{ fontSize: 13 }}>{fmtDate(t.scheduledDate)}</div></div>}
                              {t.completedDate && <div><div style={{ fontSize: 10, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: "var(--text3)", marginBottom: 2 }}>Completed</div><div style={{ fontSize: 13 }}>{fmtDate(t.completedDate)}</div></div>}
                              {t.cost > 0 && <div><div style={{ fontSize: 10, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: "var(--text3)", marginBottom: 2 }}>Cost</div><div style={{ fontSize: 13 }}>{fmt(t.cost)} {cur}</div></div>}
                              {t.notes && <div style={{ gridColumn: "1 / -1" }}><div style={{ fontSize: 10, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: "var(--text3)", marginBottom: 2 }}>Notes</div><div style={{ fontSize: 13, color: "var(--text2)" }}>{t.notes}</div></div>}
                            </div>
                            {t.photos && t.photos.length > 0 && (
                              <div style={{ marginTop: 10 }}>
                                <div style={{ fontSize: 10, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: "var(--text3)", marginBottom: 4 }}>Photos</div>
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                                  {t.photos.map((ph, pi) => (
                                    <a key={pi} href={ph.url} target="_blank" rel="noopener noreferrer" title={ph.filename || `Photo ${pi + 1}`}>
                                      <img src={ph.url} alt={ph.filename || `Photo ${pi + 1}`} style={{ width: 80, height: 60, objectFit: "cover" as const, borderRadius: 6, border: "1px solid var(--border2)" }} />
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                            {t.attachments && t.attachments.length > 0 && (
                              <div style={{ marginTop: 10 }}>
                                <div style={{ fontSize: 10, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: "var(--text3)", marginBottom: 4 }}>Documents</div>
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                                  {t.attachments.map((a, ai) => (
                                    <a key={ai} href={a.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none", padding: "4px 10px", background: "var(--accent-s)", borderRadius: 6 }}>{a.filename || "Document"}</a>
                                  ))}
                                </div>
                              </div>
                            )}
                            <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                              {t.approvalStatus === "Approved" ? (
                                <div style={{ fontSize: 12, color: "var(--green)", fontWeight: 500 }}>Approved by {t.approvedBy || "owner"}{t.approvalDate ? ` on ${fmtDate(t.approvalDate)}` : ""}</div>
                              ) : (
                                <button
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
                                  style={{ padding: "6px 16px", borderRadius: 6, border: "none", background: "var(--green)", color: "#fff", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", opacity: approvingMaint === t.id ? 0.6 : 1 }}
                                >{approvingMaint === t.id ? "Approving..." : "\u2713 Approve"}</button>
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
                <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
                  <div style={{ padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>Reactive Repairs</span>
                    <span style={{ padding: "4px 10px", borderRadius: 100, fontSize: 11, fontWeight: 600, background: "var(--orange-s)", color: "var(--orange)" }}>{maintTasks.filter(t => t.type === "Reactive").length}</span>
                  </div>
                  <div style={{ padding: "0 20px" }}>
                    {maintTasks.filter(t => t.type === "Reactive").map((t, i, arr) => {
                      const statusColor = t.status === "Completed" ? "var(--green)" : t.status === "Scheduled" ? "var(--accent)" : "var(--blue)";
                      const isExpanded = expandedMaintId === t.id;
                      return (
                        <div key={t.id} style={{ borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none" }}>
                          <div
                            onClick={() => setExpandedMaintId(isExpanded ? null : t.id)}
                            style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", cursor: "pointer" }}
                          >
                            <div style={{ width: 10, height: 10, borderRadius: "50%", flexShrink: 0, background: statusColor }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 500 }}>{t.title}</div>
                              <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 3 }}>{fmtDate(t.scheduledDate)}{t.priority ? ` · ${t.priority}` : ""}</div>
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 100, color: statusColor, background: t.status === "Completed" ? "var(--green-s)" : t.status === "Scheduled" ? "var(--accent-s)" : "var(--blue-s)" }}>{t.status}</span>
                            <span style={{ fontSize: 12, color: "var(--text3)", marginLeft: 4 }}>{isExpanded ? "▾" : "▸"}</span>
                          </div>
                          {isExpanded && (
                            <div style={{ padding: "0 0 14px 24px" }}>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                                {t.vendorName && <div><div style={{ fontSize: 10, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: "var(--text3)", marginBottom: 2 }}>Vendor</div><div style={{ fontSize: 13 }}>{t.vendorName}</div></div>}
                                {t.scheduledDate && <div><div style={{ fontSize: 10, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: "var(--text3)", marginBottom: 2 }}>Scheduled</div><div style={{ fontSize: 13 }}>{fmtDate(t.scheduledDate)}</div></div>}
                                {t.completedDate && <div><div style={{ fontSize: 10, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: "var(--text3)", marginBottom: 2 }}>Completed</div><div style={{ fontSize: 13 }}>{fmtDate(t.completedDate)}</div></div>}
                                {t.cost > 0 && <div><div style={{ fontSize: 10, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: "var(--text3)", marginBottom: 2 }}>Cost</div><div style={{ fontSize: 13 }}>{fmt(t.cost)} {cur}</div></div>}
                                {t.notes && <div style={{ gridColumn: "1 / -1" }}><div style={{ fontSize: 10, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: "var(--text3)", marginBottom: 2 }}>Notes</div><div style={{ fontSize: 13, color: "var(--text2)" }}>{t.notes}</div></div>}
                              </div>
                              {t.photos && t.photos.length > 0 && (
                                <div style={{ marginTop: 10 }}>
                                  <div style={{ fontSize: 10, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: "var(--text3)", marginBottom: 4 }}>Photos</div>
                                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                                    {t.photos.map((ph, pi) => (
                                      <a key={pi} href={ph.url} target="_blank" rel="noopener noreferrer" title={ph.filename || `Photo ${pi + 1}`}>
                                        <img src={ph.url} alt={ph.filename || `Photo ${pi + 1}`} style={{ width: 80, height: 60, objectFit: "cover" as const, borderRadius: 6, border: "1px solid var(--border2)" }} />
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {t.attachments && t.attachments.length > 0 && (
                                <div style={{ marginTop: 10 }}>
                                  <div style={{ fontSize: 10, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: "var(--text3)", marginBottom: 4 }}>Documents</div>
                                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                                    {t.attachments.map((a, ai) => (
                                      <a key={ai} href={a.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none", padding: "4px 10px", background: "var(--accent-s)", borderRadius: 6 }}>{a.filename || "Document"}</a>
                                    ))}
                                  </div>
                                </div>
                              )}
                              <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                                {t.approvalStatus === "Approved" ? (
                                  <div style={{ fontSize: 12, color: "var(--green)", fontWeight: 500 }}>Approved by {t.approvedBy || "owner"}{t.approvalDate ? ` on ${fmtDate(t.approvalDate)}` : ""}</div>
                                ) : (
                                  <button
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
                                    style={{ padding: "6px 16px", borderRadius: 6, border: "none", background: "var(--green)", color: "#fff", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", opacity: approvingMaint === t.id ? 0.6 : 1 }}
                                  >{approvingMaint === t.id ? "Approving..." : "\u2713 Approve"}</button>
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
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontFamily: "var(--fd)", fontSize: 28, marginBottom: 6 }}>Availability</div>
                <div style={{ fontSize: 14, color: "var(--text2)" }}>Calendar overview for {property?.name}</div>
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
                  <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 14, marginBottom: 20, overflow: "hidden" }}>
                    <div style={{ padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)" }}>
                      <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); } else setCalMonth(calMonth - 1); }} style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid var(--border2)", background: "transparent", color: "var(--text2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>&lsaquo;</button>
                      <span style={{ fontFamily: "var(--fd)", fontSize: 18 }}>{monthName}</span>
                      <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); } else setCalMonth(calMonth + 1); }} style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid var(--border2)", background: "transparent", color: "var(--text2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>&rsaquo;</button>
                    </div>
                    <div style={{ padding: 20 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, textAlign: "center" as const, marginBottom: 8 }}>
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                          <div key={d} style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: "var(--text3)", padding: "4px 0" }}>{d}</div>
                        ))}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
                        {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                          const day = i + 1;
                          const info = getDayInfo(day);
                          const bg = info.status === "owner" ? "var(--accent)" : info.status === "rental" ? "var(--teal)" : info.status === "guest" ? "#9B8EC4" : "var(--bg4)";
                          const clr = info.status === "available" ? "var(--text3)" : "#fff";
                          return (
                            <div key={day} style={{ width: "100%", aspectRatio: "1", display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", borderRadius: 8, fontSize: 12, fontWeight: 500, background: bg, color: clr, position: "relative" as const, overflow: "hidden" }}>
                              <span>{day}</span>
                              {info.isCheckIn && info.visitLabel && <span style={{ fontSize: 10, lineHeight: "1.2", marginTop: 2, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, padding: "0 2px", fontWeight: 600 }}>{info.visitLabel}</span>}
                            </div>
                          );
                        })}
                      </div>
                      <div style={{ display: "flex", gap: 16, marginTop: 14, justifyContent: "center", flexWrap: "wrap" as const }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text3)" }}><div style={{ width: 10, height: 10, borderRadius: 3, background: "var(--accent)" }} /> Owner visit</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text3)" }}><div style={{ width: 10, height: 10, borderRadius: 3, background: "var(--teal)" }} /> Rental</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text3)" }}><div style={{ width: 10, height: 10, borderRadius: 3, background: "#9B8EC4" }} /> Guest</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text3)" }}><div style={{ width: 10, height: 10, borderRadius: 3, background: "var(--bg4)" }} /> Available</div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Upcoming visits */}
              <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 14, marginBottom: 20, overflow: "hidden" }}>
                <div style={{ padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>Upcoming visits</span>
                  <span style={{ padding: "4px 10px", borderRadius: 100, fontSize: 11, fontWeight: 600, background: "var(--teal-s)", color: "var(--teal-l)" }}>{visits.filter(v => v.status === "Active" || v.status === "Upcoming").length}</span>
                </div>
                <div style={{ padding: "0 20px" }}>
                  {visits.filter(v => v.status === "Active" || v.status === "Upcoming").length === 0 && (
                    <div style={{ padding: 20, color: "var(--text3)", fontSize: 13, textAlign: "center" as const }}>No upcoming visits.</div>
                  )}
                  {visits.filter(v => v.status === "Active" || v.status === "Upcoming").map((v, i, arr) => (
                    <div key={v.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none" }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{v.guestName || v.visitName}</div>
                        <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 3 }}>{fmtDate(v.checkIn)} — {fmtDate(v.checkOut)}{v.adults ? ` · ${v.adults} adult${v.adults > 1 ? "s" : ""}` : ""}{v.children ? `, ${v.children} child${v.children > 1 ? "ren" : ""}` : ""}</div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 100, color: v.visitType === "Rental" ? "var(--teal-l)" : "var(--accent)", background: v.visitType === "Rental" ? "var(--teal-s)" : "var(--accent-s)" }}>{v.visitType}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Register a visit */}
              <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
                <div style={{ padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: showRegisterVisit ? "1px solid var(--border)" : "none" }}>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>Register a visit</span>
                  <button onClick={() => setShowRegisterVisit(!showRegisterVisit)} style={{ padding: "5px 14px", borderRadius: 6, border: "1px solid var(--border2)", background: showRegisterVisit ? "var(--accent-s)" : "transparent", color: showRegisterVisit ? "var(--accent)" : "var(--text2)", fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>{showRegisterVisit ? "Cancel" : "+ New Visit"}</button>
                </div>
                {showRegisterVisit && (
                  <div style={{ padding: 20 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: "var(--text3)", display: "block", marginBottom: 6 }}>Check-in</label>
                        <input type="date" value={newVisitCheckIn} onChange={e => setNewVisitCheckIn(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border2)", background: "var(--bg2)", color: "var(--text)", fontSize: 13, fontFamily: "inherit" }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: "var(--text3)", display: "block", marginBottom: 6 }}>Check-out</label>
                        <input type="date" value={newVisitCheckOut} onChange={e => setNewVisitCheckOut(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border2)", background: "var(--bg2)", color: "var(--text)", fontSize: 13, fontFamily: "inherit" }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: "var(--text3)", display: "block", marginBottom: 6 }}>Adults</label>
                        <input type="number" min={1} value={newVisitAdults} onChange={e => setNewVisitAdults(Number(e.target.value))} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border2)", background: "var(--bg2)", color: "var(--text)", fontSize: 13, fontFamily: "inherit" }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: "var(--text3)", display: "block", marginBottom: 6 }}>Children</label>
                        <input type="number" min={0} value={newVisitChildren} onChange={e => setNewVisitChildren(Number(e.target.value))} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border2)", background: "var(--bg2)", color: "var(--text)", fontSize: 13, fontFamily: "inherit" }} />
                      </div>
                    </div>
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: "var(--text3)", display: "block", marginBottom: 6 }}>Notes</label>
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
                      style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: !newVisitCheckIn || !newVisitCheckOut ? "var(--bg4)" : "var(--accent)", color: !newVisitCheckIn || !newVisitCheckOut ? "var(--text3)" : "#fff", fontSize: 13, fontWeight: 500, cursor: !newVisitCheckIn || !newVisitCheckOut ? "default" : "pointer", fontFamily: "inherit", opacity: addingVisit ? 0.6 : 1 }}
                    >{addingVisit ? "Saving..." : "Register Visit"}</button>
                  </div>
                )}
              </div>
            </>)}

            {/* CONCIERGE */}
            {activePage === "concierge" && (<>
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontFamily: "var(--fd)", fontSize: 28, marginBottom: 6 }}>Concierge &amp; Itinerary</div>
                <div style={{ fontSize: 14, color: "var(--text2)" }}>Upcoming visit details and itinerary for {property?.name}</div>
              </div>

              {(() => {
                const nextVisit = visits.find(v => (v.status === "Active" || v.status === "Upcoming") && v.published);
                if (!nextVisit) {
                  return (
                    <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 14, padding: 40, textAlign: "center" as const, color: "var(--text3)" }}>
                      No upcoming visits. Itinerary events will appear here when a visit is scheduled.
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
                  <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 14, marginBottom: 20, padding: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>{nextVisit.guestName || nextVisit.visitName}</div>
                        <div style={{ fontSize: 13, color: "var(--text2)" }}>{fmtDate(nextVisit.checkIn)} — {fmtDate(nextVisit.checkOut)}</div>
                        {nextVisit.adults > 0 && <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>{nextVisit.adults} adult{nextVisit.adults > 1 ? "s" : ""}{nextVisit.children > 0 ? `, ${nextVisit.children} child${nextVisit.children > 1 ? "ren" : ""}` : ""}</div>}
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 100, color: nextVisit.status === "Active" ? "var(--green)" : "var(--blue)", background: nextVisit.status === "Active" ? "var(--green-s)" : "var(--blue-s)" }}>{nextVisit.status}</span>
                    </div>
                    {nextVisit.notes && <div style={{ marginTop: 12, fontSize: 13, color: "var(--text2)", padding: "10px 14px", background: "var(--bg2)", borderRadius: 8 }}>{nextVisit.notes}</div>}
                  </div>

                  {/* Timeline */}
                  {visitEvents.length === 0 ? (
                    <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 14, padding: 40, textAlign: "center" as const, color: "var(--text3)" }}>
                      No itinerary events scheduled for this visit yet.
                    </div>
                  ) : (
                    <div>
                      {sortedDays.map(day => (
                        <div key={day} style={{ marginBottom: 20 }}>
                          <div style={{ fontFamily: "var(--fd)", fontSize: 18, marginBottom: 10, color: "var(--accent)" }}>{day === "Unscheduled" ? day : fmtDate(day)}</div>
                          <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
                            {grouped[day].map((ev, i, arr) => {
                              const statusColor = ev.status === "Confirmed" ? "var(--green)" : ev.status === "Pending" ? "var(--accent)" : "var(--text3)";
                              return (
                                <div key={ev.id} style={{ display: "flex", gap: 14, padding: "14px 20px", borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none", alignItems: "flex-start" }}>
                                  <div style={{ minWidth: 50, fontSize: 13, fontWeight: 500, color: "var(--teal-l)", paddingTop: 1 }}>{ev.time || "--:--"}</div>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 13, fontWeight: 500 }}>{ev.eventName}</div>
                                    {ev.details && <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 3 }}>{ev.details}</div>}
                                  </div>
                                  <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 100, color: statusColor, background: ev.status === "Confirmed" ? "var(--green-s)" : ev.status === "Pending" ? "var(--accent-s)" : "var(--bg4)" }}>{ev.status || "TBD"}</span>
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