import React from "react";
import { NextResponse } from "next/server";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { renderToBuffer } from "@react-pdf/renderer";
import { PdfHeader, PdfFooter, DetailRow, s, C, fmtDate, fmtCurrency } from "../branding";

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;
const ITINERARY_TABLE = process.env.AIRTABLE_TABLE_ITINERARY!;
const VISITS_TABLE = process.env.AIRTABLE_TABLE_VISITS!;
const VENDORS_TABLE = process.env.AIRTABLE_TABLE_VENDORS!;
const PROPERTIES_TABLE = process.env.AIRTABLE_TABLE_PROPERTIES!;

async function airtableGetRecord(tableId: string, recordId: string, fields?: string[]) {
  const params = new URLSearchParams();
  if (fields) fields.forEach(f => params.append("fields[]", f));
  const url = `https://api.airtable.com/v0/${BASE_ID}/${tableId}/${recordId}?${params}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }, cache: "no-store" });
  if (!res.ok) throw new Error(`Airtable ${res.status}`);
  return res.json();
}

const local = StyleSheet.create({
  card: {
    border: `1 solid ${C.border}`,
    borderRadius: 8,
    padding: "24 28",
    marginBottom: 20,
    backgroundColor: C.bgLight,
  },
  eventName: {
    fontSize: 20,
    fontFamily: "Times-Bold",
    color: C.dark,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  eventType: {
    fontSize: 9,
    color: C.teal,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.5,
    textTransform: "uppercase" as const,
    marginBottom: 16,
  },
  divider: { height: 0.5, backgroundColor: C.border, marginVertical: 12 },
  detailsBox: {
    marginTop: 16,
    padding: "14 18",
    backgroundColor: C.white,
    borderRadius: 6,
    border: `0.5 solid ${C.border}`,
  },
  detailsLabel: {
    fontSize: 8,
    color: C.text3,
    letterSpacing: 1.5,
    textTransform: "uppercase" as const,
    marginBottom: 6,
  },
  detailsText: { fontSize: 10, color: C.text, lineHeight: 1.5 },
  costRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    padding: "12 18",
    backgroundColor: C.white,
    borderRadius: 6,
    border: `0.5 solid ${C.border}`,
  },
  costLabel: { fontSize: 9, color: C.text3, letterSpacing: 1 },
  costValue: { fontSize: 16, fontFamily: "Times-Bold", color: C.dark },
});

function EventConfirmationDoc({
  event, visit, vendorName, propertyName,
}: {
  event: any; visit: any; vendorName: string; propertyName: string;
}) {
  const subtitle = propertyName ? `${propertyName}` : undefined;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <PdfHeader title="Event Confirmation" subtitle={subtitle} />

        {/* Guest info strip */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 20 }}>
          <View>
            <Text style={{ fontSize: 8, color: C.text3, letterSpacing: 1.5, textTransform: "uppercase" as const, marginBottom: 3 }}>Guest</Text>
            <Text style={{ fontSize: 12, fontFamily: "Helvetica-Bold", color: C.dark }}>{visit.guestName || "Guest"}</Text>
          </View>
          <View style={{ alignItems: "flex-end" as const }}>
            <Text style={{ fontSize: 8, color: C.text3, letterSpacing: 1.5, textTransform: "uppercase" as const, marginBottom: 3 }}>Stay</Text>
            <Text style={{ fontSize: 10, color: C.text }}>{fmtDate(visit.checkIn)} {"\u2014"} {fmtDate(visit.checkOut)}</Text>
          </View>
        </View>

        {/* Event card */}
        <View style={local.card}>
          <Text style={local.eventType}>{event.eventType || "Event"}</Text>
          <Text style={local.eventName}>{event.eventName}</Text>

          <View style={local.divider} />

          <DetailRow label="Date" value={fmtDate(event.date)} />
          <DetailRow label="Time" value={event.time} />
          {event.showVendor && vendorName && <DetailRow label="Vendor" value={vendorName} />}
          <DetailRow label="Status" value={event.status} />

          {event.details && (
            <View style={local.detailsBox}>
              <Text style={local.detailsLabel}>Details</Text>
              <Text style={local.detailsText}>{event.details}</Text>
            </View>
          )}

          {(event.total > 0 || event.estimatedCost > 0) && (
            <View style={local.costRow}>
              <Text style={local.costLabel}>{event.total > 0 ? "TOTAL" : "ESTIMATED COST"}</Text>
              <Text style={local.costValue}>
                {fmtCurrency(event.total > 0 ? event.total : event.estimatedCost, event.currency || "USD")}
                {event.currency ? ` ${event.currency}` : ""}
              </Text>
            </View>
          )}
        </View>

        <PdfFooter />
      </Page>
    </Document>
  );
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId");
    if (!eventId) return NextResponse.json({ error: "Missing eventId" }, { status: 400 });

    // Fetch event
    const eventRec = await airtableGetRecord(ITINERARY_TABLE, eventId, [
      "Event Name", "Visit", "Vendor", "Date", "Time", "Details", "Status",
      "Event Type", "Extra Details", "Show Vendor", "Chargeable",
      "Estimated Cost", "Total", "Currency",
    ]);
    const f = eventRec.fields;
    const event = {
      eventName: f["Event Name"] || "",
      visitId: (f["Visit"] || [])[0] || "",
      vendorId: (f["Vendor"] || [])[0] || "",
      date: f["Date"] || "",
      time: f["Time"] || "",
      details: f["Details"] || "",
      status: f["Status"] || "Pending",
      eventType: f["Event Type"] || "",
      showVendor: f["Show Vendor"] !== undefined ? !!f["Show Vendor"] : true,
      chargeable: !!f["Chargeable"],
      estimatedCost: f["Estimated Cost"] || 0,
      total: f["Total"] || 0,
      currency: typeof f["Currency"] === "string" ? f["Currency"] : f["Currency"]?.name || "",
    };

    // Fetch visit + vendor in parallel
    const [visitRec, vendorRec] = await Promise.all([
      event.visitId
        ? airtableGetRecord(VISITS_TABLE, event.visitId, ["Guest Name", "Check-in Date", "Check-out Date", "Property", "Visit Type"])
        : Promise.resolve({ fields: {} }),
      event.vendorId
        ? airtableGetRecord(VENDORS_TABLE, event.vendorId, ["Name"])
        : Promise.resolve({ fields: {} }),
    ]);

    const visit = {
      guestName: visitRec.fields["Guest Name"] || "",
      checkIn: visitRec.fields["Check-in Date"] || "",
      checkOut: visitRec.fields["Check-out Date"] || "",
      propertyId: (visitRec.fields["Property"] || [])[0] || "",
    };
    const vendorName = vendorRec.fields["Name"] || "";

    // Resolve property name
    let propertyName = "";
    if (visit.propertyId) {
      try {
        const propRec = await airtableGetRecord(PROPERTIES_TABLE, visit.propertyId, ["House Name"]);
        propertyName = propRec.fields["House Name"] || "";
      } catch { /* non-critical */ }
    }

    // Render PDF
    const buffer = await renderToBuffer(
      <EventConfirmationDoc event={event} visit={visit} vendorName={vendorName} propertyName={propertyName} />
    );

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="event-confirmation-${eventId}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF event-confirmation error:", error);
    return NextResponse.json({ error: "Failed to generate PDF", detail: String(error) }, { status: 500 });
  }
}
