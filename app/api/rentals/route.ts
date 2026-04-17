import { NextResponse } from "next/server";
import { getTenant } from "@/lib/getTenant";

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN!;

async function airtableFetch(baseId: string, path: string, options?: RequestInit) {
  const res = await fetch(`https://api.airtable.com/v0/${baseId}/${path}`, {
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

async function fetchAllRecords(baseId: string, table: string, extraParams?: URLSearchParams) {
  const all: any[] = [];
  let offset: string | undefined;
  do {
    const params = new URLSearchParams(extraParams);
    params.set("pageSize", "100");
    if (offset) params.set("offset", offset);
    const data = await airtableFetch(baseId, `${table}?${params}`);
    all.push(...(data.records || []));
    offset = data.offset;
  } while (offset);
  return all;
}

export async function GET(request: Request) {
  try {
    const tenant = await getTenant();
    const { searchParams } = new URL(request.url);
    const rentalId = searchParams.get("rentalId");

    // ---- SINGLE RENTAL (folio detail) ----
    if (rentalId) {
      const rentalRes = await airtableFetch(tenant.baseId, `${tenant.tables.rentals}/${rentalId}`);
      const f = rentalRes.fields;

      const propertyIds: string[] = f["Rented Home"] || [];
      const expenseIds: string[] = f["Expenses"] || [];

      // Property name
      let propertyName = "";
      let propertyOwner = "";
      if (propertyIds[0]) {
        try {
          const p = await airtableFetch(
            tenant.baseId,
            `${tenant.tables.properties}/${propertyIds[0]}?fields%5B%5D=House+Name&fields%5B%5D=Owner`
          );
          propertyName = p.fields["House Name"] || "";
          propertyOwner = p.fields["Owner"] || "";
        } catch { /* non-critical */ }
      }

      // Expenses — fetch ALL so we can map linked ids to full records
      // Filter client-side by expense id since Airtable's filterByFormula on linked is clunky
      const expenses: any[] = [];
      if (expenseIds.length) {
        const expParams = new URLSearchParams();
        ["Receipt No", "Date", "Expense Category", "Supplier", "Total", "Currency",
         "Description", "Receipt URL", "Total Amount (USD)", "House Name", "Guest Rentals",
        ].forEach(name => expParams.append("fields[]", name));
        const allExp = await fetchAllRecords(tenant.baseId, tenant.tables.expenses, expParams);
        const idSet = new Set(expenseIds);
        for (const r of allExp) {
          if (idSet.has(r.id)) {
            expenses.push({
              id: r.id,
              receiptNo: r.fields["Receipt No"] || "",
              date: r.fields["Date"] || "",
              category: r.fields["Expense Category"] || "",
              supplier: r.fields["Supplier"] || "",
              description: r.fields["Description"] || "",
              total: r.fields["Total"] || 0,
              currency: typeof r.fields["Currency"] === "string" ? r.fields["Currency"] : r.fields["Currency"]?.name || "USD",
              totalUSD: r.fields["Total Amount (USD)"] || 0,
              receiptUrl: r.fields["Receipt URL"] || "",
            });
          }
        }
        expenses.sort((a, b) => a.date.localeCompare(b.date));
      }

      const rental = {
        id: rentalRes.id,
        guestName: f["Guest Name"] || "",
        folioId: f["Folio Id"] || "",
        arrivalDate: f["Arrival Date"] || "",
        departureDate: f["Departure Date"] || "",
        status: typeof f["Status"] === "string" ? f["Status"] : f["Status"]?.name || "",
        exchangeRate: f["Exchange Rate"] || 0,
        finalBalance: f["Final Balance"] || 0,
        propertyId: propertyIds[0] || "",
        propertyName,
        propertyOwner,
        autoId: f["AutoID"] || 0,
        expenses,
      };

      return NextResponse.json({ rental });
    }

    // ---- LIST ALL RENTALS ----
    const params = new URLSearchParams();
    ["Guest Name", "Rented Home", "Arrival Date", "Departure Date", "Status",
     "Folio Id", "Exchange Rate", "Final Balance", "Expenses", "AutoID",
    ].forEach(f => params.append("fields[]", f));
    params.set("sort[0][field]", "Arrival Date");
    params.set("sort[0][direction]", "desc");

    const records = await fetchAllRecords(tenant.baseId, tenant.tables.rentals, params);

    // Fetch all property names
    const propData = await airtableFetch(
      tenant.baseId,
      `${tenant.tables.properties}?fields%5B%5D=House+Name&pageSize=100`
    );
    const propMap: Record<string, string> = {};
    for (const r of propData.records) {
      propMap[r.id] = r.fields["House Name"] || "";
    }

    const rentals = records.map(r => {
      const f = r.fields;
      const propertyIds: string[] = f["Rented Home"] || [];
      const expenseIds: string[] = f["Expenses"] || [];
      return {
        id: r.id,
        guestName: f["Guest Name"] || "",
        folioId: f["Folio Id"] || "",
        arrivalDate: f["Arrival Date"] || "",
        departureDate: f["Departure Date"] || "",
        status: typeof f["Status"] === "string" ? f["Status"] : f["Status"]?.name || "",
        exchangeRate: f["Exchange Rate"] || 0,
        finalBalance: f["Final Balance"] || 0,
        propertyId: propertyIds[0] || "",
        propertyName: propMap[propertyIds[0]] || "",
        expenseCount: expenseIds.length,
        autoId: f["AutoID"] || 0,
      };
    });

    return NextResponse.json({ rentals });
  } catch (error: any) {
    console.error("Rentals GET error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch rentals" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const tenant = await getTenant();
    const body = await request.json();
    const { guestName, propertyId, arrivalDate, departureDate, status, exchangeRate } = body;

    if (!guestName || !propertyId || !arrivalDate || !departureDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const fields: Record<string, any> = {
      "Guest Name": guestName,
      "Arrival Date": arrivalDate,
      "Departure Date": departureDate,
      "Status": status || "Reserved",
      "Rented Home": [propertyId],
    };
    if (exchangeRate !== undefined && exchangeRate !== null && exchangeRate !== "") {
      fields["Exchange Rate"] = Number(exchangeRate);
    }

    const data = await airtableFetch(tenant.baseId, tenant.tables.rentals, {
      method: "POST",
      body: JSON.stringify({ fields }),
    });

    return NextResponse.json({ success: true, id: data.id });
  } catch (error: any) {
    console.error("Rentals POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to create rental" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const tenant = await getTenant();
    const body = await request.json();
    const { id, ...fields } = body;

    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const airtableFields: Record<string, any> = {};
    if (fields.guestName !== undefined) airtableFields["Guest Name"] = fields.guestName;
    if (fields.arrivalDate !== undefined) airtableFields["Arrival Date"] = fields.arrivalDate;
    if (fields.departureDate !== undefined) airtableFields["Departure Date"] = fields.departureDate;
    if (fields.status !== undefined) airtableFields["Status"] = fields.status;
    if (fields.exchangeRate !== undefined) airtableFields["Exchange Rate"] = Number(fields.exchangeRate);
    if (fields.propertyId !== undefined) airtableFields["Rented Home"] = fields.propertyId ? [fields.propertyId] : [];

    await airtableFetch(tenant.baseId, tenant.tables.rentals, {
      method: "PATCH",
      body: JSON.stringify({ records: [{ id, fields: airtableFields }] }),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Rentals PATCH error:", error);
    return NextResponse.json({ error: error.message || "Failed to update rental" }, { status: 500 });
  }
}
