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

function pickName(val: any): string {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (Array.isArray(val)) { const f = val[0]; return typeof f === "string" ? f : f?.name || ""; }
  return val?.name || "";
}

function mapItem(r: any) {
  const f = r.fields;
  return {
    id: r.id,
    item: f["Item"] || "",
    propertyIds: (f["Property"] || []) as string[],
    sectionIds: (f["Section"] || []) as string[],
    category: pickName(f["Category"]),
    currentStock: typeof f["Current Stock"] === "number" ? f["Current Stock"] : 0,
    parLevel: typeof f["Par Level"] === "number" ? f["Par Level"] : 0,
    unit: f["Unit"] || "",
    lastRestocked: f["Last Restocked"] || "",
    photos: (f["Photos"] || []).map((a: any) => ({ url: a.url || "", filename: a.filename || "" })),
    notes: f["Notes"] || "",
  };
}

export async function GET(request: Request) {
  try {
    const tenant = await getTenant();
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");
    const sectionId = searchParams.get("sectionId");

    const params = new URLSearchParams();
    ["Item", "Property", "Section", "Category", "Current Stock", "Par Level", "Unit", "Last Restocked", "Photos", "Notes"].forEach(f => params.append("fields[]", f));
    params.set("sort[0][field]", "Item");
    params.set("sort[0][direction]", "asc");
    params.set("pageSize", "100");

    const data = await airtableFetch(tenant.baseId, `${tenant.tables.inventory}?${params}`);
    let items = data.records.map(mapItem);
    if (propertyId) items = items.filter((i: any) => i.propertyIds.includes(propertyId));
    if (sectionId) items = items.filter((i: any) => i.sectionIds.includes(sectionId));

    return NextResponse.json({ items });
  } catch (error: any) {
    console.error("Inventory GET error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch inventory" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const tenant = await getTenant();
    const body = await request.json();
    const { item, propertyId, sectionId, category, currentStock, parLevel, unit, lastRestocked, notes } = body;

    if (!item || !propertyId) return NextResponse.json({ error: "Missing item or propertyId" }, { status: 400 });

    const fields: Record<string, any> = {
      "Item": item,
      "Property": [propertyId],
    };
    if (sectionId) fields["Section"] = [sectionId];
    if (category) fields["Category"] = category;
    if (currentStock !== undefined && currentStock !== "") fields["Current Stock"] = parseInt(currentStock, 10) || 0;
    if (parLevel !== undefined && parLevel !== "") fields["Par Level"] = parseInt(parLevel, 10) || 0;
    if (unit) fields["Unit"] = unit;
    if (lastRestocked) fields["Last Restocked"] = lastRestocked;
    if (notes) fields["Notes"] = notes;

    const data = await airtableFetch(tenant.baseId, tenant.tables.inventory, {
      method: "POST",
      body: JSON.stringify({ records: [{ fields }], typecast: true }),
    });

    return NextResponse.json({ success: true, record: data.records[0] });
  } catch (error: any) {
    console.error("Inventory POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to create inventory item" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const tenant = await getTenant();
    const body = await request.json();
    const { id, item, propertyId, sectionId, category, currentStock, parLevel, unit, lastRestocked, notes } = body;

    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const fields: Record<string, any> = {};
    if (item !== undefined) fields["Item"] = item;
    if (propertyId !== undefined) fields["Property"] = propertyId ? [propertyId] : [];
    if (sectionId !== undefined) fields["Section"] = sectionId ? [sectionId] : [];
    if (category !== undefined) fields["Category"] = category;
    if (currentStock !== undefined) fields["Current Stock"] = currentStock === null || currentStock === "" ? null : parseInt(currentStock, 10) || 0;
    if (parLevel !== undefined) fields["Par Level"] = parLevel === null || parLevel === "" ? null : parseInt(parLevel, 10) || 0;
    if (unit !== undefined) fields["Unit"] = unit;
    if (lastRestocked !== undefined) fields["Last Restocked"] = lastRestocked || null;
    if (notes !== undefined) fields["Notes"] = notes;

    await airtableFetch(tenant.baseId, tenant.tables.inventory, {
      method: "PATCH",
      body: JSON.stringify({ records: [{ id, fields }], typecast: true }),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Inventory PATCH error:", error);
    return NextResponse.json({ error: error.message || "Failed to update inventory item" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const tenant = await getTenant();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    await airtableFetch(tenant.baseId, `${tenant.tables.inventory}/${id}`, { method: "DELETE" });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Inventory DELETE error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete inventory item" }, { status: 500 });
  }
}
