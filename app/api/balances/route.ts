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
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Airtable ${res.status}`);
  return res.json();
}

export async function GET() {
  try {
    // Fetch properties for name resolution
    const propParams = new URLSearchParams();
    propParams.append("fields[]", "House Name");
    propParams.append("fields[]", "Owner");
    propParams.append("fields[]", "Preferred Currency");
    propParams.append("fields[]", "Status");
    propParams.set("pageSize", "50");
    const propData = await airtableGet(PROPERTIES_TABLE, propParams);

    const propMap = new Map<string, { name: string; owner: string; currency: string; status: string }>();
    for (const rec of propData.records) {
      propMap.set(rec.id, {
        name: rec.fields["House Name"] || "",
        owner: rec.fields["Owner"] || "",
        currency: rec.fields["Preferred Currency"]?.name || rec.fields["Preferred Currency"] || "",
        status: rec.fields["Status"]?.name || rec.fields["Status"] || "",
      });
    }

    // Fetch monthly reports
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
    const repData = await airtableGet(REPORTS_TABLE, repParams);

    // Process all reports, keeping only the latest month per property
    const reportsByProperty = new Map<string, any>();

    // Determine current month for report status counting
    const now = new Date();
    const currentMonthStr = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    let pendingCount = 0;
    let reviewedCount = 0;
    let sentCount = 0;

    for (const record of repData.records) {
      const monthYear = record.fields["Month and Year"] || "";
      const status = record.fields["Status"]?.name || record.fields["Status"] || "";

      // Count current month report statuses
      if (monthYear === currentMonthStr) {
        if (status === "Pending") pendingCount++;
        else if (status === "Reviewed") reviewedCount++;
        else if (status === "Sent") sentCount++;
      }

      // Get house info
      const houseField = record.fields["House Name"];
      let houseId = "";
      let houseName = "";
      if (Array.isArray(houseField) && houseField.length > 0) {
        const first = houseField[0];
        houseId = typeof first === "string" ? first : first?.id || "";
        const prop = propMap.get(houseId);
        if (prop) houseName = prop.name;
        else houseName = first?.name || houseId;
      }
      if (!houseId) continue;

      // Compare with existing record for this property - keep the latest month
      const sortKey = monthToSortKey(monthYear);
      const existing = reportsByProperty.get(houseId);
      if (existing && existing.sortKey >= sortKey) continue;

      // Determine currency
      const prefRaw = record.fields["Preferred Currency"];
      let currency = "USD";
      if (prefRaw) {
        if (Array.isArray(prefRaw)) {
          const f = prefRaw[0];
          currency = typeof f === "string" ? f : f?.name || "USD";
        } else if (typeof prefRaw === "object" && prefRaw.name) {
          currency = prefRaw.name;
        } else {
          currency = String(prefRaw);
        }
      }

      // Pick correct balance and expenses based on currency
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
    // Remove the sortKey before sending to client
    balances.forEach((b: any) => delete b.sortKey);
    // Sort: negative balances first, then ascending
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