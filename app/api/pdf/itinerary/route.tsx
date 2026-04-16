import React from "react";
import { NextResponse } from "next/server";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { renderToBuffer } from "@react-pdf/renderer";
import { PdfHeader, PdfFooter, s, C, fmtDate, fmtCurrency } from "../branding";

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;
const ITINERARY_TABLE = "tblppsIgEI1hrM3wR";
const VISITS_TABLE = "tblJ1iEgHCeJy2CnR";
const VENDORS_TABLE = "tblqm6eBgSSYcGcyl";
const PROPERTIES_TABLE = "tblCTRtMtVNv0F63W";

async function airtableGet(tableId: string, params: URLSearchParams) {
  const url = `https://api.airtable.com/v0/${BASE_ID}/${tableId}?${params}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }, cache: "no-store" });
  if (!res.ok) throw new Error(`Airtable ${res.status}`);
  return res.json();
}

async function airtableGetRecord(tableId: string, recordId: string, fields?: string[]) {
  const params = new URLSearchParams();
  if (fields) fields.forEach(f => params.append("fields[]", f));
  const url = `https://api.airtable.com/v0/${BASE_ID}/${tableId}/${recordId}?${params}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }, cache: "no-store" });
  if (!res.ok) throw new Error(`Airtable ${res.status}`);
  return res.json();
}

const local = StyleSheet.create({
  coverGuest: { fontSize: 22, fontFamily: "Times-Bold", color: C.dark, marginBottom: 4 },
  coverProperty: { fontSize: 13, color: C.teal, fontFamily: "Helvetica-Bold", letterSpacing: 0.5, marginBottom: 2 },
  coverDates: { fontSize: 10, color: C.text2, marginBottom: 24 },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 22,
    marginBottom: 10,
  },
  dayLabel: { fontSize: 12, fontFamily: "Times-Bold", color: C.dark },
  dayDate: { fontSize: 9, color: C.text2 },
  dayRule: { flex: 1, height: 0.5, backgroundColor: C.border },
  eventRow: {
    flexDirection: "row",
    marginBottom: 8,
    padding: "10 14",
    backgroundColor: C.bgLight,
    borderRadius: 6,
    border: `0.5 solid ${C.border}`,
  },
  timeCol: { width: 60, marginRight: 14 },
  timeText: { fontSize: 10, fontFamily: "Helvetica-Bold", color: C.teal },
  eventBody: { flex: 1 },
  eventName: { fontSize: 11, fontFamily: "Helvetica-Bold", color: C.dark, marginBottom: 2 },
  eventType: { fontSize: 7, color: C.text3, letterSpacing: 1, textTransform: "uppercase" as const, marginBottom: 4 },
  eventDetails: { fontSize: 9, color: C.text2, lineHeight: 1.4 },
  vendorText: { fontSize: 8, color: C.teal, marginTop: 3 },
  costText: { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.dark, marginTop: 4 },
  noEvents: { fontSize: 10, color: C.text3, fontStyle: "italic", padding: "6 0" },
});

type EventItem = {
  eventName: string; date: string; time: string; details: string;
  status: string; eventType: string; showVendor: boolean;
  vendorName: string; total: number; estimatedCost: number; currency: string;
};

function ItineraryDoc({
  visit, propertyName, eventsByDate,
}: {
  visit: any; propertyName: string;
  eventsByDate: { date: string; events: EventItem[] }[];
}) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <PdfHeader title="Itinerary" />

        {/* Cover info */}
        <Text style={local.coverProperty}>{propertyName}</Text>
        <Text style={local.coverGuest}>{visit.guestName || "Guest"}</Text>
        <Text style={local.coverDates}>{fmtDate(visit.checkIn)} {"\u2014"} {fmtDate(visit.checkOut)}</Text>

        {/* Day-by-day events */}
        {eventsByDate.map(({ date, events }) => (
          <View key={date} wrap={false}>
            <View style={local.dayHeader}>
              <Text style={local.dayLabel}>{fmtDate(date)}</Text>
              <View style={local.dayRule} />
            </View>
            {events.length === 0 && <Text style={local.noEvents}>No events scheduled</Text>}
            {events.map((ev, i) => (
              <View key={i} style={local.eventRow}>
                <View style={local.timeCol}>
                  <Text style={local.timeText}>{ev.time || "\u2014"}</Text>
                </View>
                <View style={local.eventBody}>
                  {ev.eventType && <Text style={local.eventType}>{ev.eventType}</Text>}
                  <Text style={local.eventName}>{ev.eventName}</Text>
                  {ev.details && <Text style={local.eventDetails}>{ev.details}</Text>}
                  {ev.showVendor && ev.vendorName && <Text style={local.vendorText}>{ev.vendorName}</Text>}
                  {(ev.total > 0 || ev.estimatedCost > 0) && (
                    <Text style={local.costText}>
                      {fmtCurrency(ev.total > 0 ? ev.total : ev.estimatedCost, ev.currency || "USD")} {ev.currency}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        ))}

        {eventsByDate.length === 0 && (
          <Text style={{ fontSize: 12, color: C.text3, textAlign: "center", marginTop: 40 }}>
            No events have been added to this itinerary yet.
          </Text>
        )}

        <PdfFooter />
      </Page>
    </Document>
  );
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const visitId = searchParams.get("visitId");
    if (!visitId) return NextResponse.json({ error: "Missing visitId" }, { status: 400 });

    // Fetch visit
    const visitRec = await airtableGetRecord(VISITS_TABLE, visitId, [
      "Guest Name", "Check-in Date", "Check-out Date", "Property", "Visit Type", "Visit Name",
    ]);
    const visit = {
      guestName: visitRec.fields["Guest Name"] || "",
      checkIn: visitRec.fields["Check-in Date"] || "",
      checkOut: visitRec.fields["Check-out Date"] || "",
      propertyId: (visitRec.fields["Property"] || [])[0] || "",
      visitName: visitRec.fields["Visit Name"] || "",
    };

    // Fetch events + vendors in parallel
    const evtParams = new URLSearchParams();
    ["Event Name", "Visit", "Vendor", "Date", "Time", "Details", "Status",
     "Event Type", "Show Vendor", "Estimated Cost", "Total", "Currency",
    ].forEach(f => evtParams.append("fields[]", f));
    evtParams.set("sort[0][field]", "Date");
    evtParams.set("sort[0][direction]", "asc");
    evtParams.set("sort[1][field]", "Time");
    evtParams.set("sort[1][direction]", "asc");
    evtParams.set("pageSize", "100");

    const [evtData, vendorData] = await Promise.all([
      airtableGet(ITINERARY_TABLE, evtParams),
      airtableGet(VENDORS_TABLE, new URLSearchParams([["fields[]", "Name"], ["pageSize", "100"]])),
    ]);

    const vendorMap: Record<string, string> = {};
    for (const r of vendorData.records) vendorMap[r.id] = r.fields["Name"] || "";

    // Filter events for this visit
    const events: EventItem[] = evtData.records
      .filter((r: any) => {
        const vIds = r.fields["Visit"] || [];
        return vIds.includes(visitId) || vIds[0] === visitId;
      })
      .map((r: any) => ({
        eventName: r.fields["Event Name"] || "",
        date: r.fields["Date"] || "",
        time: r.fields["Time"] || "",
        details: r.fields["Details"] || "",
        status: r.fields["Status"] || "Pending",
        eventType: r.fields["Event Type"] || "",
        showVendor: r.fields["Show Vendor"] !== undefined ? !!r.fields["Show Vendor"] : true,
        vendorName: vendorMap[(r.fields["Vendor"] || [])[0]] || "",
        total: r.fields["Total"] || 0,
        estimatedCost: r.fields["Estimated Cost"] || 0,
        currency: typeof r.fields["Currency"] === "string" ? r.fields["Currency"] : r.fields["Currency"]?.name || "",
      }));

    // Group by date
    const dateMap: Record<string, EventItem[]> = {};
    for (const ev of events) {
      const d = ev.date || "Unscheduled";
      if (!dateMap[d]) dateMap[d] = [];
      dateMap[d].push(ev);
    }
    const eventsByDate = Object.entries(dateMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, evts]) => ({ date, events: evts }));

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
      <ItineraryDoc visit={visit} propertyName={propertyName} eventsByDate={eventsByDate} />
    );

    const filename = `itinerary-${(visit.visitName || visit.guestName || visitId).replace(/[^a-zA-Z0-9-_ ]/g, "").replace(/\s+/g, "-")}.pdf`;

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("PDF itinerary error:", error);
    return NextResponse.json({ error: "Failed to generate PDF", detail: String(error) }, { status: 500 });
  }
}
