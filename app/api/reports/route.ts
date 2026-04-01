import { NextResponse } from "next/server";

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;
const REPORTS_TABLE = "tblBei4KzIMDMT87X";
const PROPERTIES_TABLE = "tblCTRtMtVNv0F63W";

async function airtableGet(tableId: string, params: URLSearchParams) {
  const url = `https://api.airtable.com/v0/${BASE_ID}/${tableId}?${params}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }, cache: "no-store" });
  if (!res.ok) throw new Error(`Airtable ${res.status}`);
  return res.json();
}

function safeNum(val: any): number {
  if (typeof val === "number" && isFinite(val)) return val;
  return 0;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") || new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

    // Fetch properties
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

    // Fetch reports with all category fields
    const repParams = new URLSearchParams();
    const fields = [
      "Report Name", "House Name", "Month and Year", "Status", "Monthly Charge Status",
      "Preferred Currency", "Starting Balance", "Total Deposits",
      "Total Expenses MXN", "Total Expenses USD",
      "Final Balance MXN", "Final Balance USD",
      "Owner", "Monthly Exchange Rate",
      "Total Cleaning Supplies MXN", "Total Cleaning Supplies USD",
      "Total Groceries MXN", "Total Groceries USD",
      "Total Maintenance MXN", "Total Maintenance USD",
      "Total Miscellaneous MXN", "Total Miscellaneous USD",
      "Total Utilities MXN", "Total Utilities USD",
      "Total Villa Staff MXN", "Total Villa Staff USD",
    ];
    fields.forEach(f => repParams.append("fields[]", f));
    repParams.set("pageSize", "100");
    repParams.set("filterByFormula", `{Month and Year}="${month}"`);
    const repData = await airtableGet(REPORTS_TABLE, repParams);

    const reports = repData.records.map((record: any) => {
      const houseField = record.fields["House Name"];
      let houseName = "", houseId = "", ownerFromProp = "", currencyFromProp = "";
      if (Array.isArray(houseField) && houseField.length > 0) {
        const first = houseField[0];
        const linkedId = typeof first === "string" ? first : first?.id || "";
        houseId = linkedId;
        const prop = propMap.get(linkedId);
        if (prop) { houseName = prop.name; ownerFromProp = prop.owner; currencyFromProp = prop.currency; }
        else houseName = first?.name || linkedId;
      }

      const ownerField = record.fields["Owner"];
      let owner = ownerFromProp;
      if (!owner && ownerField) {
        if (typeof ownerField === "string") owner = ownerField;
        else if (Array.isArray(ownerField)) owner = ownerField[0] || "";
      }

      const prefRaw = record.fields["Preferred Currency"];
      let currency = currencyFromProp || "USD";
      if (!currencyFromProp && prefRaw) {
        if (Array.isArray(prefRaw)) { const f = prefRaw[0]; currency = typeof f === "string" ? f : f?.name || "USD"; }
      }

      const isUSD = currency === "USD";

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
        exchangeRate: safeNum(record.fields["Monthly Exchange Rate"]),
        startingBalance: safeNum(record.fields["Starting Balance"]),
        totalExpenses: safeNum(isUSD ? record.fields["Total Expenses USD"] : record.fields["Total Expenses MXN"]),
        totalDeposits: safeNum(record.fields["Total Deposits"]),
        finalBalance: safeNum(isUSD ? record.fields["Final Balance USD"] : record.fields["Final Balance MXN"]),
        categories: {
          cleaningSupplies: safeNum(isUSD ? record.fields["Total Cleaning Supplies USD"] : record.fields["Total Cleaning Supplies MXN"]),
          groceries: safeNum(isUSD ? record.fields["Total Groceries USD"] : record.fields["Total Groceries MXN"]),
          maintenance: safeNum(isUSD ? record.fields["Total Maintenance USD"] : record.fields["Total Maintenance MXN"]),
          miscellaneous: safeNum(isUSD ? record.fields["Total Miscellaneous USD"] : record.fields["Total Miscellaneous MXN"]),
          utilities: safeNum(isUSD ? record.fields["Total Utilities USD"] : record.fields["Total Utilities MXN"]),
          villaStaff: safeNum(isUSD ? record.fields["Total Villa Staff USD"] : record.fields["Total Villa Staff MXN"]),
        },
      };
    });

    const statusOrder: Record<string, number> = { Pending: 0, Reviewed: 1, Sent: 2 };
    reports.sort((a: any, b: any) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9));

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
    const { action, recordIds, exchangeRate, recordId } = body;

    // Handle refresh starting balance from previous month
    if (action === "refreshBalance" && recordId && body.month) {
      // Parse current month string like "March 2026" to find previous month
      const [monthName, yearStr] = body.month.split(" ");
      const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
      const monthIdx = monthNames.indexOf(monthName);
      if (monthIdx === -1) return NextResponse.json({ error: "Invalid month" }, { status: 400 });
      const prevDate = new Date(parseInt(yearStr), monthIdx - 1, 1);
      const prevMonthStr = `${monthNames[prevDate.getMonth()]} ${prevDate.getFullYear()}`;

      // Get the current report to find its property
      const curParams = new URLSearchParams();
      curParams.append("fields[]", "House Name");
      curParams.set("pageSize", "1");
      curParams.set("filterByFormula", `RECORD_ID()="${recordId}"`);
      const curData = await airtableGet(REPORTS_TABLE, curParams);
      if (!curData.records || curData.records.length === 0) return NextResponse.json({ error: "Report not found" }, { status: 404 });
      const houseField = curData.records[0].fields["House Name"];
      const houseId = Array.isArray(houseField) ? (typeof houseField[0] === "string" ? houseField[0] : houseField[0]?.id || "") : "";
      if (!houseId) return NextResponse.json({ error: "No property linked" }, { status: 400 });

      // Find previous month's report for the same property
      const prevParams = new URLSearchParams();
      prevParams.append("fields[]", "Final Balance MXN");
      prevParams.append("fields[]", "Final Balance USD");
      prevParams.append("fields[]", "House Name");
      prevParams.append("fields[]", "Preferred Currency");
      prevParams.set("pageSize", "100");
      prevParams.set("filterByFormula", `{Month and Year}="${prevMonthStr}"`);
      const prevData = await airtableGet(REPORTS_TABLE, prevParams);
      const prevReport = prevData.records.find((r: any) => {
        const h = r.fields["House Name"];
        const linkedId = Array.isArray(h) ? (typeof h[0] === "string" ? h[0] : h[0]?.id || "") : "";
        return linkedId === houseId;
      });

      if (!prevReport) return NextResponse.json({ error: `No report found for ${prevMonthStr}` }, { status: 404 });

      // Determine currency to pick correct final balance
      const prefRaw = prevReport.fields["Preferred Currency"];
      let prevCurrency = "MXN";
      if (prefRaw) {
        if (Array.isArray(prefRaw)) { const f = prefRaw[0]; prevCurrency = typeof f === "string" ? f : f?.name || "MXN"; }
        else if (typeof prefRaw === "string") prevCurrency = prefRaw;
        else if (prefRaw.name) prevCurrency = prefRaw.name;
      }
      // Also check via property lookup
      const propParams2 = new URLSearchParams();
      propParams2.append("fields[]", "Preferred Currency");
      propParams2.set("pageSize", "1");
      propParams2.set("filterByFormula", `RECORD_ID()="${houseId}"`);
      const propData2 = await airtableGet(PROPERTIES_TABLE, propParams2);
      if (propData2.records && propData2.records.length > 0) {
        const pc = propData2.records[0].fields["Preferred Currency"];
        if (pc) prevCurrency = typeof pc === "string" ? pc : pc?.name || prevCurrency;
      }

      const prevFinalBalance = safeNum(prevCurrency === "USD" ? prevReport.fields["Final Balance USD"] : prevReport.fields["Final Balance MXN"]);

      // Update current report's Starting Balance
      const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${REPORTS_TABLE}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ records: [{ id: recordId, fields: { "Starting Balance": prevFinalBalance } }] }),
      });
      if (!res.ok) return NextResponse.json({ error: "Failed to update starting balance" }, { status: 500 });
      return NextResponse.json({ success: true, previousMonth: prevMonthStr, startingBalance: prevFinalBalance });
    }

    // Handle exchange rate update (single record)
    if (action === "updateExchangeRate" && recordId && exchangeRate !== undefined) {
      const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${REPORTS_TABLE}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ records: [{ id: recordId, fields: { "Monthly Exchange Rate": parseFloat(exchangeRate) } }] }),
      });
      if (!res.ok) return NextResponse.json({ error: "Failed to update exchange rate" }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    // Handle batch status/charge updates
    if (!action || !recordIds || !Array.isArray(recordIds) || recordIds.length === 0) {
      return NextResponse.json({ error: "Missing action or recordIds" }, { status: 400 });
    }

    let fieldUpdate: Record<string, string> = {};
    switch (action) {
      case "markReviewed": fieldUpdate = { Status: "Reviewed" }; break;
      case "markSent": fieldUpdate = { Status: "Sent" }; break;
      case "markPending": fieldUpdate = { Status: "Pending" }; break;
      case "generateCharges": fieldUpdate = { "Monthly Charge Status": "Ready to Run" }; break;
      default: return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const batches = [];
    for (let i = 0; i < recordIds.length; i += 10) batches.push(recordIds.slice(i, i + 10));

    for (const batch of batches) {
      const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${REPORTS_TABLE}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ records: batch.map((id: string) => ({ id, fields: fieldUpdate })) }),
      });
      if (!res.ok) return NextResponse.json({ error: "Failed to update reports" }, { status: 500 });
    }

    return NextResponse.json({ success: true, updated: recordIds.length });
  } catch (error) {
    console.error("Reports update error:", error);
    return NextResponse.json({ error: "Failed to update reports" }, { status: 500 });
  }
}