"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

/**
 * Blocking modal that forces a user whose publicMetadata.mustChangePassword
 * is `true` to rotate their password before using the app. After a successful
 * change the server clears the flag via /api/users/password-changed.
 *
 * Mounted at the root of /admin, /owner and /system pages.
 */
export default function FirstLoginGate() {
  const { isLoaded, user } = useUser();
  const [mustChange, setMustChange] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoaded || !user) return;
    setMustChange(!!user.publicMetadata?.mustChangePassword);
  }, [isLoaded, user]);

  if (!isLoaded || !user || !mustChange) return null;

  async function submit() {
    if (!user) return;
    setError("");
    if (next.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      setError("New password and confirmation do not match.");
      return;
    }
    setSubmitting(true);
    try {
      await user.updatePassword({
        currentPassword: current,
        newPassword: next,
        signOutOfOtherSessions: true,
      });
      const res = await fetch("/api/users/password-changed", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to clear flag");
      }
      // Force reload so every page state re-reads the cleared metadata.
      window.location.reload();
    } catch (e: any) {
      const msg =
        e?.errors?.[0]?.longMessage ||
        e?.errors?.[0]?.message ||
        e?.message ||
        "Failed to change password.";
      setError(msg);
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10, 20, 30, 0.72)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 20,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          background: "var(--bg1, #fff)",
          color: "var(--text1, #1a1a1a)",
          borderRadius: 16,
          padding: "28px 28px 24px",
          boxShadow: "0 24px 60px rgba(0,0,0,0.32)",
          fontFamily: "inherit",
        }}
      >
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--text3, #888)",
            fontWeight: 700,
          }}
        >
          Security
        </div>
        <h2 style={{ margin: "6px 0 6px", fontSize: 22, fontWeight: 600 }}>
          Set a new password
        </h2>
        <p style={{ margin: "0 0 18px", fontSize: 13, color: "var(--text2, #555)", lineHeight: 1.5 }}>
          For your security, please choose a new password before continuing. The
          temporary password you were given will no longer work.
        </p>

        {error && (
          <div
            style={{
              padding: "10px 12px",
              background: "rgba(224,133,133,0.12)",
              color: "var(--red, #c0392b)",
              borderRadius: 8,
              fontSize: 12,
              marginBottom: 14,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: "grid", gap: 12 }}>
          <Field
            label="Current password"
            value={current}
            onChange={setCurrent}
            autoFocus
          />
          <Field label="New password" value={next} onChange={setNext} />
          <Field
            label="Confirm new password"
            value={confirm}
            onChange={setConfirm}
          />
        </div>

        <button
          onClick={submit}
          disabled={submitting || !current || !next || !confirm}
          style={{
            marginTop: 20,
            width: "100%",
            padding: "12px 18px",
            borderRadius: 100,
            border: "none",
            background:
              submitting || !current || !next || !confirm
                ? "var(--bg2, #ddd)"
                : "linear-gradient(135deg, var(--teal, #2A6B7C), #2A6B7C)",
            color: submitting || !current || !next || !confirm ? "var(--text3, #888)" : "#fff",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            cursor:
              submitting || !current || !next || !confirm ? "default" : "pointer",
            fontFamily: "inherit",
          }}
        >
          {submitting ? "Saving…" : "Update password"}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--text3, #888)",
          fontWeight: 600,
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <input
        type="password"
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: 10,
          border: "1px solid var(--border2, #ddd)",
          background: "var(--bg0, #fafafa)",
          color: "inherit",
          fontSize: 14,
          fontFamily: "inherit",
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}
