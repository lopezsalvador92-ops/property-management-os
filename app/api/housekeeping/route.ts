import { NextResponse } from "next/server";

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;
const HSK_TABLE = "tblG8udG0Wdo6Wms6";
const PROPERTIES_TABLE = "tblCTRtMtVNv0F63W";

async function airtableGet(tableId: string, params: URLSearchParams) {
  const url = `https://api.airtable.com/v0/${BASE_ID}/${tableId}?${params}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }, cache: "no-store" });
  if (!res.ok) throw new Error(`Airtable ${res.status}`);
  return res.json();
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get("month"); // optional YYYY-MM
    // Step 1: Fetch properties with clean configs
    const propParams = new URLSearchParams();
    propParams.append("fields[]", "House Name");
    propParams.append("fields[]", "Included Cleans");
    propParams.append("fields[]", "HSK Fixed Fee");
    propParams.append("fields[]", "Status");
    propParams.set("pageSize", "50");
    const propData = await airtableGet(PROPERTIES_TABLE, propParams);

    const propConfigs: Record<string, { name: string; includedCleans: number; cadence: string }> = {};
    for (const rec of propData.records) {
      const name = rec.fields["House Name"] || "";
      const statusRaw = rec.fields["Status"];
      const status = typeof statusRaw === "string" ? statusRaw : statusRaw?.name || "";
      if (status !== "Active") continue;
      const cadenceRaw = rec.fields["HSK Fixed Fee"];
      const cadence = typeof cadenceRaw === "string" ? cadenceRaw : cadenceRaw?.name || "None";
      const includedCleans = rec.fields["Included Cleans"] || 0;
      propConfigs[name] = { name, includedCleans, cadence };
    }

    // Step 2: Fetch housekeeping logs
    const hskParams = new URLSearchParams();
    const fields = [
      "Housekeeper Name", "Start of the Week",
      "Monday Houses", "Tuesday Houses", "Wednesday Houses",
      "Thursday Houses", "Friday Houses", "Saturday Houses", "Sunday Houses",
      "Approval Status", "Expenses Created?", "Comments", "Approval Time Stamp",
    ];
    fields.forEach(f => hskParams.append("fields[]", f));
    hskParams.set("pageSize", "100");
    hskParams.set("sort[0][field]", "Start of the Week");
    hskParams.set("sort[0][direction]", "desc");
    const hskData = await airtableGet(HSK_TABLE, hskParams);

    const logs = hskData.records.map((record: any) => {
      const statusRaw = record.fields["Approval Status"];
      const status = typeof statusRaw === "string" ? statusRaw : statusRaw?.name || "";
      const expRaw = record.fields["Expenses Created?"];
      const expCreated = (typeof expRaw === "string" ? expRaw : expRaw?.name || "") === "True";
      return {
        id: record.id,
        housekeeper: (record.fields["Housekeeper Name"] || "").trim(),
        weekStart: record.fields["Start of the Week"] || "",
        days: {
          mon: record.fields["Monday Houses"] || "",
          tue: record.fields["Tuesday Houses"] || "",
          wed: record.fields["Wednesday Houses"] || "",
          thu: record.fields["Thursday Houses"] || "",
          fri: record.fields["Friday Houses"] || "",
          sat: record.fields["Saturday Houses"] || "",
          sun: record.fields["Sunday Houses"] || "",
        },
        status,
        expensesCreated: expCreated,
        comments: record.fields["Comments"] || "",
        approvedAt: record.fields["Approval Time Stamp"] || "",
      };
    });

    // Step 3: Compute monthly summary with per-week breakdown
    const now = new Date();
    const currentMonthPrefix = monthParam || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const [yr, mo] = currentMonthPrefix.split("-").map(Number);
    const currentMonthLabel = new Date(yr, mo - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const monthLogs = logs.filter((l: any) => l.weekStart && l.weekStart.startsWith(currentMonthPrefix));
    const dayKeys = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

    // Get unique weeks sorted chronologically
    const weekStartSet = new Set<string>();
    for (const l of monthLogs) { if (l.weekStart) weekStartSet.add(l.weekStart as string); }
    const weekStarts: string[] = Array.from(weekStartSet).sort();

    // Count cleans per property per week
    const cleansByPropertyWeek: Record<string, Record<string, number>> = {};
    const cleanCounts: Record<string, number> = {};

    for (const log of monthLogs) {
      for (const dk of dayKeys) {
        const houses = (log.days as any)[dk] as string;
        if (houses && houses.trim()) {
          for (const h of houses.split(",")) {
            const name = h.trim();
            if (name) {
              cleanCounts[name] = (cleanCounts[name] || 0) + 1;
              if (!cleansByPropertyWeek[name]) cleansByPropertyWeek[name] = {};
              const ws = log.weekStart as string;
              cleansByPropertyWeek[name][ws] = (cleansByPropertyWeek[name][ws] || 0) + 1;
            }
          }
        }
      }
    }

    const weeksInMonth = weekStarts.length || 4;

    // Build summary with weekly breakdown
    const monthlySummary = Object.values(propConfigs)
      .filter(cfg => cfg.cadence !== "None")
      .map(cfg => {
        const totalCleans = cleanCounts[cfg.name] || 0;
        const includedMonthly = cfg.cadence === "Weekly" ? cfg.includedCleans * weeksInMonth : cfg.includedCleans;
        const extraCleans = Math.max(0, totalCleans - includedMonthly);

        // Per-week breakdown
        const weeklyBreakdown = weekStarts.map(ws => {
          const cleans = cleansByPropertyWeek[cfg.name]?.[ws] || 0;
          const included = cfg.includedCleans;
          const extra = Math.max(0, cleans - included);
          return { weekStart: ws, cleans, included, extra };
        });

        return {
          property: cfg.name,
          totalCleans,
          includedPerWeek: cfg.includedCleans,
          includedMonthly,
          extraCleans,
          cadence: cfg.cadence,
          weeksInMonth,
          weeklyBreakdown,
        };
      })
      .sort((a, b) => b.extraCleans - a.extraCleans || b.totalCleans - a.totalCleans);

    return NextResponse.json({
      logs,
      monthlySummary,
      weekStarts,
      currentMonth: currentMonthLabel,
    });
  } catch (error) {
    console.error("HSK error:", error);
    return NextResponse.json({ error: "Failed to fetch housekeeping logs", detail: String(error) }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { action, recordIds, recordId, comments } = body;

    // Single record comment update
    if (action === "editComment" && recordId) {
      const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${HSK_TABLE}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ records: [{ id: recordId, fields: { "Comments": comments || "" } }] }),
      });
      if (!res.ok) return NextResponse.json({ error: "Failed to update comment" }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (!action || !recordIds || !Array.isArray(recordIds) || recordIds.length === 0) {
      return NextResponse.json({ error: "Missing action or recordIds" }, { status: 400 });
    }
    let fieldUpdate: Record<string, string> = {};
    switch (action) {
      case "approve": fieldUpdate = { "Approval Status": "Approved" }; break;
      case "reject": fieldUpdate = { "Approval Status": "Rejected" }; break;
      default: return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
    const batches = [];
    for (let i = 0; i < recordIds.length; i += 10) batches.push(recordIds.slice(i, i + 10));
    for (const batch of batches) {
      const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${HSK_TABLE}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ records: batch.map((id: string) => ({ id, fields: fieldUpdate })) }),
      });
      if (!res.ok) return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    }
    return NextResponse.json({ success: true, updated: recordIds.length });
  } catch (error) {
    console.error("HSK update error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}