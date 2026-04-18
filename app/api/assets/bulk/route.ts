import { NextResponse } from "next/server";
import { getTenant } from "@/lib/getTenant";

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN!;

async function airtableFetch(baseId: string, path: string, options?: RequestInit) {
  const res = await fetch(`https://api.airtable.com/v0/${baseId}/${path}`, {
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

type Row = {
  name: string;
  sectionId?: string;
  category?: string;
  brand?: string;
  model?: string;
  notes?: string;
};

function buildFields(r: Row, propertyId: string) {
  const fields: Record<string, any> = {
    "Name": r.name,
    "Property": [propertyId],
    "Status": "Active",
  };
  if (r.sectionId) fields["Section"] = [r.sectionId];
  if (r.category) fields["Category"] = r.category;
  if (r.brand) fields["Brand"] = r.brand;
  if (r.model) fields["Model"] = r.model;
  if (r.notes) fields["Notes"] = r.notes;
  return fields;
}

export async function POST(request: Request) {
  try {
    const tenant = await getTenant();
    const body = await request.json();
    const { propertyId, rows } = body as { propertyId: string; rows: Row[] };

    if (!propertyId) return NextResponse.json({ error: "Missing propertyId" }, { status: 400 });
    if (!Array.isArray(rows) || rows.length === 0) return NextResponse.json({ error: "No rows supplied" }, { status: 400 });

    const cleaned = rows.filter(r => r && r.name && String(r.name).trim());
    if (cleaned.length === 0) return NextResponse.json({ error: "All rows missing Name" }, { status: 400 });

    let created = 0;
    const errors: { row: number; message: string }[] = [];
    const ids: string[] = [];

    for (let i = 0; i < cleaned.length; i += 10) {
      const batch = cleaned.slice(i, i + 10).map(r => ({ fields: buildFields(r, propertyId) }));
      try {
        const data = await airtableFetch(tenant.baseId, tenant.tables.assets, {
          method: "POST",
          body: JSON.stringify({ records: batch, typecast: true }),
        });
        const records = data.records || [];
        created += records.length;
        for (const rec of records) ids.push(rec.id);
      } catch (e: any) {
        errors.push({ row: i + 1, message: e?.message || "Batch failed" });
      }
    }

    return NextResponse.json({ success: errors.length === 0, created, skipped: rows.length - cleaned.length, errors, ids });
  } catch (error: any) {
    console.error("Assets bulk POST error:", error);
    return NextResponse.json({ error: error.message || "Bulk import failed" }, { status: 500 });
  }
}
