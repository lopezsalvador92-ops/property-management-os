"use client";

import { useEffect, useState } from "react";
import { useUser, UserButton } from "@clerk/nextjs";
import FirstLoginGate from "@/components/FirstLoginGate";

type Role = {
  id: string;
  roleId: string;
  displayName: string;
  modules: string[];
  active: boolean;
};

const ALL_ADMIN_MODULES = [
  { id: "dashboard", label: "Dashboard", description: "Overview with financial pulse, pending reports, alerts" },
  { id: "expenses", label: "Expenses", description: "View and add expenses with category tracking" },
  { id: "deposits", label: "Deposits", description: "Record owner deposits and track balances" },
  { id: "reports", label: "Reports", description: "Monthly report management with status tracking" },
  { id: "housekeeping", label: "Housekeeping", description: "HSK logs, weekly overview, monthly summary" },
  { id: "concierge", label: "Concierge", description: "Visits, itinerary builder, vendor directory" },
  { id: "rentals", label: "Rentals", description: "Guest rentals with hotel-style folios and PDF export" },
  { id: "maintenance", label: "Maintenance", description: "Reactive/preventive tasks, vendor management" },
  { id: "catalog", label: "Property Catalog", description: "Sections, fixed assets, and inventory per property" },
  { id: "calendar", label: "Availability Calendar", description: "Portfolio-wide occupancy grid, weekly/monthly views" },
  { id: "properties", label: "Properties", description: "Property details, fees, HSK config, availability" },
  { id: "users", label: "Users", description: "Clerk user management, roles, passwords" },
  { id: "help", label: "Help", description: "In-app knowledge base and support articles" },
  { id: "settings", label: "Settings", description: "System admin role and module configuration" },
];

const ALL_OWNER_MODULES = [
  { id: "home", label: "Home", description: "Welcome page with balance, maintenance preview, activity" },
  { id: "financials", label: "Financials", description: "Monthly statements, expenses, category charts, YTD" },
  { id: "maintenance", label: "Maintenance", description: "Read-only view of scheduled and completed maintenance" },
  { id: "calendar", label: "Availability", description: "Property calendar, upcoming visits, register visits" },
  { id: "concierge", label: "Concierge", description: "Itinerary timeline for upcoming visits" },
  { id: "help", label: "Help", description: "In-app knowledge base and support articles" },
];

export default function SystemSettings() {
  const { user } = useUser();
  const role = (user?.publicMetadata as any)?.role || "";

  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("light");

  useEffect(() => {
    fetch("/api/platform-config")
      .then(r => r.json())
      .then(d => { setRoles(d.roles || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (role !== "system_admin") {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--fb)", color: "var(--text)" }}>
        <div style={{ textAlign: "center", padding: 40 }}>
          <h1 style={{ fontFamily: "var(--fd)", fontSize: 28, fontWeight: 400, marginBottom: 10 }}>Access Denied</h1>
          <p style={{ color: "var(--text3)", fontSize: 14 }}>This page is only accessible to system administrators.</p>
        </div>
      </div>
    );
  }

  async function toggleModule(roleRecord: Role, moduleId: string) {
    const newModules = roleRecord.modules.includes(moduleId)
      ? roleRecord.modules.filter(m => m !== moduleId)
      : [...roleRecord.modules, moduleId];

    setSaving(roleRecord.id);
    try {
      const res = await fetch("/api/platform-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordId: roleRecord.id, modules: newModules }),
      });
      if (res.ok) {
        setRoles(prev => prev.map(r => r.id === roleRecord.id ? { ...r, modules: newModules } : r));
        setSaved(roleRecord.id);
        setTimeout(() => setSaved(null), 2000);
      }
    } catch (e) { console.error(e); }
    setSaving(null);
  }

  const adminRoles = roles.filter(r => r.roleId !== "owner");
  const ownerRole = roles.find(r => r.roleId === "owner");

  return (
    <div style={{ fontFamily: "var(--fb)", minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      <FirstLoginGate />
      <style>{`
        .sys-toggle{transition:background var(--dur) var(--ease);}
        .sys-toggle-knob{transition:left var(--dur) var(--ease);}
        .sys-row{transition:background var(--dur) var(--ease);}
        .sys-row:hover{background:var(--bg3);}
        .sys-link{transition:color var(--dur) var(--ease);}
        .sys-link:hover{color:var(--accent) !important;}
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
        }
      `}</style>}

      {/* Top bar */}
      <div style={{ background: "var(--bg2)", borderBottom: "1px solid var(--border)", padding: "18px 36px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "var(--shadow-sm)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <img src="/axvia-icon.svg" alt="Property Management OS" style={{ height: 30 }} />
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "var(--text)" }}>System Settings</div>
            <div style={{ fontSize: 10, color: "var(--text3)", letterSpacing: "0.06em", marginTop: 2 }}>Property Management OS · Axvia Solutions</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} style={{ padding: "8px 14px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--text2)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit" }}>{theme === "dark" ? "Light" : "Dark"} Mode</button>
          <a href="/admin" className="sys-link" style={{ fontSize: 10, color: "var(--text2)", textDecoration: "none", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>← Back to Admin</a>
          <UserButton />
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "44px 32px 56px" }}>
        <div style={{ marginBottom: 32 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase" as const, color: "var(--accent)", marginBottom: 10, display: "block" }}>Platform Configuration</span>
          <h1 style={{ fontFamily: "var(--fd)", fontSize: 38, fontWeight: 400, marginBottom: 8, lineHeight: 1.05, letterSpacing: "-0.005em" }}>Roles &amp; Modules</h1>
          <p style={{ fontSize: 13, color: "var(--text2)" }}>Control which modules each role can access. Changes take effect immediately.</p>
          <span style={{ display: "block", width: 36, height: 1, background: "var(--accent-line)", marginTop: 10 }} />
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center" as const, color: "var(--text3)", fontSize: 13 }}>Loading configuration…</div>
        ) : (
          <>
            {/* Admin-side roles */}
            <h2 style={{ fontFamily: "var(--fd)", fontSize: 22, fontWeight: 400, marginBottom: 16, color: "var(--text)" }}>Admin Panel Modules</h2>
            {adminRoles.map(r => (
              <div key={r.id} style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, marginBottom: 22, overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
                <div style={{ padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)" }}>
                  <div>
                    <span style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>{r.displayName}</span>
                    <span style={{ fontSize: 11, color: "var(--text3)", marginLeft: 10, letterSpacing: "0.04em" }}>({r.roleId})</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {saving === r.id && <span style={{ fontSize: 9, color: "var(--text3)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Saving…</span>}
                    {saved === r.id && <span style={{ fontSize: 9, color: "var(--green)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>✓ Saved</span>}
                    <span style={{ fontSize: 9, padding: "4px 11px", borderRadius: 100, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", background: r.active ? "var(--green-s)" : "var(--bg4)", color: r.active ? "var(--green)" : "var(--text3)" }}>{r.active ? "Active" : "Inactive"}</span>
                  </div>
                </div>
                <div style={{ padding: "8px 24px 14px" }}>
                  {ALL_ADMIN_MODULES.map(mod => {
                    const enabled = r.modules.includes(mod.id);
                    const isSystem = r.roleId === "system_admin" && mod.id === "settings";
                    return (
                      <div key={mod.id} className="sys-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 4px", borderBottom: "1px solid var(--border)", borderRadius: 6 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{mod.label}</div>
                          <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{mod.description}</div>
                        </div>
                        <button
                          className="sys-toggle"
                          onClick={() => !isSystem && toggleModule(r, mod.id)}
                          disabled={isSystem}
                          title={isSystem ? "System admin always has access to settings" : enabled ? "Click to disable" : "Click to enable"}
                          style={{
                            width: 44, height: 24, borderRadius: 100, border: "none",
                            background: enabled ? "var(--accent)" : "var(--bg4)",
                            cursor: isSystem ? "not-allowed" : "pointer",
                            position: "relative" as const,
                            opacity: isSystem ? 0.4 : 1,
                            flexShrink: 0,
                          }}>
                          <div className="sys-toggle-knob" style={{
                            width: 18, height: 18, borderRadius: "50%", background: "#fff",
                            position: "absolute" as const, top: 3,
                            left: enabled ? 23 : 3,
                            boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
                          }} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Owner role */}
            {ownerRole && (
              <>
                <h2 style={{ fontFamily: "var(--fd)", fontSize: 22, fontWeight: 400, marginBottom: 16, marginTop: 36, color: "var(--text)" }}>Owner Portal Modules</h2>
                <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, marginBottom: 22, overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
                  <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>{ownerRole.displayName}</span>
                    <span style={{ fontSize: 11, color: "var(--text3)", marginLeft: 10, letterSpacing: "0.04em" }}>({ownerRole.roleId})</span>
                  </div>
                  <div style={{ padding: "8px 24px 14px" }}>
                    {ALL_OWNER_MODULES.map(mod => {
                      const enabled = ownerRole.modules.includes(mod.id);
                      return (
                        <div key={mod.id} className="sys-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 4px", borderBottom: "1px solid var(--border)", borderRadius: 6 }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{mod.label}</div>
                            <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{mod.description}</div>
                          </div>
                          <button
                            className="sys-toggle"
                            onClick={() => toggleModule(ownerRole, mod.id)}
                            title={enabled ? "Click to disable" : "Click to enable"}
                            style={{
                              width: 44, height: 24, borderRadius: 100, border: "none",
                              background: enabled ? "var(--accent)" : "var(--bg4)",
                              cursor: "pointer",
                              position: "relative" as const,
                              flexShrink: 0,
                            }}>
                            <div className="sys-toggle-knob" style={{
                              width: 18, height: 18, borderRadius: "50%", background: "#fff",
                              position: "absolute" as const, top: 3,
                              left: enabled ? 23 : 3,
                              boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
                            }} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Info box */}
            <div style={{ background: "var(--accent-s)", border: "1px solid var(--accent-line)", borderRadius: 12, padding: "20px 24px", marginTop: 28, boxShadow: "var(--shadow-sm)" }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 6 }}>How this works</div>
              <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6 }}>
                Toggling a module on or off controls visibility for that role. Admin users with the &ldquo;admin&rdquo; role will only see the modules you enable here. The &ldquo;system_admin&rdquo; role always has access to Settings and cannot be locked out. Changes save to Airtable immediately.
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
