import React from "react";
import { NextResponse } from "next/server";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { renderToBuffer } from "@react-pdf/renderer";
import { PdfHeader, PdfFooter, s, C, fmtDate } from "../branding";

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;
const RENTALS_TABLE = "tblAG4GqV5jCgAC7x";
const PROPERTIES_TABLE = "tblCTRtMtVNv0F63W";
const EXPENSES_TABLE = "tblHeiBjXhsKW9Opj";

async function airtableFetch(path: string) {
  const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${path}`, {
    headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Airtable ${res.status}`);
  return res.json();
}

async function fetchAllExpenses() {
  const all: any[] = [];
  let offset: string | undefined;
  do {
    const params = new URLSearchParams();
    params.set("pageSize", "100");
    ["Receipt No", "Date", "Expense Category", "Supplier", "Total", "Currency",
     "Description", "Total Amount (USD)",
    ].forEach(f => params.append("fields[]", f));
    if (offset) params.set("offset", offset);
    const data = await airtableFetch(`${EXPENSES_TABLE}?${params}`);
    all.push(...(data.records || []));
    offset = data.offset;
  } while (offset);
  return all;
}

const local = StyleSheet.create({
  // Guest/property strip
  infoStrip: { flexDirection: "row", justifyContent: "space-between", marginBottom: 18 },
  infoBlock: { flex: 1 },
  infoBlockRight: { alignItems: "flex-end" as const },
  infoLabel: { fontSize: 7, color: C.text3, letterSpacing: 1.5, textTransform: "uppercase" as const, marginBottom: 3 },
  infoValue: { fontSize: 11, color: C.dark, fontFamily: "Helvetica-Bold" },
  infoSub: { fontSize: 9, color: C.text2, marginTop: 1 },

  // Folio heading
  folioHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderTop: `2 solid ${C.gold}`,
    paddingTop: 14,
    marginTop: 6,
    marginBottom: 14,
  },
  folioTitle: { fontSize: 14, fontFamily: "Times-Bold", color: C.dark, letterSpacing: 0.3 },
  folioSubtitle: { fontSize: 9, color: C.text3, letterSpacing: 1.2, textTransform: "uppercase" as const, marginBottom: 3 },
  folioId: { fontSize: 12, fontFamily: "Helvetica-Bold", color: C.dark },

  // Table
  tableHeaderRow: {
    flexDirection: "row",
    paddingBottom: 6,
    paddingTop: 4,
    borderBottom: `0.75 solid ${C.border}`,
    marginBottom: 2,
  },
  th: { fontSize: 7.5, color: C.text3, letterSpacing: 1.4, textTransform: "uppercase" as const, fontFamily: "Helvetica-Bold" },
  thDesc: { flex: 1 },
  thCur: { width: 55, textAlign: "right" as const },
  thOrig: { width: 65, textAlign: "right" as const },
  thTotal: { width: 75, textAlign: "right" as const },

  // Section heading (guest group)
  sectionHeading: {
    fontSize: 9,
    color: C.teal,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.5,
    textTransform: "uppercase" as const,
    paddingTop: 10,
    paddingBottom: 4,
  },

  // Line row
  row: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottom: `0.5 solid ${C.border}`,
    alignItems: "flex-start" as const,
  },
  rowDesc: { flex: 1, paddingRight: 8 },
  rowDescText: { fontSize: 10, color: C.text },
  rowMeta: { fontSize: 7.5, color: C.text3, marginTop: 2 },
  rowCur: { width: 55, textAlign: "right" as const, fontSize: 9, color: C.text3 },
  rowOrig: { width: 65, textAlign: "right" as const, fontSize: 9.5, color: C.text2, fontFamily: "Courier" },
  rowTotal: { width: 75, textAlign: "right" as const, fontSize: 10, color: C.dark, fontFamily: "Helvetica-Bold" },

  // Totals
  totalsBox: {
    marginTop: 20,
    paddingTop: 14,
    borderTop: `2 solid ${C.gold}`,
    alignItems: "flex-end" as const,
  },
  totalsInner: { width: 260 },
  totalLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  totalLabel: { fontSize: 9.5, color: C.text2 },
  totalValue: { fontSize: 10, color: C.dark, fontFamily: "Courier" },
  grandLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    marginTop: 4,
    borderTop: `0.5 solid ${C.border}`,
  },
  grandLabel: { fontSize: 11, color: C.dark, fontFamily: "Times-Bold" },
  grandValue: { fontSize: 16, color: C.teal, fontFamily: "Times-Bold" },

  noItems: { fontSize: 10, color: C.text3, fontStyle: "italic", textAlign: "center" as const, padding: 24 },
});

type ExpenseLine = {
  id: string;
  date: string;
  category: string;
  supplier: string;
  description: string;
  total: number;
  currency: string;
  totalUSD: number;
};

function RentalFolioDoc({
  rental, propertyName, propertyOwner, groups, subtotalUSD, iva, grandUSD,
}: {
  rental: any;
  propertyName: string;
  propertyOwner: string;
  groups: { name: string; items: ExpenseLine[] }[];
  subtotalUSD: number;
  iva: number;
  grandUSD: number;
}) {
  const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const folioId = rental.folioId || `FOL-${rental.autoId || ""}`;
  const fx = rental.exchangeRate || 0;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <PdfHeader title="Folio" subtitle={propertyName || undefined} />

        {/* Info strip: guest + stay */}
        <View style={local.infoStrip}>
          <View style={local.infoBlock}>
            <Text style={local.infoLabel}>Guest</Text>
            <Text style={local.infoValue}>{rental.guestName || "Guest"}</Text>
            {propertyOwner && <Text style={local.infoSub}>Property of {propertyOwner}</Text>}
          </View>
          <View style={[local.infoBlock, local.infoBlockRight]}>
            <Text style={local.infoLabel}>Stay</Text>
            <Text style={{ fontSize: 10, color: C.text }}>{fmtDate(rental.arrivalDate)} {"\u2014"} {fmtDate(rental.departureDate)}</Text>
            {fx > 0 && <Text style={local.infoSub}>FX: {fx} MXN/USD</Text>}
          </View>
        </View>

        {/* Folio heading */}
        <View style={local.folioHeader}>
          <View>
            <Text style={local.folioSubtitle}>Cape Property Management</Text>
            <Text style={local.folioTitle}>Folio Statement</Text>
          </View>
          <View style={{ alignItems: "flex-end" as const }}>
            <Text style={local.folioSubtitle}>Folio</Text>
            <Text style={local.folioId}>{folioId}</Text>
          </View>
        </View>

        {/* Table header */}
        <View style={local.tableHeaderRow}>
          <Text style={[local.th, local.thDesc]}>Description</Text>
          <Text style={[local.th, local.thCur]}>Currency</Text>
          <Text style={[local.th, local.thOrig]}>Original</Text>
          <Text style={[local.th, local.thTotal]}>USD Total</Text>
        </View>

        {/* Groups */}
        {groups.length === 0 && <Text style={local.noItems}>No expenses on this folio.</Text>}
        {groups.map(g => (
          <View key={g.name} wrap={false}>
            <Text style={local.sectionHeading}>{g.name}</Text>
            {g.items.map(item => (
              <View key={item.id} style={local.row}>
                <View style={local.rowDesc}>
                  <Text style={local.rowDescText}>{item.description || item.category || "—"}</Text>
                  <Text style={local.rowMeta}>
                    {[item.date, item.category].filter(Boolean).join(" \u00B7 ")}
                  </Text>
                </View>
                <Text style={local.rowCur}>{item.currency}</Text>
                <Text style={local.rowOrig}>{item.total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                <Text style={local.rowTotal}>{usd(item.totalUSD)}</Text>
              </View>
            ))}
          </View>
        ))}

        {/* Totals */}
        {groups.length > 0 && (
          <View style={local.totalsBox}>
            <View style={local.totalsInner}>
              <View style={local.totalLine}>
                <Text style={local.totalLabel}>Subtotal (w/o TAX)</Text>
                <Text style={local.totalValue}>{usd(subtotalUSD)}</Text>
              </View>
              <View style={local.totalLine}>
                <Text style={local.totalLabel}>Tax (IVA 16%)</Text>
                <Text style={local.totalValue}>{usd(iva)}</Text>
              </View>
              <View style={local.grandLine}>
                <Text style={local.grandLabel}>Grand Total</Text>
                <Text style={local.grandValue}>{usd(grandUSD)} USD</Text>
              </View>
            </View>
          </View>
        )}

        <PdfFooter />
      </Page>
    </Document>
  );
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rentalId = searchParams.get("rentalId");
    if (!rentalId) return NextResponse.json({ error: "Missing rentalId" }, { status: 400 });

    // Fetch rental
    const rentalRec = await airtableFetch(`${RENTALS_TABLE}/${rentalId}`);
    const f = rentalRec.fields;
    const rental = {
      guestName: f["Guest Name"] || "",
      folioId: f["Folio Id"] || "",
      arrivalDate: f["Arrival Date"] || "",
      departureDate: f["Departure Date"] || "",
      status: typeof f["Status"] === "string" ? f["Status"] : f["Status"]?.name || "",
      exchangeRate: f["Exchange Rate"] || 0,
      autoId: f["AutoID"] || 0,
    };
    const propertyIds: string[] = f["Rented Home"] || [];
    const expenseIds: string[] = f["Expenses"] || [];

    // Fetch property
    let propertyName = "";
    let propertyOwner = "";
    if (propertyIds[0]) {
      try {
        const p = await airtableFetch(`${PROPERTIES_TABLE}/${propertyIds[0]}?fields%5B%5D=House+Name&fields%5B%5D=Owner`);
        propertyName = p.fields["House Name"] || "";
        propertyOwner = p.fields["Owner"] || "";
      } catch { /* non-critical */ }
    }

    // Fetch expenses
    const fx = rental.exchangeRate || 17;
    const toUSD = (total: number, currency: string, fallbackUSD: number) => {
      if (currency === "USD") return total;
      if (fallbackUSD) return fallbackUSD;
      return fx > 0 ? total / fx : 0;
    };

    const lines: ExpenseLine[] = [];
    if (expenseIds.length) {
      const allExp = await fetchAllExpenses();
      const idSet = new Set(expenseIds);
      for (const r of allExp) {
        if (!idSet.has(r.id)) continue;
        const ef = r.fields;
        const total = ef["Total"] || 0;
        const currency = typeof ef["Currency"] === "string" ? ef["Currency"] : ef["Currency"]?.name || "USD";
        const totalUSD = toUSD(total, currency, ef["Total Amount (USD)"] || 0);
        lines.push({
          id: r.id,
          date: ef["Date"] || "",
          category: ef["Expense Category"] || "",
          supplier: ef["Supplier"] || "",
          description: ef["Description"] || "",
          total,
          currency,
          totalUSD,
        });
      }
      lines.sort((a, b) => a.date.localeCompare(b.date));
    }

    // Group by supplier (serves as guest section in reference folio)
    const groupMap: Record<string, ExpenseLine[]> = {};
    for (const l of lines) {
      const k = l.supplier || "Other";
      if (!groupMap[k]) groupMap[k] = [];
      groupMap[k].push(l);
    }
    const groups = Object.entries(groupMap).map(([name, items]) => ({ name, items }));

    const subtotalUSD = lines.reduce((s, l) => s + l.totalUSD, 0);
    const iva = subtotalUSD * 0.16;
    const grandUSD = subtotalUSD + iva;

    const buffer = await renderToBuffer(
      <RentalFolioDoc
        rental={rental}
        propertyName={propertyName}
        propertyOwner={propertyOwner}
        groups={groups}
        subtotalUSD={subtotalUSD}
        iva={iva}
        grandUSD={grandUSD}
      />
    );

    const filename = `folio-${(rental.folioId || rental.guestName || rentalId).replace(/[^a-zA-Z0-9-_ ]/g, "").replace(/\s+/g, "-")}.pdf`;

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("PDF rental-folio error:", error);
    return NextResponse.json({ error: "Failed to generate folio PDF", detail: String(error) }, { status: 500 });
  }
}
