import { NextResponse } from "next/server";

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;
const CONFIG_TABLE = "tbl94Yp43rz6nLhLW";
const PROPERTIES_TABLE = "tblCTRtMtVNv0F63W";
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

export async function GET() {
  try {
    const params = new URLSearchParams();
    ["Task Name","Category","Property","Frequency","Vendor","Last Completed","Next Due","Notes","Active"].forEach(f => params.append("fields[]", f));
    params.set("sort[0][field]", "Next Due");
    params.set("sort[0][direction]", "asc");

    const [data, propData, vendorData] = await Promise.all([
      airtableFetch(`${CONFIG_TABLE}?${params}`),
      airtableFetch(`${PROPERTIES_TABLE}?fields[]=House+Name&pageSize=100`),
      airtableFetch(`${VENDORS_TABLE}?fields[]=Name&pageSize=100`),
    ]);

    const propMap: Record<string, string> = {};
    for (const r of propData.records) propMap[r.id] = r.fields["House Name"] || "";
    const vendorMap: Record<string, string> = {};
    for (const r of vendorData.records) vendorMap[r.id] = r.fields["Name"] || "";

    const configs = data.records.map((r: any) => {
      const propIds: string[] = r.fields["Property"] || [];
      const vendorIds: string[] = r.fields["Vendor"] || [];
      return {
        id: r.id,
        taskName: r.fields["Task Name"] || "",
        category: r.fields["Category"] || "General",
        propertyIds: propIds,
        propertyNames: propIds.map((id: string) => propMap[id] || "").filter(Boolean),
        frequency: r.fields["Frequency"] || "Monthly",
        vendorId: vendorIds[0] || "",
        vendorName: vendorMap[vendorIds[0]] || "",
        lastCompleted: r.fields["Last Completed"] || "",
        nextDue: r.fields["Next Due"] || "",
        notes: r.fields["Notes"] || "",
        active: r.fields["Active"] || false,
      };
    });

    return NextResponse.json({ configs });
  } catch (error: any) {
    console.error("Maintenance config GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { taskName, category, propertyIds, frequency, vendorId, lastCompleted, nextDue, notes } = body;
    if (!taskName) return NextResponse.json({ error: "Missing task name" }, { status: 400 });

    const fields: Record<string, any> = {
      "Task Name": taskName,
      "Category": category || "General",
      "Frequency": frequency || "Monthly",
      "Notes": notes || "",
      "Active": true,
    };
    if (propertyIds && propertyIds.length > 0) fields["Property"] = propertyIds;
    if (vendorId) fields["Vendor"] = [vendorId];
    if (lastCompleted) fields["Last Completed"] = lastCompleted;
    if (nextDue) fields["Next Due"] = nextDue;

    const data = await airtableFetch(CONFIG_TABLE, {
      method: "POST",
      body: JSON.stringify({ fields }),
    });

    return NextResponse.json({ success: true, id: data.id });
  } catch (error: any) {
    console.error("Maintenance config POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, ...rest } = body;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const fields: Record<string, any> = {};
    if (rest.taskName !== undefined) fields["Task Name"] = rest.taskName;
    if (rest.category !== undefined) fields["Category"] = rest.category;
    if (rest.propertyIds !== undefined) fields["Property"] = rest.propertyIds || [];
    if (rest.frequency !== undefined) fields["Frequency"] = rest.frequency;
    if (rest.vendorId !== undefined) fields["Vendor"] = rest.vendorId ? [rest.vendorId] : [];
    if (rest.lastCompleted !== undefined) fields["Last Completed"] = rest.lastCompleted;
    if (rest.nextDue !== undefined) fields["Next Due"] = rest.nextDue;
    if (rest.notes !== undefined) fields["Notes"] = rest.notes;
    if (rest.active !== undefined) fields["Active"] = rest.active;

    await airtableFetch(CONFIG_TABLE, {
      method: "PATCH",
      body: JSON.stringify({ records: [{ id, fields }] }),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Maintenance config PATCH error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
