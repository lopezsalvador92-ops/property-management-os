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

export async function GET() {
  try {
    const tenant = await getTenant();
    const params = new URLSearchParams();
    params.append("fields[]", "Name");
    params.append("fields[]", "Category");
    params.append("fields[]", "Contact");
    params.append("fields[]", "Location");
    params.append("fields[]", "Tags");
    params.append("fields[]", "Notes");
    params.set("sort[0][field]", "Name");
    params.set("sort[0][direction]", "asc");

    const data = await airtableFetch(tenant.baseId, `${tenant.tables.vendors}?${params}`);

    const vendors = data.records.map((r: any) => ({
      id: r.id,
      name: r.fields["Name"] || "",
      category: r.fields["Category"] || "",
      contact: r.fields["Contact"] || "",
      location: r.fields["Location"] || "",
      tags: r.fields["Tags"] || "",
      notes: r.fields["Notes"] || "",
    }));

    return NextResponse.json({ vendors });
  } catch (error: any) {
    console.error("Vendors GET error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch vendors" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const tenant = await getTenant();
    const body = await request.json();
    const { name, category, contact, location, tags, notes } = body;

    if (!name) return NextResponse.json({ error: "Missing name" }, { status: 400 });

    const data = await airtableFetch(tenant.baseId, tenant.tables.vendors, {
      method: "POST",
      body: JSON.stringify({
        fields: {
          "Name": name,
          "Category": category || "",
          "Contact": contact || "",
          "Location": location || "",
          "Tags": tags || "",
          "Notes": notes || "",
        },
      }),
    });

    return NextResponse.json({ success: true, id: data.id });
  } catch (error: any) {
    console.error("Vendors POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to create vendor" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const tenant = await getTenant();
    const body = await request.json();
    const { id, name, category, contact, location, tags, notes } = body;

    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const fields: Record<string, any> = {};
    if (name !== undefined) fields["Name"] = name;
    if (category !== undefined) fields["Category"] = category;
    if (contact !== undefined) fields["Contact"] = contact;
    if (location !== undefined) fields["Location"] = location;
    if (tags !== undefined) fields["Tags"] = tags;
    if (notes !== undefined) fields["Notes"] = notes;

    await airtableFetch(tenant.baseId, tenant.tables.vendors, {
      method: "PATCH",
      body: JSON.stringify({ records: [{ id, fields }] }),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Vendors PATCH error:", error);
    return NextResponse.json({ error: error.message || "Failed to update vendor" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const tenant = await getTenant();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    await airtableFetch(tenant.baseId, `${tenant.tables.vendors}/${id}`, { method: "DELETE" });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Vendors DELETE error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete vendor" }, { status: 500 });
  }
}
