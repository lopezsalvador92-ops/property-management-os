/**
 * Shared Cape PM PDF branding: styles, colors, header/footer components.
 * Used by event-confirmation, itinerary, and rental folio PDFs.
 */
import React from "react";
import { Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import path from "path";
import fs from "fs";

// ---------- Colors ----------
export const C = {
  dark: "#1A1A1A",
  text: "#333333",
  text2: "#666666",
  text3: "#999999",
  teal: "#388C91",
  gold: "#B5935A",
  goldLight: "#D4B683",
  border: "#E5E5E0",
  bgLight: "#FAFAF8",
  white: "#FFFFFF",
};

// ---------- Logo ----------
let logoBase64: string | null = null;
export function getLogoDataUri(): string {
  if (logoBase64) return logoBase64;
  try {
    const logoPath = path.join(process.cwd(), "public", "cape-logo.png");
    const buf = fs.readFileSync(logoPath);
    logoBase64 = `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    logoBase64 = "";
  }
  return logoBase64;
}

// ---------- Common styles ----------
export const s = StyleSheet.create({
  page: {
    padding: "48 50 60 50",
    fontFamily: "Helvetica",
    fontSize: 10,
    color: C.text,
    backgroundColor: C.white,
  },
  // Header
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  logo: { width: 130, objectFit: "contain" as const },
  headerRight: { alignItems: "flex-end" as const, gap: 2 },
  headerLabel: { fontSize: 8, color: C.text3, letterSpacing: 1.5, textTransform: "uppercase" as const },
  headerValue: { fontSize: 10, color: C.text, fontFamily: "Helvetica-Bold" },
  // Gold rule
  goldRule: { height: 1.5, backgroundColor: C.gold, marginTop: 14, marginBottom: 18 },
  // Section title
  sectionTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: C.text3,
    letterSpacing: 2,
    textTransform: "uppercase" as const,
    marginBottom: 10,
  },
  // Detail rows
  detailRow: { flexDirection: "row", marginBottom: 6 },
  detailLabel: { width: 120, fontSize: 9, color: C.text3 },
  detailValue: { flex: 1, fontSize: 10, color: C.text },
  // Footer
  footer: {
    position: "absolute" as const,
    bottom: 30,
    left: 50,
    right: 50,
    textAlign: "center" as const,
  },
  footerRule: { height: 0.5, backgroundColor: C.border, marginBottom: 8 },
  footerText: { fontSize: 7, color: C.text3, letterSpacing: 0.5 },
});

// ---------- Header Component ----------
export function PdfHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const logo = getLogoDataUri();
  return (
    <View>
      <View style={s.headerRow}>
        {logo ? <Image src={logo} style={s.logo} /> : <Text style={{ fontSize: 14, fontFamily: "Helvetica-Bold" }}>Cape PM</Text>}
        <View style={s.headerRight}>
          <Text style={{ fontSize: 16, fontFamily: "Times-Bold", color: C.dark, letterSpacing: 0.5 }}>{title}</Text>
          {subtitle && <Text style={{ fontSize: 9, color: C.text2, marginTop: 2 }}>{subtitle}</Text>}
        </View>
      </View>
      <View style={s.goldRule} />
    </View>
  );
}

// ---------- Footer Component ----------
export function PdfFooter() {
  return (
    <View style={s.footer} fixed>
      <View style={s.footerRule} />
      <Text style={s.footerText}>Cape Property Management Services  |  admin@capepm.com.mx  |  624 113 2714</Text>
      <Text style={{ ...s.footerText, marginTop: 2 }}>Los Cabos, Mexico</Text>
    </View>
  );
}

// ---------- Detail Row ----------
export function DetailRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <View style={s.detailRow}>
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={s.detailValue}>{value}</Text>
    </View>
  );
}

// ---------- Helpers ----------
export function fmtDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr + "T12:00:00Z");
    return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
  } catch {
    return dateStr;
  }
}

export function fmtCurrency(amount: number, currency: string): string {
  if (!amount && amount !== 0) return "";
  const sym = currency === "MXN" ? "MX$" : "$";
  return `${sym}${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
