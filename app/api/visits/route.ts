import { NextResponse } from "next/server";

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;
const VISITS_TABLE = process.env.AIRTABLE_TABLE_VISITS!;
const PROPERTIES_TABLE = process.env.AIRTABLE_TABLE_PROPERTIES!;

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
    params.append("fields[]", "Visit Name");
    params.append("fields[]", "Guest Name");
    params.append("fields[]", "Visit Type");
    params.append("fields[]", "Check-in Date");
    params.append("fields[]", "Check-out Date");
    params.append("fields[]", "Status");
    params.append("fields[]", "Property");
    params.append("fields[]", "Notes");
    params.append("fields[]", "Checklist");
    params.append("fields[]", "Adults");
    params.append("fields[]", "Children");
    params.append("fields[]", "Questionnaire");
    params.append("fields[]", "Published");
    params.set("sort[0][field]", "Check-in Date");
    params.set("sort[0][direction]", "asc");

    const data = await airtableFetch(`${VISITS_TABLE}?${params}`);

    // Get property names
    const propData = await airtableFetch(
      `${PROPERTIES_TABLE}?fields[]=House+Name&pageSize=100`
    );
    const propMap: Record<string, string> = {};
    for (const r of propData.records) {
      propMap[r.id] = r.fields["House Name"] || "";
    }

    const visits = data.records.map((r: any) => {
      const propertyIds: string[] = r.fields["Property"] || [];
      let questionnaire: Record<string, any> = {};
      try { questionnaire = JSON.parse(r.fields["Questionnaire"] || "{}"); } catch {}
      return {
        id: r.id,
        visitName: r.fields["Visit Name"] || "",
        guestName: r.fields["Guest Name"] || "",
        visitType: r.fields["Visit Type"] || "Owner",
        checkIn: r.fields["Check-in Date"] || "",
        checkOut: r.fields["Check-out Date"] || "",
        status: r.fields["Status"] || "Upcoming",
        propertyId: propertyIds[0] || "",
        propertyName: propMap[propertyIds[0]] || "",
        notes: r.fields["Notes"] || "",
        checklist: r.fields["Checklist"] || "",
        adults: r.fields["Adults"] || 0,
        children: r.fields["Children"] || 0,
        questionnaire,
        published: !!r.fields["Published"],
      };
    });

    return NextResponse.json({ visits });
  } catch (error: any) {
    console.error("Visits GET error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch visits" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { visitName, guestName, visitType, checkIn, checkOut, status, propertyId, notes, checklist, adults, children, questionnaire } = body;

    if (!visitName || !checkIn || !checkOut) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const fields: Record<string, any> = {
      "Visit Name": visitName,
      "Guest Name": guestName || "",
      "Visit Type": visitType || "Owner",
      "Check-in Date": checkIn,
      "Check-out Date": checkOut,
      "Status": status || "Upcoming",
      "Notes": notes || "",
      "Checklist": checklist || "",
      "Adults": adults || 0,
      "Children": children || 0,
      "Questionnaire": questionnaire ? JSON.stringify(questionnaire) : "{}",
    };
    if (propertyId) fields["Property"] = [propertyId];

    const data = await airtableFetch(VISITS_TABLE, {
      method: "POST",
      body: JSON.stringify({ fields }),
    });

    return NextResponse.json({ success: true, id: data.id });
  } catch (error: any) {
    console.error("Visits POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to create visit" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, ...fields } = body;

    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const airtableFields: Record<string, any> = {};
    if (fields.visitName !== undefined) airtableFields["Visit Name"] = fields.visitName;
    if (fields.guestName !== undefined) airtableFields["Guest Name"] = fields.guestName;
    if (fields.visitType !== undefined) airtableFields["Visit Type"] = fields.visitType;
    if (fields.checkIn !== undefined) airtableFields["Check-in Date"] = fields.checkIn;
    if (fields.checkOut !== undefined) airtableFields["Check-out Date"] = fields.checkOut;
    if (fields.status !== undefined) airtableFields["Status"] = fields.status;
    if (fields.propertyId !== undefined) airtableFields["Property"] = fields.propertyId ? [fields.propertyId] : [];
    if (fields.notes !== undefined) airtableFields["Notes"] = fields.notes;
    if (fields.checklist !== undefined) airtableFields["Checklist"] = fields.checklist;
    if (fields.adults !== undefined) airtableFields["Adults"] = fields.adults;
    if (fields.children !== undefined) airtableFields["Children"] = fields.children;
    if (fields.questionnaire !== undefined) airtableFields["Questionnaire"] = JSON.stringify(fields.questionnaire);
    if (fields.published !== undefined) airtableFields["Published"] = fields.published;

    await airtableFetch(VISITS_TABLE, {
      method: "PATCH",
      body: JSON.stringify({ records: [{ id, fields: airtableFields }] }),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Visits PATCH error:", error);
    return NextResponse.json({ error: error.message || "Failed to update visit" }, { status: 500 });
  }
}
