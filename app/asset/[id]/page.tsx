"use client";

import { useEffect, useState, use } from "react";
import { useUser, UserButton } from "@clerk/nextjs";
import Link from "next/link";

type Asset = {
  id: string;
  name: string;
  propertyIds: string[];
  sectionIds: string[];
  category: string;
  status: string;
  brand: string;
  model: string;
  serialNumber: string;
  purchaseDate: string;
  purchaseCost: number;
  warrantyUntil: string;
  photos: { url: string; filename: string }[];
  notes: string;
};

type Task = {
  id: string;
  title: string;
  type: string;
  status: string;
  priority: string;
  propertyName: string;
  vendorName: string;
  scheduledDate: string;
  completedDate: string;
  cost: number;
  notes: string;
};

const STATUS_OPTIONS = ["Active", "Needs Repair", "Out of Service", "Retired"];
const PRIORITY_OPTIONS = ["Low", "Medium", "High", "Urgent"];

const statusColor = (s: string) => {
  if (s === "Needs Repair") return { bg: "var(--red-s)", fg: "var(--red)" };
  if (s === "Out of Service" || s === "Retired") return { bg: "var(--bg4)", fg: "var(--text3)" };
  return { bg: "var(--green-s)", fg: "var(--green)" };
};

export default function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, isLoaded } = useUser();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [propertyName, setPropertyName] = useState("");
  const [sectionName, setSectionName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("light");

  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("Medium");
  const [newTaskScheduledDate, setNewTaskScheduledDate] = useState("");
  const [newTaskNotes, setNewTaskNotes] = useState("");
  const [creatingTask, setCreatingTask] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [aRes, tRes] = await Promise.all([
        fetch(`/api/assets?id=${id}`).then(r => r.json()),
        fetch(`/api/maintenance?assetId=${id}`).then(r => r.json()),
      ]);
      if (aRes.asset) {
        setAsset(aRes.asset);
        setNotesDraft(aRes.asset.notes || "");
        if (aRes.asset.propertyIds?.[0]) {
          fetch(`/api/properties`).then(r => r.json()).then(d => {
            const p = (d.properties || []).find((p: any) => p.id === aRes.asset.propertyIds[0]);
            if (p) setPropertyName(p.name || "");
          }).catch(() => {});
        }
        if (aRes.asset.sectionIds?.[0]) {
          fetch(`/api/sections`).then(r => r.json()).then(d => {
            const s = (d.sections || []).find((s: any) => s.id === aRes.asset.sectionIds[0]);
            if (s) setSectionName(s.name || "");
          }).catch(() => {});
        }
      }
      setTasks(tRes.tasks || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  async function updateStatus(status: string) {
    if (!asset) return;
    setSaving(true);
    try {
      await fetch("/api/assets", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: asset.id, status }) });
      setAsset({ ...asset, status });
    } catch (e) { console.error(e); }
    setSaving(false);
  }

  async function saveNotes() {
    if (!asset) return;
    setSaving(true);
    try {
      await fetch("/api/assets", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: asset.id, notes: notesDraft }) });
      setAsset({ ...asset, notes: notesDraft });
      setEditingNotes(false);
    } catch (e) { console.error(e); }
    setSaving(false);
  }

  async function createTask() {
    if (!asset || !newTaskTitle.trim()) return;
    setCreatingTask(true);
    try {
      await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          type: "Reactive",
          status: "Open",
          priority: newTaskPriority,
          propertyId: asset.propertyIds[0] || undefined,
          assetId: asset.id,
          scheduledDate: newTaskScheduledDate || undefined,
          notes: newTaskNotes || undefined,
        }),
      });
      setNewTaskTitle("");
      setNewTaskPriority("Medium");
      setNewTaskScheduledDate("");
      setNewTaskNotes("");
      setShowTaskForm(false);
      const t = await fetch(`/api/maintenance?assetId=${id}`).then(r => r.json());
      setTasks(t.tasks || []);
    } catch (e) { console.error(e); }
    setCreatingTask(false);
  }

  if (!isLoaded) return null;
  if (!user) return <div style={{ padding: 40, fontFamily: "var(--fb)" }}>Please sign in.</div>;

  const today = new Date().toISOString().split("T")[0];
  const upcoming = tasks.filter(t => (t.status === "Open" || t.status === "Scheduled" || t.status === "In Progress") && (!t.completedDate)).sort((a, b) => (a.scheduledDate || "").localeCompare(b.scheduledDate || ""));
  const recent = tasks.filter(t => t.completedDate || t.status === "Completed" || t.status === "Done").sort((a, b) => (b.completedDate || "").localeCompare(a.completedDate || "")).slice(0, 10);

  const sc = asset ? statusColor(asset.status) : { bg: "var(--bg4)", fg: "var(--text3)" };

  return (
    <div style={{ fontFamily: "var(--fb)", minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
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
      <div style={{ background: "var(--bg2)", borderBottom: "1px solid var(--border)", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/admin" style={{ fontSize: 11, color: "var(--text2)", textDecoration: "none", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>← Admin</Link>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} style={{ padding: "6px 12px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--text2)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}>{theme === "dark" ? "Light" : "Dark"}</button>
          <UserButton />
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 20px 60px" }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--text3)", fontSize: 13 }}>Loading asset…</div>
        ) : !asset ? (
          <div style={{ padding: 60, textAlign: "center" }}>
            <h1 style={{ fontFamily: "var(--fd)", fontSize: 22, fontWeight: 400, color: "var(--text)" }}>Asset not found</h1>
            <p style={{ fontSize: 13, color: "var(--text3)", marginTop: 8 }}>It may have been deleted, or the QR code is stale.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 6 }}>
                {propertyName || "Property"}{sectionName ? ` · ${sectionName}` : ""}
              </div>
              <h1 style={{ fontFamily: "var(--fd)", fontSize: 32, fontWeight: 400, lineHeight: 1.1, letterSpacing: "-0.005em", marginBottom: 10 }}>{asset.name}</h1>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, padding: "5px 12px", borderRadius: 100, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", background: sc.bg, color: sc.fg }}>{asset.status || "Active"}</span>
                {asset.category && <span style={{ fontSize: 11, color: "var(--text3)", letterSpacing: "0.04em" }}>{asset.category}</span>}
              </div>
            </div>

            {/* Photo strip */}
            {asset.photos.length > 0 && (
              <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 20, paddingBottom: 4 }}>
                {asset.photos.map((p, i) => (
                  <a key={i} href={p.url} target="_blank" rel="noreferrer" style={{ flexShrink: 0 }}>
                    <img src={p.url} alt={p.filename} style={{ height: 120, borderRadius: 8, objectFit: "cover", border: "1px solid var(--border)" }} />
                  </a>
                ))}
              </div>
            )}

            {/* Status quick update */}
            <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 18px", marginBottom: 16 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--text3)", marginBottom: 10 }}>Status</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {STATUS_OPTIONS.map(s => {
                  const active = asset.status === s;
                  return (
                    <button key={s} onClick={() => !active && updateStatus(s)} disabled={saving || active} style={{
                      padding: "7px 12px", borderRadius: 100, border: "1px solid " + (active ? "var(--accent)" : "var(--border2)"),
                      background: active ? "var(--accent)" : "transparent",
                      color: active ? "#fff" : "var(--text2)",
                      fontSize: 11, fontWeight: 600, fontFamily: "inherit",
                      cursor: active ? "default" : "pointer", opacity: saving ? 0.5 : 1,
                    }}>{s}</button>
                  );
                })}
              </div>
            </div>

            {/* Specs */}
            <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 18px", marginBottom: 16 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--text3)", marginBottom: 12 }}>Specs</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 20px", fontSize: 13 }}>
                {asset.brand && <div><div style={{ color: "var(--text3)", fontSize: 11 }}>Brand</div><div>{asset.brand}</div></div>}
                {asset.model && <div><div style={{ color: "var(--text3)", fontSize: 11 }}>Model</div><div>{asset.model}</div></div>}
                {asset.serialNumber && <div><div style={{ color: "var(--text3)", fontSize: 11 }}>Serial</div><div style={{ fontFamily: "monospace" }}>{asset.serialNumber}</div></div>}
                {asset.purchaseDate && <div><div style={{ color: "var(--text3)", fontSize: 11 }}>Purchased</div><div>{asset.purchaseDate}</div></div>}
                {!!asset.purchaseCost && <div><div style={{ color: "var(--text3)", fontSize: 11 }}>Cost</div><div>${asset.purchaseCost.toLocaleString()}</div></div>}
                {asset.warrantyUntil && <div><div style={{ color: "var(--text3)", fontSize: 11 }}>Warranty Until</div><div style={{ color: asset.warrantyUntil >= today ? "var(--green)" : "var(--text3)" }}>{asset.warrantyUntil}</div></div>}
              </div>
            </div>

            {/* Notes */}
            <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 18px", marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--text3)" }}>Notes</div>
                {!editingNotes && <button onClick={() => setEditingNotes(true)} style={{ fontSize: 10, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Edit</button>}
              </div>
              {editingNotes ? (
                <>
                  <textarea value={notesDraft} onChange={e => setNotesDraft(e.target.value)} rows={4} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--border2)", background: "var(--bg)", color: "var(--text)", fontSize: 13, fontFamily: "inherit", resize: "vertical" }} />
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button onClick={saveNotes} disabled={saving} style={{ padding: "7px 14px", background: "var(--accent)", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit" }}>Save</button>
                    <button onClick={() => { setNotesDraft(asset.notes); setEditingNotes(false); }} style={{ padding: "7px 14px", background: "transparent", color: "var(--text2)", border: "1px solid var(--border2)", borderRadius: 6, fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 13, color: asset.notes ? "var(--text)" : "var(--text3)", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{asset.notes || "No notes."}</div>
              )}
            </div>

            {/* Maintenance */}
            <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 18px", marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--text3)" }}>Maintenance</div>
                <button onClick={() => setShowTaskForm(!showTaskForm)} style={{ padding: "6px 12px", background: showTaskForm ? "transparent" : "var(--accent)", color: showTaskForm ? "var(--text2)" : "#fff", border: showTaskForm ? "1px solid var(--border2)" : "none", borderRadius: 6, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit" }}>{showTaskForm ? "Cancel" : "+ Reactive Task"}</button>
              </div>

              {showTaskForm && (
                <div style={{ padding: 14, background: "var(--bg)", borderRadius: 8, border: "1px solid var(--border)", marginBottom: 14 }}>
                  <input value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} placeholder="What's wrong?" style={{ width: "100%", padding: 9, borderRadius: 6, border: "1px solid var(--border2)", background: "var(--bg2)", color: "var(--text)", fontSize: 13, fontFamily: "inherit", marginBottom: 8 }} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                    <select value={newTaskPriority} onChange={e => setNewTaskPriority(e.target.value)} style={{ padding: 9, borderRadius: 6, border: "1px solid var(--border2)", background: "var(--bg2)", color: "var(--text)", fontSize: 13, fontFamily: "inherit" }}>
                      {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p} priority</option>)}
                    </select>
                    <input type="date" value={newTaskScheduledDate} onChange={e => setNewTaskScheduledDate(e.target.value)} style={{ padding: 9, borderRadius: 6, border: "1px solid var(--border2)", background: "var(--bg2)", color: "var(--text)", fontSize: 13, fontFamily: "inherit" }} />
                  </div>
                  <textarea value={newTaskNotes} onChange={e => setNewTaskNotes(e.target.value)} rows={2} placeholder="Notes (optional)" style={{ width: "100%", padding: 9, borderRadius: 6, border: "1px solid var(--border2)", background: "var(--bg2)", color: "var(--text)", fontSize: 13, fontFamily: "inherit", marginBottom: 8, resize: "vertical" }} />
                  <button onClick={createTask} disabled={creatingTask || !newTaskTitle.trim()} style={{ padding: "8px 16px", background: "var(--accent)", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", cursor: newTaskTitle.trim() ? "pointer" : "not-allowed", opacity: newTaskTitle.trim() ? 1 : 0.5, fontFamily: "inherit" }}>{creatingTask ? "Creating…" : "Create Task"}</button>
                </div>
              )}

              {upcoming.length > 0 && (
                <>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text2)", marginBottom: 8 }}>Open / Upcoming</div>
                  {upcoming.map(t => (
                    <div key={t.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 10 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{t.title}</div>
                          <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 3 }}>{t.type} · {t.priority} priority{t.scheduledDate ? ` · ${t.scheduledDate}` : ""}{t.vendorName ? ` · ${t.vendorName}` : ""}</div>
                        </div>
                        <span style={{ fontSize: 10, padding: "3px 9px", borderRadius: 100, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", background: "var(--accent-s)", color: "var(--accent)" }}>{t.status}</span>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {recent.length > 0 && (
                <>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text2)", marginTop: upcoming.length ? 16 : 0, marginBottom: 8 }}>Recent</div>
                  {recent.map(t => (
                    <div key={t.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 10 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{t.title}</div>
                          <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 3 }}>{t.type}{t.completedDate ? ` · done ${t.completedDate}` : ""}{t.cost ? ` · $${t.cost.toLocaleString()}` : ""}</div>
                        </div>
                        <span style={{ fontSize: 10, padding: "3px 9px", borderRadius: 100, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", background: "var(--green-s)", color: "var(--green)" }}>Done</span>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {!upcoming.length && !recent.length && !showTaskForm && (
                <div style={{ fontSize: 13, color: "var(--text3)", padding: "12px 0" }}>No maintenance history yet.</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
