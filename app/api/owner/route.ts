import { NextResponse } from "next/server";

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;
const PROPERTIES_TABLE = "tblCTRtMtVNv0F63W";
const REPORTS_TABLE = "tblBei4KzIMDMT87X";
const EXPENSES_TABLE = "tblHeiBjXhsKW9Opj";
const DEPOSITS_TABLE = "tblVrgidgJKKfdFQ2";
const MAINTENANCE_TABLE = "tblC5Muegq8fVfuQf";
const VISITS_TABLE = "tblJ1iEgHCeJy2CnR";
const ITINERARY_TABLE = "tblppsIgEI1hrM3wR";
const VENDORS_TABLE = "tblqm6eBgSSYcGcyl";

function safeNum(val: any): number {
  if (typeof val === "number" && isFinite(val)) return val;
  return 0;
}

function monthToSortKey(monthStr: string): number {
  const months: Record<string, number> = { January: 1, February: 2, March: 3, April: 4, May: 5, June: 6, July: 7, August: 8, September: 9, October: 10, November: 11, December: 12 };
  const parts = monthStr.split(" ");
  if (parts.length < 2) return 0;
  const year = parseInt(parts[1]) || 0;
  const month = months[parts[0]] || 0;
  return year * 100 + month;
}

async function airtableGet(tableId: string, params: URLSearchParams) {
  const url = `https://api.airtable.com/v0/${BASE_ID}/${tableId}?${params}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }, cache: "no-store" });
  if (!res.ok) {
    const err = await res.text();
    console.error(`Airtable error for ${tableId}:`, res.status, err);
    throw new Error(`Airtable ${res.status}`);
  }
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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyName = searchParams.get("property");

    if (!propertyName) {
      return NextResponse.json({ error: "Missing property parameter" }, { status: 400 });
    }

    // 1. Get property details
    const propParams = new URLSearchParams();
    propParams.append("fields[]", "House Name");
    propParams.append("fields[]", "Owner");
    propParams.append("fields[]", "Preferred Currency");
    propParams.append("fields[]", "Status");
    propParams.set("filterByFormula", `{House Name}="${propertyName}"`);
    propParams.set("pageSize", "1");
    const propData = await airtableGet(PROPERTIES_TABLE, propParams);

    if (!propData.records || propData.records.length === 0) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const propRec = propData.records[0];
    const currRaw = propRec.fields["Preferred Currency"];
    const currency = typeof currRaw === "string" ? currRaw : currRaw?.name || "USD";
    const isUSD = currency === "USD";

    // 2. Get ALL monthly reports
    const repParams = new URLSearchParams();
    const repFields = [
      "Report Name", "Month and Year", "Status",
      "Starting Balance", "Total Deposits",
      "Total Expenses MXN", "Total Expenses USD",
      "Final Balance MXN", "Final Balance USD",
      "Total Cleaning Supplies MXN", "Total Cleaning Supplies USD",
      "Total Groceries MXN", "Total Groceries USD",
      "Total Maintenance MXN", "Total Maintenance USD",
      "Total Miscellaneous MXN", "Total Miscellaneous USD",
      "Total Utilities MXN", "Total Utilities USD",
      "Total Villa Staff MXN", "Total Villa Staff USD",
      "Monthly Exchange Rate",
    ];
    repFields.forEach(f => repParams.append("fields[]", f));
    repParams.set("filterByFormula", `FIND("${propertyName}", {Report Name})`);
    repParams.set("pageSize", "100");
    const repData = await airtableGet(REPORTS_TABLE, repParams);

    const allReports = repData.records.map((r: any) => {
      const f = r.fields;
      const status = typeof f["Status"] === "string" ? f["Status"] : f["Status"]?.name || "";
      return {
        id: r.id,
        month: f["Month and Year"] || "",
        status,
        startingBalance: safeNum(f["Starting Balance"]),
        totalExpenses: safeNum(isUSD ? f["Total Expenses USD"] : f["Total Expenses MXN"]),
        totalDeposits: safeNum(f["Total Deposits"]),
        finalBalance: safeNum(isUSD ? f["Final Balance USD"] : f["Final Balance MXN"]),
        exchangeRate: safeNum(f["Monthly Exchange Rate"]),
        categories: {
          cleaningSupplies: safeNum(isUSD ? f["Total Cleaning Supplies USD"] : f["Total Cleaning Supplies MXN"]),
          groceries: safeNum(isUSD ? f["Total Groceries USD"] : f["Total Groceries MXN"]),
          maintenance: safeNum(isUSD ? f["Total Maintenance USD"] : f["Total Maintenance MXN"]),
          miscellaneous: safeNum(isUSD ? f["Total Miscellaneous USD"] : f["Total Miscellaneous MXN"]),
          utilities: safeNum(isUSD ? f["Total Utilities USD"] : f["Total Utilities MXN"]),
          villaStaff: safeNum(isUSD ? f["Total Villa Staff USD"] : f["Total Villa Staff MXN"]),
        },
      };
    });

    const visibleReports = allReports
      .filter((r: any) => r.status === "Sent" || r.status === "Reviewed")
      .sort((a: any, b: any) => monthToSortKey(b.month) - monthToSortKey(a.month));

    // 3. Get ALL expenses for this property (paginated)
    const expParams = new URLSearchParams();
    expParams.append("fields[]", "Description");
    expParams.append("fields[]", "Total");
    expParams.append("fields[]", "Total Amount (USD)");
    expParams.append("fields[]", "Expense Category");
    expParams.append("fields[]", "Date");
    expParams.append("fields[]", "Receipt URL");
    expParams.append("fields[]", "House Name");
    expParams.append("fields[]", "Month and Year");
    expParams.set("filterByFormula", `FIND("${propertyName}", ARRAYJOIN({House Name}, ","))`);
    expParams.set("sort[0][field]", "Date");
    expParams.set("sort[0][direction]", "asc");
    expParams.set("pageSize", "100");
    const allExpenseRecords = await fetchAllRecords(EXPENSES_TABLE, expParams);

    const expenses = allExpenseRecords.map((r: any) => {
      const f = r.fields;
      const catRaw = f["Expense Category"];
      const category = typeof catRaw === "string" ? catRaw : catRaw?.name || "";
      return {
        id: r.id,
        description: f["Description"] || "",
        amount: safeNum(isUSD ? f["Total Amount (USD)"] : f["Total"]),
        category,
        date: f["Date"] || "",
        receiptUrl: f["Receipt URL"] || "",
        monthYear: f["Month and Year"] || "",
      };
    });

    // 4. Get all deposits
    const depParams = new URLSearchParams();
    depParams.append("fields[]", "Amount");
    depParams.append("fields[]", "Date");
    depParams.append("fields[]", "Notes");
    depParams.append("fields[]", "House Name");
    depParams.append("fields[]", "Deposit Month and Year");
    depParams.set("sort[0][field]", "Date");
    depParams.set("sort[0][direction]", "desc");
    depParams.set("pageSize", "100");
    const depData = await airtableGet(DEPOSITS_TABLE, depParams);

    const propId = propRec.id;
    const deposits = depData.records
      .filter((r: any) => {
        const houseField = r.fields["House Name"];
        if (Array.isArray(houseField)) {
          return houseField.some((h: any) => (typeof h === "string" ? h : h?.id || "") === propId);
        }
        return false;
      })
      .map((r: any) => ({
        id: r.id,
        amount: safeNum(r.fields["Amount"]),
        date: r.fields["Date"] || "",
        notes: r.fields["Notes"] || "",
        monthYear: r.fields["Deposit Month and Year"] || "",
      }));

    const latestReport = visibleReports[0] || null;

    // 5. Compute YTD category totals
    const currentYear = new Date().getFullYear().toString();
    const ytdExpenses = expenses.filter((e: any) => e.date && e.date.startsWith(currentYear));
    const ytdByCategory: Record<string, number> = {};
    for (const e of ytdExpenses) {
      const cat = e.category || "Other";
      ytdByCategory[cat] = (ytdByCategory[cat] || 0) + e.amount;
    }

    // 6. Get maintenance tasks for this property
    const maintParams = new URLSearchParams();
    ["Title", "Type", "Status", "Priority", "Property", "Vendor", "Scheduled Date", "Completed Date", "Cost", "Notes", "Expense Created", "Attachments", "Approval Status", "Approved By", "Approval Date"].forEach(f => maintParams.append("fields[]", f));
    maintParams.set("sort[0][field]", "Scheduled Date");
    maintParams.set("sort[0][direction]", "desc");
    maintParams.set("pageSize", "100");
    const maintData = await airtableGet(MAINTENANCE_TABLE, maintParams);
    const maintTasks = maintData.records
      .filter((r: any) => (r.fields["Property"] || []).includes(propId))
      .map((r: any) => {
        const f = r.fields;
        const statusRaw = f["Status"]; const typeRaw = f["Type"]; const prioRaw = f["Priority"];
        return {
          id: r.id, title: f["Title"] || "",
          type: typeof typeRaw === "string" ? typeRaw : typeRaw?.name || "",
          status: typeof statusRaw === "string" ? statusRaw : statusRaw?.name || "",
          priority: typeof prioRaw === "string" ? prioRaw : prioRaw?.name || "",
          vendorName: "", scheduledDate: f["Scheduled Date"] || "",
          completedDate: f["Completed Date"] || "", cost: safeNum(f["Cost"]),
          notes: f["Notes"] || "", expenseCreated: !!f["Expense Created"],
          attachments: (f["Attachments"] || []).map((a: any) => ({ url: a.url || "", filename: a.filename || "" })),
          approvalStatus: f["Approval Status"] || "",
          approvedBy: f["Approved By"] || "",
          approvalDate: f["Approval Date"] || "",
        };
      });

    // 7. Get visits for this property
    const visitParams = new URLSearchParams();
    ["Visit Name", "Guest Name", "Visit Type", "Check-in Date", "Check-out Date", "Status", "Property", "Notes", "Adults", "Children", "Published"].forEach(f => visitParams.append("fields[]", f));
    visitParams.set("sort[0][field]", "Check-in Date");
    visitParams.set("sort[0][direction]", "desc");
    visitParams.set("pageSize", "100");
    const visitData = await airtableGet(VISITS_TABLE, visitParams);
    const visits = visitData.records
      .filter((r: any) => (r.fields["Property"] || []).includes(propId))
      .map((r: any) => {
        const f = r.fields;
        const statusRaw = f["Status"]; const typeRaw = f["Visit Type"];
        return {
          id: r.id, visitName: f["Visit Name"] || "", guestName: f["Guest Name"] || "",
          visitType: typeof typeRaw === "string" ? typeRaw : typeRaw?.name || "",
          checkIn: f["Check-in Date"] || "", checkOut: f["Check-out Date"] || "",
          status: typeof statusRaw === "string" ? statusRaw : statusRaw?.name || "",
          notes: f["Notes"] || "", adults: safeNum(f["Adults"]), children: safeNum(f["Children"]),
          published: !!f["Published"],
        };
      });

    // 8. Get itinerary events for the property's visits (only published visits)
    const publishedVisits = visits.filter((v: any) => v.published);
    const visitIds = publishedVisits.map((v: any) => v.id);
    const itiParams = new URLSearchParams();
    ["Event Name", "Visit", "Vendor", "Date", "Time", "Details", "Status", "Event Type", "Show Vendor", "Total", "Currency", "Extra Details"].forEach(f => itiParams.append("fields[]", f));
    itiParams.set("sort[0][field]", "Date");
    itiParams.set("sort[0][direction]", "asc");
    itiParams.set("pageSize", "100");
    const [itiData, vendorData] = await Promise.all([
      airtableGet(ITINERARY_TABLE, itiParams),
      airtableGet(VENDORS_TABLE, new URLSearchParams([["fields[]", "Name"], ["pageSize", "100"]])),
    ]);
    const vendorMap: Record<string, string> = {};
    for (const vr of vendorData.records) vendorMap[vr.id] = vr.fields["Name"] || "";

    const itineraryEvents = itiData.records
      .filter((r: any) => { const vids = r.fields["Visit"] || []; return vids.some((vid: string) => visitIds.includes(vid)); })
      .map((r: any) => {
        const f = r.fields;
        const statusRaw = f["Status"];
        const vendorIds: string[] = f["Vendor"] || [];
        return {
          id: r.id, eventName: f["Event Name"] || "",
          visitId: (f["Visit"] || [])[0] || "", date: f["Date"] || "",
          time: f["Time"] || "", details: f["Details"] || "",
          status: typeof statusRaw === "string" ? statusRaw : statusRaw?.name || "",
          eventType: f["Event Type"] || "",
          showVendor: f["Show Vendor"] !== undefined ? !!f["Show Vendor"] : true,
          vendorName: vendorMap[vendorIds[0]] || "",
          total: safeNum(f["Total"]),
          currency: (() => { const raw = f["Currency"]; return typeof raw === "string" ? raw : raw?.name || ""; })(),
          extraDetails: (() => { try { return JSON.parse(f["Extra Details"] || "{}"); } catch { return {}; } })(),
        };
      });

    return NextResponse.json({
      property: {
        name: propertyName,
        owner: propRec.fields["Owner"] || "",
        currency,
        status: typeof propRec.fields["Status"] === "string" ? propRec.fields["Status"] : propRec.fields["Status"]?.name || "",
      },
      propertyId: propId,
      currentBalance: latestReport?.finalBalance || 0,
      latestReport,
      reports: visibleReports,
      expenses,
      deposits,
      ytdByCategory,
      maintTasks,
      visits,
      itineraryEvents,
    });
  } catch (error) {
    console.error("Owner API error:", error);
    return NextResponse.json({ error: "Failed to fetch owner data" }, { status: 500 });
  }
}