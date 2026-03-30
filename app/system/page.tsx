"use client";

import { useEffect, useState } from "react";
import { useUser, UserButton } from "@clerk/nextjs";

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
  { id: "properties", label: "Properties", description: "Property details, fees, HSK config" },
  { id: "users", label: "Users", description: "Clerk user management, roles, passwords" },
  { id: "settings", label: "Settings", description: "System admin role and module configuration" },
];

const ALL_OWNER_MODULES = [
  { id: "home", label: "Home", description: "Welcome page with balance, recent activity" },
  { id: "financials", label: "Financials", description: "Monthly statements, expenses, category charts, YTD" },
];

export default function SystemSettings() {
  const { user } = useUser();
  const role = (user?.publicMetadata as any)?.role || "";

  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/platform-config")
      .then(r => r.json())
      .then(d => { setRoles(d.roles || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (role !== "system_admin") {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg, #F5F7FA)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <div style={{ textAlign: "center", padding: 40 }}>
          <h1 style={{ fontSize: 24, marginBottom: 8 }}>Access Denied</h1>
          <p style={{ color: "#8795A8" }}>This page is only accessible to system administrators.</p>
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
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", minHeight: "100vh", background: "#F5F7FA", color: "#1A1A2E" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet" />

      {/* Top bar */}
      <div style={{ background: "#fff", borderBottom: "1px solid rgba(0,0,0,0.08)", padding: "16px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src="/cape-logo.png" alt="Cape PM" style={{ height: 28 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "#4A5568" }}>System Settings</div>
            <div style={{ fontSize: 11, color: "#8795A8" }}>Cape PM OS - Axvia Solutions</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <a href="/admin" style={{ fontSize: 13, color: "#2A8B9A", textDecoration: "none", fontWeight: 500 }}>Back to Admin</a>
          <UserButton />
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>
        <h1 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 28, marginBottom: 6 }}>Role & Module Configuration</h1>
        <p style={{ fontSize: 14, color: "#8795A8", marginBottom: 32 }}>Control which modules each role can access. Changes take effect immediately.</p>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center" as const, color: "#8795A8" }}>Loading configuration...</div>
        ) : (
          <>
            {/* Admin-side roles */}
            <h2 style={{ fontSize: 18, fontWeight: 500, marginBottom: 16 }}>Admin Panel Modules</h2>
            {adminRoles.map(r => (
              <div key={r.id} style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, marginBottom: 20, overflow: "hidden" }}>
                <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                  <div>
                    <span style={{ fontSize: 15, fontWeight: 600 }}>{r.displayName}</span>
                    <span style={{ fontSize: 12, color: "#8795A8", marginLeft: 8 }}>({r.roleId})</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {saving === r.id && <span style={{ fontSize: 11, color: "#8795A8" }}>Saving...</span>}
                    {saved === r.id && <span style={{ fontSize: 11, color: "#2D8B57" }}>Saved</span>}
                    <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 100, background: r.active ? "rgba(45,139,87,0.08)" : "rgba(0,0,0,0.04)", color: r.active ? "#2D8B57" : "#8795A8", fontWeight: 600 }}>{r.active ? "Active" : "Inactive"}</span>
                  </div>
                </div>
                <div style={{ padding: "12px 20px" }}>
                  {ALL_ADMIN_MODULES.map(mod => {
                    const enabled = r.modules.includes(mod.id);
                    const isSystem = r.roleId === "system_admin" && mod.id === "settings";
                    return (
                      <div key={mod.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{mod.label}</div>
                          <div style={{ fontSize: 11, color: "#8795A8" }}>{mod.description}</div>
                        </div>
                        <button
                          onClick={() => !isSystem && toggleModule(r, mod.id)}
                          disabled={isSystem}
                          style={{
                            width: 44, height: 24, borderRadius: 12, border: "none",
                            background: enabled ? "#2A8B9A" : "#E2E8F0",
                            cursor: isSystem ? "not-allowed" : "pointer",
                            position: "relative" as const, transition: "background 0.2s",
                            opacity: isSystem ? 0.5 : 1,
                          }}>
                          <div style={{
                            width: 18, height: 18, borderRadius: "50%", background: "#fff",
                            position: "absolute" as const, top: 3,
                            left: enabled ? 23 : 3,
                            transition: "left 0.2s",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
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
                <h2 style={{ fontSize: 18, fontWeight: 500, marginBottom: 16, marginTop: 32 }}>Owner Portal Modules</h2>
                <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, marginBottom: 20, overflow: "hidden" }}>
                  <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                    <span style={{ fontSize: 15, fontWeight: 600 }}>{ownerRole.displayName}</span>
                    <span style={{ fontSize: 12, color: "#8795A8", marginLeft: 8 }}>({ownerRole.roleId})</span>
                  </div>
                  <div style={{ padding: "12px 20px" }}>
                    {ALL_OWNER_MODULES.map(mod => {
                      const enabled = ownerRole.modules.includes(mod.id);
                      return (
                        <div key={mod.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 500 }}>{mod.label}</div>
                            <div style={{ fontSize: 11, color: "#8795A8" }}>{mod.description}</div>
                          </div>
                          <button
                            onClick={() => toggleModule(ownerRole, mod.id)}
                            style={{
                              width: 44, height: 24, borderRadius: 12, border: "none",
                              background: enabled ? "#2A8B9A" : "#E2E8F0",
                              cursor: "pointer",
                              position: "relative" as const, transition: "background 0.2s",
                            }}>
                            <div style={{
                              width: 18, height: 18, borderRadius: "50%", background: "#fff",
                              position: "absolute" as const, top: 3,
                              left: enabled ? 23 : 3,
                              transition: "left 0.2s",
                              boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
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
            <div style={{ background: "rgba(42,139,154,0.06)", border: "1px solid rgba(42,139,154,0.12)", borderRadius: 10, padding: "16px 20px", marginTop: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#2A8B9A", marginBottom: 4 }}>How this works</div>
              <div style={{ fontSize: 12, color: "#4A5568", lineHeight: 1.6 }}>
                Toggling a module on/off controls visibility for that role. Admin users with the "admin" role will only see the modules you enable here. The "system_admin" role always has access to Settings and cannot be locked out. Changes save to Airtable immediately.
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}