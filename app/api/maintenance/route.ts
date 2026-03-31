import { NextResponse } from "next/server";

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;
const TASKS_TABLE = "tblC5Muegq8fVfuQf";
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
    ["Title","Type","Status","Priority","Property","Vendor","Scheduled Date","Completed Date","Cost","Notes","Expense Created"].forEach(f => params.append("fields[]", f));
    params.set("sort[0][field]", "Scheduled Date");
    params.set("sort[0][direction]", "asc");
    params.set("pageSize", "100");

    const [data, propData, vendorData] = await Promise.all([
      airtableFetch(`${TASKS_TABLE}?${params}`),
      airtableFetch(`${PROPERTIES_TABLE}?fields[]=House+Name&pageSize=100`),
      airtableFetch(`${VENDORS_TABLE}?fields[]=Name&pageSize=100`),
    ]);

    const propMap: Record<string, string> = {};
    for (const r of propData.records) propMap[r.id] = r.fields["House Name"] || "";
    const vendorMap: Record<string, string> = {};
    for (const r of vendorData.records) vendorMap[r.id] = r.fields["Name"] || "";

    const tasks = data.records.map((r: any) => {
      const propIds: string[] = r.fields["Property"] || [];
      const vendorIds: string[] = r.fields["Vendor"] || [];
      return {
        id: r.id,
        title: r.fields["Title"] || "",
        type: r.fields["Type"] || "Reactive",
        status: r.fields["Status"] || "Open",
        priority: r.fields["Priority"] || "Medium",
        propertyId: propIds[0] || "",
        propertyName: propMap[propIds[0]] || "",
        vendorId: vendorIds[0] || "",
        vendorName: vendorMap[vendorIds[0]] || "",
        scheduledDate: r.fields["Scheduled Date"] || "",
        completedDate: r.fields["Completed Date"] || "",
        cost: r.fields["Cost"] || 0,
        notes: r.fields["Notes"] || "",
        expenseCreated: r.fields["Expense Created"] || false,
      };
    });

    return NextResponse.json({ tasks });
  } catch (error: any) {
    console.error("Maintenance GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, type, status, priority, propertyId, vendorId, scheduledDate, notes, cost } = body;
    if (!title) return NextResponse.json({ error: "Missing title" }, { status: 400 });

    const fields: Record<string, any> = {
      "Title": title,
      "Type": type || "Reactive",
      "Status": status || "Open",
      "Priority": priority || "Medium",
      "Notes": notes || "",
      "Cost": cost || 0,
    };
    if (propertyId) fields["Property"] = [propertyId];
    if (vendorId) fields["Vendor"] = [vendorId];
    if (scheduledDate) fields["Scheduled Date"] = scheduledDate;

    const data = await airtableFetch(TASKS_TABLE, {
      method: "POST",
      body: JSON.stringify({ fields }),
    });

    return NextResponse.json({ success: true, id: data.id });
  } catch (error: any) {
    console.error("Maintenance POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, ...rest } = body;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const fields: Record<string, any> = {};
    if (rest.title !== undefined) fields["Title"] = rest.title;
    if (rest.type !== undefined) fields["Type"] = rest.type;
    if (rest.status !== undefined) fields["Status"] = rest.status;
    if (rest.priority !== undefined) fields["Priority"] = rest.priority;
    if (rest.propertyId !== undefined) fields["Property"] = rest.propertyId ? [rest.propertyId] : [];
    if (rest.vendorId !== undefined) fields["Vendor"] = rest.vendorId ? [rest.vendorId] : [];
    if (rest.scheduledDate !== undefined) fields["Scheduled Date"] = rest.scheduledDate;
    if (rest.completedDate !== undefined) fields["Completed Date"] = rest.completedDate;
    if (rest.cost !== undefined) fields["Cost"] = rest.cost;
    if (rest.notes !== undefined) fields["Notes"] = rest.notes;
    if (rest.expenseCreated !== undefined) fields["Expense Created"] = rest.expenseCreated;

    await airtableFetch(TASKS_TABLE, {
      method: "PATCH",
      body: JSON.stringify({ records: [{ id, fields }] }),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Maintenance PATCH error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
