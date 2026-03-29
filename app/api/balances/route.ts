import { NextResponse } from "next/server";

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;
const REPORTS_TABLE = "tblBei4KzIMDMT87X";
const PROPERTIES_TABLE = "tblCTRtMtVNv0F63W";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function monthToSortKey(monthYear: string): number {
  const parts = monthYear.split(" ");
  if (parts.length < 2) return 0;
  const monthIdx = MONTH_NAMES.indexOf(parts[0]);
  const year = parseInt(parts[1]) || 0;
  return year * 12 + monthIdx;
}

async function airtableGet(tableId: string, params: URLSearchParams) {
  const url = `https://api.airtable.com/v0/${BASE_ID}/${tableId}?${params}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }, cache: "no-store" });
  if (!res.ok) throw new Error(`Airtable ${res.status}`);
  return res.json();
}

async function fetchAllRecords(tableId: string, params: URLSearchParams) {
  const allRecords: any[] = [];
  let offset: string | undefined;

  do {
    const p = new URLSearchParams(params);
    if (offset) p.set("offset", offset);
    const data = await airtableGet(tableId, p);
    allRecords.push(...data.records);
    offset = data.offset;
  } while (offset);

  return allRecords;
}

export async function GET() {
  try {
    // Fetch properties
    const propParams = new URLSearchParams();
    propParams.append("fields[]", "House Name");
    propParams.append("fields[]", "Owner");
    propParams.append("fields[]", "Preferred Currency");
    propParams.append("fields[]", "Status");
    propParams.set("pageSize", "100");
    const propData = await airtableGet(PROPERTIES_TABLE, propParams);

    const propMap = new Map<string, { name: string; owner: string; currency: string; status: string }>();
    for (const rec of propData.records) {
      propMap.set(rec.id, {
        name: rec.fields["House Name"] || "",
        owner: rec.fields["Owner"] || "",
        currency: typeof rec.fields["Preferred Currency"] === "string" ? rec.fields["Preferred Currency"] : rec.fields["Preferred Currency"]?.name || "",
        status: typeof rec.fields["Status"] === "string" ? rec.fields["Status"] : rec.fields["Status"]?.name || "",
      });
    }

    // Fetch ALL monthly reports with pagination
    const repParams = new URLSearchParams();
    repParams.append("fields[]", "Report Name");
    repParams.append("fields[]", "House Name");
    repParams.append("fields[]", "Month and Year");
    repParams.append("fields[]", "Status");
    repParams.append("fields[]", "Preferred Currency");
    repParams.append("fields[]", "Starting Balance");
    repParams.append("fields[]", "Total Deposits");
    repParams.append("fields[]", "Total Expenses MXN");
    repParams.append("fields[]", "Total Expenses USD");
    repParams.append("fields[]", "Final Balance MXN");
    repParams.append("fields[]", "Final Balance USD");
    repParams.set("pageSize", "100");

    const allReports = await fetchAllRecords(REPORTS_TABLE, repParams);

    // Count current month report statuses
    const now = new Date();
    const currentMonthStr = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    let pendingCount = 0, reviewedCount = 0, sentCount = 0;

    // Process all reports, keeping only the latest month per property
    const reportsByProperty = new Map<string, any>();

    for (const record of allReports) {
      const monthYear = record.fields["Month and Year"] || "";
      const statusRaw = record.fields["Status"];
      const status = typeof statusRaw === "string" ? statusRaw : statusRaw?.name || "";

      if (monthYear === currentMonthStr) {
        if (status === "Pending") pendingCount++;
        else if (status === "Reviewed") reviewedCount++;
        else if (status === "Sent") sentCount++;
      }

      const houseField = record.fields["House Name"];
      let houseId = "", houseName = "";
      if (Array.isArray(houseField) && houseField.length > 0) {
        const first = houseField[0];
        houseId = typeof first === "string" ? first : first?.id || "";
        const prop = propMap.get(houseId);
        if (prop) houseName = prop.name;
        else houseName = first?.name || houseId;
      }
      if (!houseId) continue;

      const sortKey = monthToSortKey(monthYear);
      const existing = reportsByProperty.get(houseId);
      if (existing && existing.sortKey >= sortKey) continue;

      const prop = propMap.get(houseId);
      const currency = prop?.currency || "USD";
      const isUSD = currency === "USD";

      let finalBalance = isUSD
        ? (typeof record.fields["Final Balance USD"] === "number" ? record.fields["Final Balance USD"] : 0)
        : (typeof record.fields["Final Balance MXN"] === "number" ? record.fields["Final Balance MXN"] : 0);
      if (!isFinite(finalBalance)) finalBalance = 0;

      let totalExpenses = isUSD
        ? (typeof record.fields["Total Expenses USD"] === "number" ? record.fields["Total Expenses USD"] : 0)
        : (typeof record.fields["Total Expenses MXN"] === "number" ? record.fields["Total Expenses MXN"] : 0);
      if (!isFinite(totalExpenses)) totalExpenses = 0;

      let startingBalance = record.fields["Starting Balance"] || 0;
      if (!isFinite(startingBalance)) startingBalance = 0;

      let totalDeposits = typeof record.fields["Total Deposits"] === "number" ? record.fields["Total Deposits"] : 0;
      if (!isFinite(totalDeposits)) totalDeposits = 0;

      reportsByProperty.set(houseId, {
        house: houseName,
        houseId,
        month: monthYear,
        status,
        currency,
        startingBalance,
        totalDeposits,
        totalExpenses,
        finalBalance,
        sortKey,
      });
    }

    const balances = Array.from(reportsByProperty.values());
    balances.forEach((b: any) => delete b.sortKey);
    balances.sort((a: any, b: any) => a.finalBalance - b.finalBalance);

    return NextResponse.json({
      balances,
      reportStatus: {
        pending: pendingCount,
        reviewed: reviewedCount,
        sent: sentCount,
        total: pendingCount + reviewedCount + sentCount,
        month: currentMonthStr,
      },
    });
  } catch (error) {
    console.error("Balances error:", error);
    return NextResponse.json({ error: "Failed to fetch balances" }, { status: 500 });
  }
}