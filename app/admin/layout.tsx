"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [activePage, setActivePage] = useState("dashboard");

  return (
    <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", minHeight: "100vh" }}>
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <main style={{ overflow: "auto" }}>
        {children}
      </main>
    </div>
  );
}