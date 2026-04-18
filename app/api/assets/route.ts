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

export async function GET(request: Request) {
  try {
    const tenant = await getTenant();
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");
    const sectionId = searchParams.get("sectionId");
    const id = searchParams.get("id");

    if (id) {
      const data = await airtableFetch(tenant.baseId, `${tenant.tables.assets}/${id}`);
      return NextResponse.json({ asset: mapAsset(data) });
    }

    const params = new URLSearchParams();
    ["Name", "Property", "Section", "Category", "Status", "Brand", "Model", "Serial Number", "Purchase Date", "Purchase Cost", "Warranty Until", "Photos", "Notes"].forEach(f => params.append("fields[]", f));
    params.set("sort[0][field]", "Name");
    params.set("sort[0][direction]", "asc");
    params.set("pageSize", "100");

    const data = await airtableFetch(tenant.baseId, `${tenant.tables.assets}?${params}`);
    let assets = data.records.map(mapAsset);
    if (propertyId) assets = assets.filter((a: any) => a.propertyIds.includes(propertyId));
    if (sectionId) assets = assets.filter((a: any) => a.sectionIds.includes(sectionId));

    return NextResponse.json({ assets });
  } catch (error: any) {
    console.error("Assets GET error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch assets" }, { status: 500 });
  }
}

function mapAsset(r: any) {
  const f = r.fields;
  return {
    id: r.id,
    name: f["Name"] || "",
    propertyIds: (f["Property"] || []) as string[],
    sectionIds: (f["Section"] || []) as string[],
    category: pickName(f["Category"]),
    status: pickName(f["Status"]) || "Active",
    brand: f["Brand"] || "",
    model: f["Model"] || "",
    serialNumber: f["Serial Number"] || "",
    purchaseDate: f["Purchase Date"] || "",
    purchaseCost: typeof f["Purchase Cost"] === "number" ? f["Purchase Cost"] : 0,
    warrantyUntil: f["Warranty Until"] || "",
    photos: (f["Photos"] || []).map((a: any) => ({ url: a.url || "", filename: a.filename || "" })),
    notes: f["Notes"] || "",
  };
}

export async function POST(request: Request) {
  try {
    const tenant = await getTenant();
    const body = await request.json();
    const { name, propertyId, sectionId, category, status, brand, model, serialNumber, purchaseDate, purchaseCost, warrantyUntil, notes } = body;

    if (!name || !propertyId) return NextResponse.json({ error: "Missing name or propertyId" }, { status: 400 });

    const fields: Record<string, any> = {
      "Name": name,
      "Property": [propertyId],
      "Status": status || "Active",
    };
    if (sectionId) fields["Section"] = [sectionId];
    if (category) fields["Category"] = category;
    if (brand) fields["Brand"] = brand;
    if (model) fields["Model"] = model;
    if (serialNumber) fields["Serial Number"] = serialNumber;
    if (purchaseDate) fields["Purchase Date"] = purchaseDate;
    if (purchaseCost !== undefined && purchaseCost !== null && purchaseCost !== "") {
      const cost = parseFloat(purchaseCost);
      if (isFinite(cost)) fields["Purchase Cost"] = cost;
    }
    if (warrantyUntil) fields["Warranty Until"] = warrantyUntil;
    if (notes) fields["Notes"] = notes;

    const data = await airtableFetch(tenant.baseId, tenant.tables.assets, {
      method: "POST",
      body: JSON.stringify({ records: [{ fields }], typecast: true }),
    });

    return NextResponse.json({ success: true, record: data.records[0] });
  } catch (error: any) {
    console.error("Assets POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to create asset" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const tenant = await getTenant();
    const body = await request.json();
    const { id, name, propertyId, sectionId, category, status, brand, model, serialNumber, purchaseDate, purchaseCost, warrantyUntil, notes } = body;

    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const fields: Record<string, any> = {};
    if (name !== undefined) fields["Name"] = name;
    if (propertyId !== undefined) fields["Property"] = propertyId ? [propertyId] : [];
    if (sectionId !== undefined) fields["Section"] = sectionId ? [sectionId] : [];
    if (category !== undefined) fields["Category"] = category;
    if (status !== undefined) fields["Status"] = status;
    if (brand !== undefined) fields["Brand"] = brand;
    if (model !== undefined) fields["Model"] = model;
    if (serialNumber !== undefined) fields["Serial Number"] = serialNumber;
    if (purchaseDate !== undefined) fields["Purchase Date"] = purchaseDate || null;
    if (purchaseCost !== undefined) {
      if (purchaseCost === null || purchaseCost === "") fields["Purchase Cost"] = null;
      else {
        const cost = parseFloat(purchaseCost);
        if (isFinite(cost)) fields["Purchase Cost"] = cost;
      }
    }
    if (warrantyUntil !== undefined) fields["Warranty Until"] = warrantyUntil || null;
    if (notes !== undefined) fields["Notes"] = notes;

    await airtableFetch(tenant.baseId, tenant.tables.assets, {
      method: "PATCH",
      body: JSON.stringify({ records: [{ id, fields }], typecast: true }),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Assets PATCH error:", error);
    return NextResponse.json({ error: error.message || "Failed to update asset" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const tenant = await getTenant();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    await airtableFetch(tenant.baseId, `${tenant.tables.assets}/${id}`, { method: "DELETE" });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Assets DELETE error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete asset" }, { status: 500 });
  }
}
