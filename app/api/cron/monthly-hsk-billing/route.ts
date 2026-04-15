import { NextResponse } from "next/server";

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;
const CRON_SECRET = process.env.CRON_SECRET || "";
const PROPERTIES_TABLE = "tblCTRtMtVNv0F63W";
const EXPENSES_TABLE = "tblHeiBjXhsKW9Opj";

async function airtableGet(tableId: string, params: URLSearchParams) {
  const url = `https://api.airtable.com/v0/${BASE_ID}/${tableId}?${params}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }, cache: "no-store" });
  if (!res.ok) throw new Error(`Airtable ${res.status} on ${tableId}`);
  return res.json();
}

// Count Mondays (ISO weekday 1) between two UTC dates inclusive
function countMondaysInMonth(year: number, month: number): number {
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const lastDay = new Date(Date.UTC(year, month, 0));
  let count = 0;
  for (let d = new Date(firstDay); d <= lastDay; d.setUTCDate(d.getUTCDate() + 1)) {
    if (d.getUTCDay() === 1) count++;
  }
  return count;
}

function parseMonth(monthStr: string | null): { year: number; month: number; prefix: string; label: string; firstDay: string } {
  const now = new Date();
  let year = now.getUTCFullYear();
  let month = now.getUTCMonth() + 1;
  if (monthStr && /^\d{4}-\d{2}$/.test(monthStr)) {
    const [y, m] = monthStr.split("-").map(Number);
    year = y;
    month = m;
  }
  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  const label = new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  const firstDay = `${prefix}-01`;
  return { year, month, prefix, label, firstDay };
}

async function runBilling(monthStr: string | null, dryRun = false) {
  const { year, month, prefix, label, firstDay } = parseMonth(monthStr);
  const mondaysCount = countMondaysInMonth(year, month);

  // Step 1: Fetch active properties with Weekly cadence
  const propParams = new URLSearchParams();
  [
    "House Name", "Status", "HSK Fixed Fee", "Preferred Currency",
    "Housekeeping Fee USD", "Housekeeping Fee MXN",
    "Houseman Fee USD", "Houseman Fee MXN",
  ].forEach(f => propParams.append("fields[]", f));
  propParams.set("pageSize", "50");
  const propData = await airtableGet(PROPERTIES_TABLE, propParams);

  const eligible = propData.records
    .map((rec: any) => {
      const f = rec.fields;
      const status = typeof f["Status"] === "string" ? f["Status"] : f["Status"]?.name || "";
      const cadence = typeof f["HSK Fixed Fee"] === "string" ? f["HSK Fixed Fee"] : f["HSK Fixed Fee"]?.name || "None";
      const currency = typeof f["Preferred Currency"] === "string" ? f["Preferred Currency"] : f["Preferred Currency"]?.name || "MXN";
      const hskFee = currency === "USD" ? (f["Housekeeping Fee USD"] || 0) : (f["Housekeeping Fee MXN"] || 0);
      const housemanFee = currency === "USD" ? (f["Houseman Fee USD"] || 0) : (f["Houseman Fee MXN"] || 0);
      return {
        id: rec.id,
        name: f["House Name"] || "",
        status,
        cadence,
        currency,
        hskFee: Number(hskFee) || 0,
        housemanFee: Number(housemanFee) || 0,
      };
    })
    .filter((p: any) => p.status === "Active" && p.cadence === "Weekly");

  // Step 2: Fetch existing expenses with HSKFIXM/HMNFIXM prefix for this month (idempotency)
  const existingParams = new URLSearchParams();
  existingParams.append("fields[]", "Receipt No");
  existingParams.set("pageSize", "100");
  const hskKey = `HSKFIXM-${prefix}-`;
  const hmnKey = `HMNFIXM-${prefix}-`;
  existingParams.set(
    "filterByFormula",
    `OR(FIND("${hskKey}", {Receipt No}) > 0, FIND("${hmnKey}", {Receipt No}) > 0)`
  );
  const existing = new Set<string>();
  let offset: string | undefined = undefined;
  do {
    if (offset) existingParams.set("offset", offset); else existingParams.delete("offset");
    const existingData: any = await airtableGet(EXPENSES_TABLE, existingParams);
    for (const r of existingData.records) {
      const rn = r.fields["Receipt No"];
      if (typeof rn === "string") existing.add(rn);
    }
    offset = existingData.offset;
  } while (offset);

  // Step 3: Build records to create
  const toCreate: any[] = [];
  const skipped: string[] = [];
  const queued: string[] = [];

  for (const p of eligible) {
    if (p.hskFee > 0) {
      const receipt = `HSKFIXM-${prefix}-${p.id}`;
      if (existing.has(receipt)) {
        skipped.push(receipt);
      } else {
        toCreate.push({
          fields: {
            "House": [p.id],
            "Date": firstDay,
            "Expense Category": "Villa Staff",
            "Total": Number((p.hskFee * mondaysCount).toFixed(2)),
            "Currency": p.currency,
            "Description": `Housekeeping — ${mondaysCount} Mondays in ${label}`,
            "Supplier": "Housekeeping",
            "Receipt No": receipt,
          },
        });
        queued.push(receipt);
      }
    }
    if (p.housemanFee > 0) {
      const receipt = `HMNFIXM-${prefix}-${p.id}`;
      if (existing.has(receipt)) {
        skipped.push(receipt);
      } else {
        toCreate.push({
          fields: {
            "House": [p.id],
            "Date": firstDay,
            "Expense Category": "Villa Staff",
            "Total": Number((p.housemanFee * mondaysCount).toFixed(2)),
            "Currency": p.currency,
            "Description": `Houseman — ${mondaysCount} Mondays in ${label}`,
            "Supplier": "Houseman",
            "Receipt No": receipt,
          },
        });
        queued.push(receipt);
      }
    }
  }

  // Step 4: POST in batches of 10 (skip if dry run)
  let created = 0;
  if (!dryRun) {
    for (let i = 0; i < toCreate.length; i += 10) {
      const batch = toCreate.slice(i, i + 10);
      const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${EXPENSES_TABLE}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ records: batch, typecast: true }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("Monthly HSK billing batch error:", err);
        throw new Error(`Airtable POST ${res.status}: ${JSON.stringify(err)}`);
      }
      const data = await res.json();
      created += data.records.length;
    }
  }

  return {
    month: prefix,
    label,
    mondaysCount,
    eligibleProperties: eligible.length,
    dryRun,
    created,
    queued: toCreate.map(r => ({
      receipt: r.fields["Receipt No"],
      house: r.fields["House"][0],
      total: r.fields["Total"],
      currency: r.fields["Currency"],
      description: r.fields["Description"],
    })),
    queuedReceipts: queued,
    skippedReceipts: skipped,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    if (!CRON_SECRET) {
      return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
    }
    // Vercel cron jobs automatically send Authorization: Bearer ${CRON_SECRET}
    const auth = request.headers.get("authorization") || "";
    if (auth !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dryRun = searchParams.get("dryRun") === "1";
    const result = await runBilling(searchParams.get("month"), dryRun);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Monthly HSK billing error:", error);
    return NextResponse.json({ error: "Failed to run monthly HSK billing", detail: String(error) }, { status: 500 });
  }
}

// Manual trigger (for UI "Run now" button), gated by CRON_SECRET
export async function POST(request: Request) {
  try {
    const auth = request.headers.get("authorization") || "";
    const hasValidSecret = !!CRON_SECRET && auth === `Bearer ${CRON_SECRET}`;
    const body = await request.json().catch(() => ({}));
    const bodySecret = typeof body?.secret === "string" && !!CRON_SECRET && body.secret === CRON_SECRET;
    if (!hasValidSecret && !bodySecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const result = await runBilling(body?.month || null, body?.dryRun === true);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Monthly HSK billing manual error:", error);
    return NextResponse.json({ error: "Failed to run monthly HSK billing", detail: String(error) }, { status: 500 });
  }
}
