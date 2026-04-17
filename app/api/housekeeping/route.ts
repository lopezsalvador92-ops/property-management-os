import { NextResponse } from "next/server";

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;
const HSK_TABLE = process.env.AIRTABLE_TABLE_HOUSEKEEPING!;
const PROPERTIES_TABLE = process.env.AIRTABLE_TABLE_PROPERTIES!;
const HOUSEKEEPERS_TABLE = process.env.AIRTABLE_TABLE_HOUSEKEEPERS!;
const EXPENSES_TABLE = process.env.AIRTABLE_TABLE_EXPENSES!;

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
    // Step 1: Fetch properties (with clean configs) + housekeepers in parallel
    const propParams = new URLSearchParams();
    propParams.append("fields[]", "House Name");
    propParams.append("fields[]", "Included Cleans");
    propParams.append("fields[]", "HSK Fixed Fee");
    propParams.append("fields[]", "Status");
    propParams.set("pageSize", "50");

    const hkParams = new URLSearchParams();
    hkParams.append("fields[]", "Name");
    hkParams.append("fields[]", "Active");
    hkParams.set("pageSize", "100");

    const [propData, hkData] = await Promise.all([
      airtableGet(PROPERTIES_TABLE, propParams),
      airtableGet(HOUSEKEEPERS_TABLE, hkParams),
    ]);

    const hkById: Record<string, { id: string; name: string; active: boolean }> = {};
    const housekeepers: { id: string; name: string; active: boolean }[] = [];
    for (const rec of hkData.records) {
      const name = rec.fields["Name"] || "";
      const active = rec.fields["Active"] === true;
      const entry = { id: rec.id, name, active };
      hkById[rec.id] = entry;
      housekeepers.push(entry);
    }
    housekeepers.sort((a, b) => a.name.localeCompare(b.name));

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
      "Housekeeper Name", "Housekeeper", "Start of the Week",
      "Monday Houses", "Tuesday Houses", "Wednesday Houses",
      "Thursday Houses", "Friday Houses", "Saturday Houses", "Sunday Houses",
      "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
      "Approval Status", "Expenses Created?", "Comments", "Approval Time Stamp",
    ];
    fields.forEach(f => hskParams.append("fields[]", f));
    hskParams.set("pageSize", "100");
    hskParams.set("sort[0][field]", "Start of the Week");
    hskParams.set("sort[0][direction]", "desc");
    const hskData = await airtableGet(HSK_TABLE, hskParams);

    const extractIds = (raw: any): string[] => {
      if (!Array.isArray(raw)) return [];
      return raw.map((x: any) => (typeof x === "string" ? x : x?.id || "")).filter(Boolean);
    };

    const logs = hskData.records.map((record: any) => {
      const statusRaw = record.fields["Approval Status"];
      const status = typeof statusRaw === "string" ? statusRaw : statusRaw?.name || "";
      const expRaw = record.fields["Expenses Created?"];
      const expCreated = (typeof expRaw === "string" ? expRaw : expRaw?.name || "") === "True";
      const legacyName = (record.fields["Housekeeper Name"] || "").toString().trim();
      const hkLinkIds = extractIds(record.fields["Housekeeper"]);
      const hkId = hkLinkIds[0] || "";
      const hkRec = hkId ? hkById[hkId] : undefined;
      // Prefer canonical name from Housekeepers table; fall back to legacy free-text if unlinked
      const housekeeperName = hkRec?.name || legacyName;
      return {
        id: record.id,
        housekeeper: housekeeperName,
        housekeeperId: hkId,
        housekeeperLegacy: legacyName,
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
        dayIds: {
          mon: extractIds(record.fields["Monday"]),
          tue: extractIds(record.fields["Tuesday"]),
          wed: extractIds(record.fields["Wednesday"]),
          thu: extractIds(record.fields["Thursday"]),
          fri: extractIds(record.fields["Friday"]),
          sat: extractIds(record.fields["Saturday"]),
          sun: extractIds(record.fields["Sunday"]),
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

        // Per-week breakdown — unused included cleans do NOT carry over
        const weeklyBreakdown = weekStarts.map(ws => {
          const cleans = cleansByPropertyWeek[cfg.name]?.[ws] || 0;
          const included = cfg.includedCleans;
          const extra = Math.max(0, cleans - included);
          return { weekStart: ws, cleans, included, extra };
        });

        // Monthly extra = sum of per-week extras (no carryover of unused included)
        const extraCleans = weeklyBreakdown.reduce((sum, wb) => sum + wb.extra, 0);

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
      housekeepers,
    });
  } catch (error) {
    console.error("HSK error:", error);
    return NextResponse.json({ error: "Failed to fetch housekeeping logs", detail: String(error) }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// Extras-on-approval: after approving HSK logs, compute overages and UPSERT
// extra-clean expenses. Runs across ALL approved logs for the affected weeks
// so that cleans by multiple housekeepers are counted together.
// ---------------------------------------------------------------------------
async function computeAndUpsertExtras(approvedRecordIds: string[]) {
  const dayFields = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  // 1. Fetch the just-approved records to determine affected weeks + day data
  const idFormula = approvedRecordIds.map(id => `RECORD_ID()='${id}'`).join(",");
  const logParams = new URLSearchParams();
  logParams.append("fields[]", "Start of the Week");
  dayFields.forEach(d => logParams.append("fields[]", d));
  logParams.set("filterByFormula", `OR(${idFormula})`);
  logParams.set("pageSize", "100");
  const logData = await airtableGet(HSK_TABLE, logParams);

  // Collect affected week-start dates
  const weekStarts = new Set<string>();
  for (const rec of logData.records) {
    const ws = rec.fields["Start of the Week"];
    if (ws) weekStarts.add(ws);
  }
  if (weekStarts.size === 0) return { weeks: 0, expenses: [] };

  // 2. Fetch ALL approved logs for those weeks (not just the ones being approved now)
  const weekFormulas = Array.from(weekStarts).map(ws => `{Start of the Week}='${ws}'`);
  const allLogsParams = new URLSearchParams();
  allLogsParams.append("fields[]", "Start of the Week");
  allLogsParams.append("fields[]", "Approval Status");
  dayFields.forEach(d => allLogsParams.append("fields[]", d));
  allLogsParams.set("filterByFormula",
    `AND({Approval Status}='Approved', OR(${weekFormulas.join(",")}))`
  );
  allLogsParams.set("pageSize", "100");
  const allLogsData = await airtableGet(HSK_TABLE, allLogsParams);

  // 3. Fetch property configs
  const propParams = new URLSearchParams();
  ["House Name", "Status", "HSK Fixed Fee", "Included Cleans",
   "Preferred Currency", "Housekeeping Fee USD", "Housekeeping Fee MXN",
  ].forEach(f => propParams.append("fields[]", f));
  propParams.set("pageSize", "50");
  const propData = await airtableGet(PROPERTIES_TABLE, propParams);

  // Build property lookup: id → config
  const propById: Record<string, {
    name: string; cadence: string; included: number;
    currency: string; fee: number;
  }> = {};
  for (const rec of propData.records) {
    const f = rec.fields;
    const cadence = typeof f["HSK Fixed Fee"] === "string" ? f["HSK Fixed Fee"] : f["HSK Fixed Fee"]?.name || "None";
    const currency = typeof f["Preferred Currency"] === "string" ? f["Preferred Currency"] : f["Preferred Currency"]?.name || "MXN";
    const fee = currency === "USD" ? (f["Housekeeping Fee USD"] || 0) : (f["Housekeeping Fee MXN"] || 0);
    propById[rec.id] = {
      name: f["House Name"] || "",
      cadence,
      included: f["Included Cleans"] || 0,
      currency,
      fee: Number(fee) || 0,
    };
  }

  // 4. Count cleans per property per week across all approved logs
  // cleans[weekStart][propId] = count
  const cleans: Record<string, Record<string, number>> = {};
  for (const rec of allLogsData.records) {
    const ws = rec.fields["Start of the Week"];
    if (!ws) continue;
    if (!cleans[ws]) cleans[ws] = {};
    for (const dayField of dayFields) {
      const linked = rec.fields[dayField];
      if (!Array.isArray(linked)) continue;
      for (const entry of linked) {
        const propId = typeof entry === "string" ? entry : entry?.id || "";
        if (propId) {
          cleans[ws][propId] = (cleans[ws][propId] || 0) + 1;
        }
      }
    }
  }

  // 5. Compute extras per property per week
  type ExtraEntry = {
    propId: string; propName: string; weekStart: string;
    totalCleans: number; included: number; extras: number;
    total: number; currency: string; receipt: string;
  };
  const extraEntries: ExtraEntry[] = [];

  for (const ws of Object.keys(cleans)) {
    for (const [propId, count] of Object.entries(cleans[ws])) {
      const cfg = propById[propId];
      if (!cfg) continue;
      // Weekly: extras = cleans - included. None: extras = all cleans.
      // Bi-weekly: skip for now.
      let extras = 0;
      if (cfg.cadence === "Weekly") {
        extras = Math.max(0, count - cfg.included);
      } else if (cfg.cadence === "None") {
        extras = count;
      } else {
        continue; // Bi-weekly or unknown: skip
      }
      if (extras <= 0 || cfg.fee <= 0) continue;

      extraEntries.push({
        propId,
        propName: cfg.name,
        weekStart: ws,
        totalCleans: count,
        included: cfg.included,
        extras,
        total: Number((extras * cfg.fee).toFixed(2)),
        currency: cfg.currency,
        receipt: `HSKEXW-${propId}-${ws}`,
      });
    }
  }

  if (extraEntries.length === 0) return { weeks: weekStarts.size, expenses: [], message: "No extras" };

  // 6. Check existing expenses with matching receipt numbers (for UPSERT)
  const receiptList = extraEntries.map(e => e.receipt);
  const receiptFormula = receiptList.map(r => `{Receipt No}='${r}'`).join(",");
  const existParams = new URLSearchParams();
  existParams.append("fields[]", "Receipt No");
  existParams.append("fields[]", "Total");
  existParams.set("filterByFormula", `OR(${receiptFormula})`);
  existParams.set("pageSize", "100");
  const existData = await airtableGet(EXPENSES_TABLE, existParams);

  const existingByReceipt: Record<string, { id: string; total: number }> = {};
  for (const rec of existData.records) {
    const rn = typeof rec.fields["Receipt No"] === "string" ? rec.fields["Receipt No"] : "";
    if (rn) existingByReceipt[rn] = { id: rec.id, total: rec.fields["Total"] || 0 };
  }

  // 7. UPSERT: create new or update existing
  const created: string[] = [];
  const updated: string[] = [];
  const unchanged: string[] = [];

  for (const entry of extraEntries) {
    const existing = existingByReceipt[entry.receipt];
    if (existing) {
      // Already exists — update only if total changed
      if (Math.abs(existing.total - entry.total) < 0.01) {
        unchanged.push(entry.receipt);
        continue;
      }
      const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${EXPENSES_TABLE}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          records: [{
            id: existing.id,
            fields: {
              "Total": entry.total,
              "Description": `Extra cleans (${entry.extras}) — week of ${entry.weekStart}`,
            },
          }],
        }),
      });
      if (!res.ok) {
        console.error(`Failed to update extra expense ${entry.receipt}`);
      } else {
        updated.push(entry.receipt);
      }
    } else {
      // Create new
      const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${EXPENSES_TABLE}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          records: [{
            fields: {
              "House": [entry.propId],
              "Date": entry.weekStart,
              "Expense Category": "Villa Staff",
              "Total": entry.total,
              "Currency": entry.currency,
              "Description": `Extra cleans (${entry.extras}) — week of ${entry.weekStart}`,
              "Supplier": "Housekeeping",
              "Receipt No": entry.receipt,
            },
          }],
          typecast: true,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error(`Failed to create extra expense ${entry.receipt}:`, err);
      } else {
        created.push(entry.receipt);
      }
    }
  }

  return {
    weeks: weekStarts.size,
    expenses: extraEntries.map(e => ({
      property: e.propName, week: e.weekStart,
      cleans: e.totalCleans, included: e.included,
      extras: e.extras, total: e.total, currency: e.currency,
    })),
    created,
    updated,
    unchanged,
  };
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

    // Edit day-level property assignments (before approval)
    if (action === "editDays" && recordId) {
      const { days } = body as { days: Record<string, string[]> };
      if (!days || typeof days !== "object") {
        return NextResponse.json({ error: "Missing days payload" }, { status: 400 });
      }
      const dayKeyToField: Record<string, string> = {
        mon: "Monday", tue: "Tuesday", wed: "Wednesday",
        thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday",
      };
      const fields: Record<string, any> = {};
      for (const [key, propIds] of Object.entries(days)) {
        const fieldName = dayKeyToField[key];
        if (!fieldName) continue;
        if (!Array.isArray(propIds)) continue;
        fields[fieldName] = propIds.filter(Boolean);
      }
      if (Object.keys(fields).length === 0) {
        return NextResponse.json({ error: "No valid day fields to update" }, { status: 400 });
      }
      const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${HSK_TABLE}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ records: [{ id: recordId, fields }] }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error("HSK editDays error:", errData);
        return NextResponse.json({ error: "Failed to update days" }, { status: 500 });
      }
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

    // --- Extras-on-approval: compute and UPSERT extra-clean expenses ---
    let extrasResult: any = null;
    if (action === "approve") {
      try {
        extrasResult = await computeAndUpsertExtras(recordIds);
      } catch (err) {
        console.error("Extras-on-approval error (non-fatal):", err);
        extrasResult = { error: String(err) };
      }
    }

    return NextResponse.json({ success: true, updated: recordIds.length, extras: extrasResult });
  } catch (error) {
    console.error("HSK update error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

// Create blank HSK log records (backfill for housekeepers missing a log for a given week)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { weekStart, housekeeperIds } = body;
    if (!weekStart || !Array.isArray(housekeeperIds) || housekeeperIds.length === 0) {
      return NextResponse.json({ error: "Missing weekStart or housekeeperIds" }, { status: 400 });
    }
    // Validate weekStart is a Monday (ISO day 1)
    const d = new Date(weekStart + "T12:00:00Z");
    if (d.getUTCDay() !== 1) {
      return NextResponse.json({ error: "weekStart must be a Monday" }, { status: 400 });
    }

    const records = housekeeperIds.map((hkId: string) => ({
      fields: {
        "Start of the Week": weekStart,
        "Housekeeper": [hkId],
      },
    }));

    let created = 0;
    for (let i = 0; i < records.length; i += 10) {
      const batch = records.slice(i, i + 10);
      const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${HSK_TABLE}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ records: batch, typecast: true }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("HSK backfill error:", err);
        return NextResponse.json({ error: "Failed to create logs", detail: err }, { status: 500 });
      }
      const data = await res.json();
      created += data.records.length;
    }

    return NextResponse.json({ success: true, created });
  } catch (error) {
    console.error("HSK POST error:", error);
    return NextResponse.json({ error: "Failed to create logs" }, { status: 500 });
  }
}