import { NextResponse } from "next/server";

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;
const HOUSEKEEPERS_TABLE = process.env.AIRTABLE_TABLE_HOUSEKEEPERS!;

async function airtableGet(tableId: string, params: URLSearchParams) {
  const url = `https://api.airtable.com/v0/${BASE_ID}/${tableId}?${params}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Airtable ${res.status}`);
  return res.json();
}

export async function GET() {
  try {
    const params = new URLSearchParams();
    params.append("fields[]", "Name");
    params.append("fields[]", "Active");
    params.append("fields[]", "Notes");
    params.append("fields[]", "Housekeeping Log");
    params.set("pageSize", "100");
    params.set("sort[0][field]", "Name");
    params.set("sort[0][direction]", "asc");

    const data = await airtableGet(HOUSEKEEPERS_TABLE, params);

    const housekeepers = data.records.map((rec: any) => {
      const logsRaw = rec.fields["Housekeeping Log"];
      const logCount = Array.isArray(logsRaw) ? logsRaw.length : 0;
      return {
        id: rec.id,
        name: rec.fields["Name"] || "",
        active: rec.fields["Active"] === true,
        notes: rec.fields["Notes"] || "",
        logCount,
      };
    });

    return NextResponse.json({ housekeepers });
  } catch (error) {
    console.error("Housekeepers GET error:", error);
    return NextResponse.json({ error: "Failed to fetch housekeepers" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, active, notes } = body;
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    const fields: Record<string, any> = {
      Name: name.trim(),
      Active: active !== false,
    };
    if (notes !== undefined) fields["Notes"] = notes;

    const res = await fetch(
      `https://api.airtable.com/v0/${BASE_ID}/${HOUSEKEEPERS_TABLE}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${AIRTABLE_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ records: [{ fields }] }),
      }
    );
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error("Housekeepers create error:", errData);
      return NextResponse.json({ error: "Failed to create housekeeper" }, { status: 500 });
    }
    const data = await res.json();
    return NextResponse.json({ success: true, record: data.records[0] });
  } catch (error) {
    console.error("Housekeepers POST error:", error);
    return NextResponse.json({ error: "Failed to create housekeeper" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, name, active, notes } = body;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const fields: Record<string, any> = {};
    if (name !== undefined && typeof name === "string" && name.trim()) fields["Name"] = name.trim();
    if (active !== undefined) fields["Active"] = active === true;
    if (notes !== undefined) fields["Notes"] = notes;

    if (Object.keys(fields).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const res = await fetch(
      `https://api.airtable.com/v0/${BASE_ID}/${HOUSEKEEPERS_TABLE}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${AIRTABLE_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ records: [{ id, fields }] }),
      }
    );
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error("Housekeepers patch error:", errData);
      return NextResponse.json({ error: "Failed to update housekeeper" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Housekeepers PATCH error:", error);
    return NextResponse.json({ error: "Failed to update housekeeper" }, { status: 500 });
  }
}
