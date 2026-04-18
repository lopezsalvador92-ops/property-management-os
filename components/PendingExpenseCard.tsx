"use client";

import { useState } from "react";

type Property = { id: string; name: string };
type Expense = {
  id: string;
  date: string;
  house: string;
  houseId: string;
  category: string;
  supplier: string;
  description: string;
  total: number;
  currency: string;
  receiptUrl: string;
};

const CATEGORIES = ["Utilities", "Villa Staff", "Maintenance", "Cleaning Supplies", "Groceries", "Miscellaneous", "Others", "Rental Expenses"];
const CURRENCIES = ["MXN", "USD"];

export default function PendingExpenseCard({
  expense,
  active,
  onApprove,
  onReject,
  approving,
}: {
  expense: Expense;
  active: Property[];
  onApprove: (id: string, fields?: Record<string, any>) => void;
  onReject: (id: string) => void;
  approving: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    date: expense.date,
    propertyId: expense.houseId,
    category: expense.category || "Miscellaneous",
    supplier: expense.supplier,
    description: expense.description,
    amount: String(expense.total ?? ""),
    currency: expense.currency || "MXN",
  });

  const card: React.CSSProperties = {
    background: "var(--bg3)",
    border: "1px solid var(--border)",
    borderRadius: 14,
    padding: 16,
    display: "grid",
    gridTemplateColumns: "96px 1fr auto",
    gap: 16,
    alignItems: "flex-start",
  };

  const isImage = expense.receiptUrl && !/\.pdf($|\?)/i.test(expense.receiptUrl);

  return (
    <div style={card}>
      <div style={{ width: 96, height: 96, borderRadius: 8, overflow: "hidden", background: "var(--bg2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {expense.receiptUrl ? (
          isImage ? (
            <a href={expense.receiptUrl} target="_blank" rel="noopener">
              <img src={expense.receiptUrl} alt="Receipt" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </a>
          ) : (
            <a href={expense.receiptUrl} target="_blank" rel="noopener" style={{ fontSize: 11, color: "var(--teal-l)", textAlign: "center", padding: 6 }}>View PDF</a>
          )
        ) : (
          <span style={{ fontSize: 10, color: "var(--text3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>No receipt</span>
        )}
      </div>

      <div style={{ minWidth: 0 }}>
        {!editing ? (
          <>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>{expense.supplier || "(no supplier)"}</div>
              <div style={{ fontSize: 11, color: "var(--text3)" }}>{expense.date}</div>
            </div>
            <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 6 }}>{expense.description || <span style={{ color: "var(--text3)" }}>No description</span>}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.04em", padding: "3px 10px", borderRadius: 100, background: "var(--bg2)", color: "var(--text2)" }}>{expense.category || "—"}</span>
              <span style={{ fontSize: 10, color: "var(--text3)" }}>·</span>
              <span style={{ fontSize: 12, color: "var(--text2)" }}>{expense.house || "—"}</span>
              <span style={{ fontSize: 10, color: "var(--text3)" }}>·</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{expense.currency} {Number(expense.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Field label="Date"><input type="date" value={draft.date} onChange={e => setDraft(d => ({ ...d, date: e.target.value }))} style={inp} /></Field>
            <Field label="Property">
              <select value={draft.propertyId} onChange={e => setDraft(d => ({ ...d, propertyId: e.target.value }))} style={inp}>
                {active.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Category">
              <select value={draft.category} onChange={e => setDraft(d => ({ ...d, category: e.target.value }))} style={inp}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Supplier"><input value={draft.supplier} onChange={e => setDraft(d => ({ ...d, supplier: e.target.value }))} style={inp} /></Field>
            <Field label="Amount"><input type="number" value={draft.amount} onChange={e => setDraft(d => ({ ...d, amount: e.target.value }))} style={inp} /></Field>
            <Field label="Currency">
              <select value={draft.currency} onChange={e => setDraft(d => ({ ...d, currency: e.target.value }))} style={inp}>
                {CURRENCIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <div style={{ gridColumn: "1 / -1" }}>
              <Field label="Description"><input value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} style={inp} /></Field>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "stretch", minWidth: 130 }}>
        {!editing ? (
          <>
            <button onClick={() => onApprove(expense.id)} disabled={approving} style={btn("approve")}>
              {approving ? "…" : "Approve"}
            </button>
            <button onClick={() => setEditing(true)} disabled={approving} style={btn("edit")}>Edit & Approve</button>
            <button onClick={() => onReject(expense.id)} disabled={approving} style={btn("reject")}>Reject</button>
          </>
        ) : (
          <>
            <button
              onClick={() => onApprove(expense.id, { date: draft.date, propertyId: draft.propertyId, category: draft.category, supplier: draft.supplier, description: draft.description, amount: draft.amount, currency: draft.currency })}
              disabled={approving}
              style={btn("approve")}
            >{approving ? "…" : "Save & Approve"}</button>
            <button onClick={() => setEditing(false)} disabled={approving} style={btn("cancel")}>Cancel</button>
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text3)", display: "block", marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}

const inp: React.CSSProperties = {
  width: "100%",
  padding: "7px 10px",
  fontSize: 12,
  fontFamily: "inherit",
  background: "var(--bg2)",
  border: "1px solid var(--border2)",
  borderRadius: 6,
  color: "var(--text)",
};

function btn(kind: "approve" | "reject" | "edit" | "cancel"): React.CSSProperties {
  const base: React.CSSProperties = {
    padding: "8px 14px",
    borderRadius: 100,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    cursor: "pointer",
    fontFamily: "inherit",
    border: "none",
  };
  if (kind === "approve") return { ...base, background: "linear-gradient(135deg, var(--teal), #2A6B7C)", color: "#fff" };
  if (kind === "reject") return { ...base, background: "transparent", color: "var(--red)", border: "1px solid var(--red)" };
  if (kind === "edit") return { ...base, background: "var(--bg2)", color: "var(--text2)", border: "1px solid var(--border2)" };
  return { ...base, background: "transparent", color: "var(--text3)", border: "1px solid var(--border2)" };
}
