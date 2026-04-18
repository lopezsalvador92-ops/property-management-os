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

export async function GET(request: Request) {
  try {
    const tenant = await getTenant();
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");

    const params = new URLSearchParams();
    params.append("fields[]", "Name");
    params.append("fields[]", "Property");
    params.append("fields[]", "Notes");
    params.set("sort[0][field]", "Name");
    params.set("sort[0][direction]", "asc");
    params.set("pageSize", "100");

    const data = await airtableFetch(tenant.baseId, `${tenant.tables.sections}?${params}`);
    const all = data.records.map((r: any) => ({
      id: r.id,
      name: r.fields["Name"] || "",
      propertyIds: (r.fields["Property"] || []) as string[],
      notes: r.fields["Notes"] || "",
    }));
    const sections = propertyId ? all.filter((s: any) => s.propertyIds.includes(propertyId)) : all;

    return NextResponse.json({ sections });
  } catch (error: any) {
    console.error("Sections GET error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch sections" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const tenant = await getTenant();
    const body = await request.json();
    const { name, propertyId, notes } = body;

    if (!name || !propertyId) return NextResponse.json({ error: "Missing name or propertyId" }, { status: 400 });

    const data = await airtableFetch(tenant.baseId, tenant.tables.sections, {
      method: "POST",
      body: JSON.stringify({
        fields: {
          "Name": name,
          "Property": [propertyId],
          "Notes": notes || "",
        },
      }),
    });

    return NextResponse.json({ success: true, id: data.id });
  } catch (error: any) {
    console.error("Sections POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to create section" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const tenant = await getTenant();
    const body = await request.json();
    const { id, name, propertyId, notes } = body;

    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const fields: Record<string, any> = {};
    if (name !== undefined) fields["Name"] = name;
    if (propertyId !== undefined) fields["Property"] = propertyId ? [propertyId] : [];
    if (notes !== undefined) fields["Notes"] = notes;

    await airtableFetch(tenant.baseId, tenant.tables.sections, {
      method: "PATCH",
      body: JSON.stringify({ records: [{ id, fields }] }),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Sections PATCH error:", error);
    return NextResponse.json({ error: error.message || "Failed to update section" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const tenant = await getTenant();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    await airtableFetch(tenant.baseId, `${tenant.tables.sections}/${id}`, { method: "DELETE" });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Sections DELETE error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete section" }, { status: 500 });
  }
}
