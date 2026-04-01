import { NextResponse } from "next/server";

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;
const ITINERARY_TABLE = "tblppsIgEI1hrM3wR";
const VENDORS_TABLE = "tblqm6eBgSSYcGcyl";

async function airtableFetch(path: string, options?: RequestInit) {
  const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${AIRTABLE_TOKEN}`,
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Airtable ${res.status}`);
  }
  return res.json();
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const visitId = searchParams.get("visitId");

    const params = new URLSearchParams();
    params.append("fields[]", "Event Name");
    params.append("fields[]", "Visit");
    params.append("fields[]", "Vendor");
    params.append("fields[]", "Date");
    params.append("fields[]", "Time");
    params.append("fields[]", "Details");
    params.append("fields[]", "Status");
    params.append("fields[]", "Event Type");
    params.append("fields[]", "Extra Details");
    params.append("fields[]", "Show Vendor");
    params.append("fields[]", "Chargeable");
    params.append("fields[]", "Estimated Cost");
    params.append("fields[]", "Expense Created");
    params.set("sort[0][field]", "Date");
    params.set("sort[0][direction]", "asc");
    params.set("sort[1][field]", "Time");
    params.set("sort[1][direction]", "asc");

    // Note: filterByFormula on linked record fields returns primary field values (names), not IDs.
    // We fetch all events and filter client-side by visitId instead.

    const [data, vendorData] = await Promise.all([
      airtableFetch(`${ITINERARY_TABLE}?${params}`),
      airtableFetch(`${VENDORS_TABLE}?fields[]=Name&pageSize=100`),
    ]);

    const vendorMap: Record<string, string> = {};
    for (const r of vendorData.records) {
      vendorMap[r.id] = r.fields["Name"] || "";
    }

    const events = data.records.map((r: any) => {
      const vendorIds: string[] = r.fields["Vendor"] || [];
      return {
        id: r.id,
        eventName: r.fields["Event Name"] || "",
        visitId: (r.fields["Visit"] || [])[0] || "",
        vendorId: vendorIds[0] || "",
        vendorName: vendorMap[vendorIds[0]] || "",
        date: r.fields["Date"] || "",
        time: r.fields["Time"] || "",
        details: r.fields["Details"] || "",
        status: r.fields["Status"] || "Pending",
        eventType: r.fields["Event Type"] || "",
        extraDetails: (() => { try { return JSON.parse(r.fields["Extra Details"] || "{}"); } catch { return {}; } })(),
        showVendor: r.fields["Show Vendor"] !== undefined ? !!r.fields["Show Vendor"] : true,
        chargeable: !!r.fields["Chargeable"],
        estimatedCost: r.fields["Estimated Cost"] || 0,
        expenseCreated: !!r.fields["Expense Created"],
      };
    });

    return NextResponse.json({ events });
  } catch (error: any) {
    console.error("Itinerary GET error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch itinerary" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { eventName, visitId, vendorId, date, time, details, status, eventType, extraDetails, showVendor, chargeable, estimatedCost, expenseCreated } = body;

    if (!eventName || !visitId || !date) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const fields: Record<string, any> = {
      "Event Name": eventName,
      "Visit": [visitId],
      "Date": date,
      "Time": time || "",
      "Details": details || "",
      "Status": status || "Pending",
    };
    if (vendorId) fields["Vendor"] = [vendorId];
    if (eventType) fields["Event Type"] = eventType;
    if (extraDetails !== undefined) fields["Extra Details"] = typeof extraDetails === "string" ? extraDetails : JSON.stringify(extraDetails);
    if (showVendor !== undefined) fields["Show Vendor"] = showVendor;
    if (chargeable !== undefined) fields["Chargeable"] = chargeable;
    if (estimatedCost !== undefined) fields["Estimated Cost"] = estimatedCost;
    if (expenseCreated !== undefined) fields["Expense Created"] = expenseCreated;

    const data = await airtableFetch(ITINERARY_TABLE, {
      method: "POST",
      body: JSON.stringify({ fields }),
    });

    return NextResponse.json({ success: true, id: data.id });
  } catch (error: any) {
    console.error("Itinerary POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to create event" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, eventName, vendorId, date, time, details, status, eventType, extraDetails, showVendor, chargeable, estimatedCost, expenseCreated } = body;

    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const fields: Record<string, any> = {};
    if (eventName !== undefined) fields["Event Name"] = eventName;
    if (date !== undefined) fields["Date"] = date;
    if (time !== undefined) fields["Time"] = time;
    if (details !== undefined) fields["Details"] = details;
    if (status !== undefined) fields["Status"] = status;
    if (vendorId !== undefined) fields["Vendor"] = vendorId ? [vendorId] : [];
    if (eventType !== undefined) fields["Event Type"] = eventType;
    if (extraDetails !== undefined) fields["Extra Details"] = typeof extraDetails === "string" ? extraDetails : JSON.stringify(extraDetails);
    if (showVendor !== undefined) fields["Show Vendor"] = showVendor;
    if (chargeable !== undefined) fields["Chargeable"] = chargeable;
    if (estimatedCost !== undefined) fields["Estimated Cost"] = estimatedCost;
    if (expenseCreated !== undefined) fields["Expense Created"] = expenseCreated;

    await airtableFetch(ITINERARY_TABLE, {
      method: "PATCH",
      body: JSON.stringify({ records: [{ id, fields }] }),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Itinerary PATCH error:", error);
    return NextResponse.json({ error: error.message || "Failed to update event" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    await airtableFetch(`${ITINERARY_TABLE}/${id}`, { method: "DELETE" });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Itinerary DELETE error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete event" }, { status: 500 });
  }
}
