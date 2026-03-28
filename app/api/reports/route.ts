import { NextResponse } from "next/server";

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;
const REPORTS_TABLE = "tblBei4KzIMDMT87X";
const PROPERTIES_TABLE = "tblCTRtMtVNv0F63W";

async function airtableGet(tableId: string, params: URLSearchParams) {
  const url = `https://api.airtable.com/v0/${BASE_ID}/${tableId}?${params}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Airtable ${res.status}`);
  return res.json();
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") || new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

    // Fetch properties for name resolution
    const propParams = new URLSearchParams();
    propParams.append("fields[]", "House Name");
    propParams.append("fields[]", "Owner");
    propParams.append("fields[]", "Preferred Currency");
    propParams.set("pageSize", "50");
    const propData = await airtableGet(PROPERTIES_TABLE, propParams);

    const propMap = new Map<string, { name: string; owner: string; currency: string }>();
    for (const rec of propData.records) {
      propMap.set(rec.id, {
        name: rec.fields["House Name"] || "",
        owner: rec.fields["Owner"] || "",
        currency: rec.fields["Preferred Currency"]?.name || rec.fields["Preferred Currency"] || "",
      });
    }

    // Fetch reports for the specified month
    const repParams = new URLSearchParams();
    repParams.append("fields[]", "Report Name");
    repParams.append("fields[]", "House Name");
    repParams.append("fields[]", "Month and Year");
    repParams.append("fields[]", "Status");
    repParams.append("fields[]", "Monthly Charge Status");
    repParams.append("fields[]", "Preferred Currency");
    repParams.append("fields[]", "Starting Balance");
    repParams.append("fields[]", "Total Deposits");
    repParams.append("fields[]", "Total Expenses MXN");
    repParams.append("fields[]", "Total Expenses USD");
    repParams.append("fields[]", "Final Balance MXN");
    repParams.append("fields[]", "Final Balance USD");
    repParams.append("fields[]", "Owner");
    repParams.set("pageSize", "100");
    repParams.set("filterByFormula", `{Month and Year}="${month}"`);
    const repData = await airtableGet(REPORTS_TABLE, repParams);

    const reports = repData.records.map((record: any) => {
      const houseField = record.fields["House Name"];
      let houseName = "";
      let houseId = "";
      let ownerFromProp = "";
      let currencyFromProp = "";

      if (Array.isArray(houseField) && houseField.length > 0) {
        const first = houseField[0];
        const linkedId = typeof first === "string" ? first : first?.id || "";
        houseId = linkedId;
        const prop = propMap.get(linkedId);
        if (prop) {
          houseName = prop.name;
          ownerFromProp = prop.owner;
          currencyFromProp = prop.currency;
        } else {
          houseName = first?.name || linkedId;
        }
      }

      // Owner from lookup
      const ownerField = record.fields["Owner"];
      let owner = ownerFromProp;
      if (!owner && ownerField) {
        if (typeof ownerField === "string") owner = ownerField;
        else if (Array.isArray(ownerField)) owner = ownerField[0] || "";
      }

      // Currency
      const prefRaw = record.fields["Preferred Currency"];
      let currency = currencyFromProp || "USD";
      if (!currencyFromProp && prefRaw) {
        if (Array.isArray(prefRaw)) {
          const f = prefRaw[0];
          currency = typeof f === "string" ? f : f?.name || "USD";
        }
      }

      // Pick correct values based on currency
      const balUSD = record.fields["Final Balance USD"];
      const balMXN = record.fields["Final Balance MXN"];
      let finalBalance = currency === "USD"
        ? (typeof balUSD === "number" ? balUSD : 0)
        : (typeof balMXN === "number" ? balMXN : 0);
      if (!isFinite(finalBalance)) finalBalance = 0;

      const expUSD = record.fields["Total Expenses USD"];
      const expMXN = record.fields["Total Expenses MXN"];
      let totalExpenses = currency === "USD"
        ? (typeof expUSD === "number" ? expUSD : 0)
        : (typeof expMXN === "number" ? expMXN : 0);
      if (!isFinite(totalExpenses)) totalExpenses = 0;

      let startingBalance = record.fields["Starting Balance"] || 0;
      if (!isFinite(startingBalance)) startingBalance = 0;

      let totalDeposits = typeof record.fields["Total Deposits"] === "number" ? record.fields["Total Deposits"] : 0;
      if (!isFinite(totalDeposits)) totalDeposits = 0;

      return {
        id: record.id,
        reportName: record.fields["Report Name"] || "",
        house: houseName,
        houseId,
        owner: typeof owner === "string" ? owner : "",
        month: record.fields["Month and Year"] || "",
        status: record.fields["Status"]?.name || record.fields["Status"] || "",
        chargeStatus: record.fields["Monthly Charge Status"]?.name || record.fields["Monthly Charge Status"] || "",
        currency,
        startingBalance,
        totalExpenses,
        totalDeposits,
        finalBalance,
      };
    });

    // Sort: Pending first, then Reviewed, then Sent
    const statusOrder: Record<string, number> = { Pending: 0, Reviewed: 1, Sent: 2 };
    reports.sort((a: any, b: any) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9));

    // Counts
    const counts = { pending: 0, reviewed: 0, sent: 0, total: reports.length };
    for (const r of reports) {
      if (r.status === "Pending") counts.pending++;
      else if (r.status === "Reviewed") counts.reviewed++;
      else if (r.status === "Sent") counts.sent++;
    }

    return NextResponse.json({ reports, counts, month });
  } catch (error) {
    console.error("Reports error:", error);
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { action, recordIds } = body;

    if (!action || !recordIds || !Array.isArray(recordIds) || recordIds.length === 0) {
      return NextResponse.json({ error: "Missing action or recordIds" }, { status: 400 });
    }

    let fieldUpdate: Record<string, string> = {};

    switch (action) {
      case "markReviewed":
        fieldUpdate = { "Status": "Reviewed" };
        break;
      case "markSent":
        fieldUpdate = { "Status": "Sent" };
        break;
      case "markPending":
        fieldUpdate = { "Status": "Pending" };
        break;
      case "generateCharges":
        fieldUpdate = { "Monthly Charge Status": "Ready to Run" };
        break;
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Airtable allows max 10 records per request, batch if needed
    const batches = [];
    for (let i = 0; i < recordIds.length; i += 10) {
      batches.push(recordIds.slice(i, i + 10));
    }

    for (const batch of batches) {
      const res = await fetch(
        `https://api.airtable.com/v0/${BASE_ID}/${REPORTS_TABLE}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${AIRTABLE_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            records: batch.map((id: string) => ({
              id,
              fields: fieldUpdate,
            })),
          }),
        }
      );

      if (!res.ok) {
        const errData = await res.json();
        console.error("Airtable update error:", errData);
        return NextResponse.json({ error: "Failed to update reports" }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, updated: recordIds.length });
  } catch (error) {
    console.error("Reports update error:", error);
    return NextResponse.json({ error: "Failed to update reports" }, { status: 500 });
  }
}