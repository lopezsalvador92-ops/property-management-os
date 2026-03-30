"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      router.push("/sign-in");
      return;
    }
    const role = (user.publicMetadata as any)?.role || "";
    if (role === "admin" || role === "system_admin") {
      router.push("/admin");
    } else if (role === "owner") {
      router.push("/owner");
    } else {
      router.push("/sign-in");
    }
  }, [user, isLoaded, router]);

  return (
    <div style={{ minHeight: "100vh", background: "#F5F7FA", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <img src="/cape-logo.png" alt="Cape PM" style={{ height: 40, marginBottom: 16, opacity: 0.5 }} />
        <div style={{ fontSize: 13, color: "#8795A8" }}>Loading...</div>
      </div>
    </div>
  );
}