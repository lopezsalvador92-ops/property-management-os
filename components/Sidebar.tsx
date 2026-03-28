"use client";

import { useState } from "react";

type NavItem = {
  id: string;
  icon: string;
  label: string;
  badge?: string;
};

const adminNav: NavItem[] = [
  { id: "dashboard", icon: "◈", label: "Dashboard" },
  { id: "expenses", icon: "⎙", label: "Expenses" },
  { id: "housekeeping", icon: "⌂", label: "Housekeeping", badge: "3" },
  { id: "deposits", icon: "↓", label: "Deposits" },
  { id: "reports", icon: "↗", label: "Reports" },
  { id: "properties", icon: "▦", label: "Properties" },
  { id: "users", icon: "◌", label: "Users" },
];

export default function Sidebar({
  activePage,
  onNavigate,
}: {
  activePage: string;
  onNavigate: (page: string) => void;
}) {
  return (
    <div
      style={{
        width: 260,
        background: "var(--bg2)",
        borderRight: "1px solid var(--border)",
        height: "100vh",
        position: "sticky",
        top: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "auto",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "24px 20px 20px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <svg width="28" height="30" viewBox="0 0 54 58" fill="none">
          <defs>
            <linearGradient id="lg1" x1="27" y1="0" x2="27" y2="36">
              <stop offset="0%" stopColor="#1A2E4A" />
              <stop offset="100%" stopColor="#2A6B7C" />
            </linearGradient>
            <linearGradient id="lg2" x1="27" y1="16" x2="27" y2="46">
              <stop offset="0%" stopColor="#2A6B7C" />
              <stop offset="100%" stopColor="#3A9BAA" />
            </linearGradient>
            <linearGradient id="lg3" x1="27" y1="32" x2="27" y2="56">
              <stop offset="0%" stopColor="#3A9BAA" />
              <stop offset="100%" stopColor="#5CC4C9" />
            </linearGradient>
          </defs>
          <path d="M27 2L50 42H4L27 2Z" fill="url(#lg1)" opacity=".92" />
          <path d="M27 18L44 48H10L27 18Z" fill="url(#lg2)" opacity=".88" />
          <path d="M27 32L38 54H16L27 32Z" fill="url(#lg3)" opacity=".95" />
        </svg>
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase" as const,
              color: "var(--text2)",
            }}
          >
            Cape PM
          </div>
          <div
            style={{
              fontSize: 10,
              color: "var(--text3)",
              letterSpacing: "0.04em",
            }}
          >
            Admin Panel
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div style={{ padding: "16px 12px 8px" }}>
        <div
          style={{
            fontSize: 10,
            textTransform: "uppercase" as const,
            letterSpacing: "0.1em",
            color: "var(--text3)",
            padding: "0 12px 8px",
            fontWeight: 600,
          }}
        >
          Management
        </div>
        {adminNav.map((item) => (
          <div
            key={item.id}
            onClick={() => onNavigate(item.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              borderRadius: 8,
              fontSize: 13,
              color: activePage === item.id ? "var(--accent)" : "var(--text2)",
              background:
                activePage === item.id ? "var(--accent-s)" : "transparent",
              cursor: "pointer",
              position: "relative",
              transition: "all 0.15s",
              userSelect: "none" as const,
            }}
          >
            <span
              style={{
                width: 18,
                textAlign: "center" as const,
                fontSize: 14,
                opacity: activePage === item.id ? 1 : 0.6,
              }}
            >
              {item.icon}
            </span>
            {item.label}
            {item.badge && (
              <span
                style={{
                  position: "absolute" as const,
                  right: 12,
                  minWidth: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: "var(--red)",
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 4px",
                }}
              >
                {item.badge}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Footer */}
      <div
        style={{
          padding: "16px 20px",
          borderTop: "1px solid var(--border)",
          fontSize: 11,
          color: "var(--text3)",
        }}
      >
        Logged in as: Ana García · Admin
      </div>
    </div>
  );
}