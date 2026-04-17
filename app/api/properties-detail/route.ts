import { NextResponse } from "next/server";
import { getTenant } from "@/lib/getTenant";

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN!;

async function airtableGet(baseId: string, tableId: string, params: URLSearchParams) {
  const url = `https://api.airtable.com/v0/${baseId}/${tableId}?${params}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }, cache: "no-store" });
  if (!res.ok) throw new Error(`Airtable ${res.status}`);
  return res.json();
}

export async function GET() {
  try {
    const tenant = await getTenant();
    const params = new URLSearchParams();
    const fields = [
      "House Name", "Owner", "Email", "Secondary Email",
      "Preferred Currency", "Status",
      "PM Fee (USD)", "PM Fee (MXN)",
      "Landscaping Fee (USD)", "Landscaping Fee (MXN)",
      "Pool Monthly Fee (USD)", "Pool Monthly Fee (MXN)",
      "HSK Fixed Fee", "Included Cleans",
      "Housekeeping Fee USD", "Housekeeping Fee MXN",
      "Houseman Fee USD", "Houseman Fee MXN",
      "Setup Notes",
    ];
    fields.forEach(f => params.append("fields[]", f));
    params.set("pageSize", "50");
    const data = await airtableGet(tenant.baseId, tenant.tables.properties, params);

    const properties = data.records.map((rec: any) => {
      const f = rec.fields;
      const statusRaw = f["Status"];
      const status = typeof statusRaw === "string" ? statusRaw : statusRaw?.name || "";
      const currRaw = f["Preferred Currency"];
      const currency = typeof currRaw === "string" ? currRaw : currRaw?.name || "";
      const cadenceRaw = f["HSK Fixed Fee"];
      const cadence = typeof cadenceRaw === "string" ? cadenceRaw : cadenceRaw?.name || "None";

      return {
        id: rec.id,
        name: f["House Name"] || "",
        owner: f["Owner"] || "",
        email: f["Email"] || "",
        secondaryEmail: f["Secondary Email"] || "",
        currency,
        status,
        pmFeeUSD: f["PM Fee (USD)"] || 0,
        pmFeeMXN: f["PM Fee (MXN)"] || 0,
        landscapingFeeUSD: f["Landscaping Fee (USD)"] || 0,
        landscapingFeeMXN: f["Landscaping Fee (MXN)"] || 0,
        poolFeeUSD: f["Pool Monthly Fee (USD)"] || 0,
        poolFeeMXN: f["Pool Monthly Fee (MXN)"] || 0,
        hskCadence: cadence,
        includedCleans: f["Included Cleans"] || 0,
        hskFeeUSD: f["Housekeeping Fee USD"] || 0,
        hskFeeMXN: f["Housekeeping Fee MXN"] || 0,
        housemanFeeUSD: f["Houseman Fee USD"] || 0,
        housemanFeeMXN: f["Houseman Fee MXN"] || 0,
        setupNotes: f["Setup Notes"] || "",
      };
    });

    // Sort: Active first, then alphabetical
    const statusOrder: Record<string, number> = { Active: 0, "In progress": 1, Inactive: 2, Rental: 3 };
    properties.sort((a: any, b: any) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9) || a.name.localeCompare(b.name));

    return NextResponse.json({ properties });
  } catch (error) {
    console.error("Properties error:", error);
    return NextResponse.json({ error: "Failed to fetch properties" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const tenant = await getTenant();
    const body = await request.json();
    const { recordId, fields } = body;

    if (!recordId || !fields) {
      return NextResponse.json({ error: "Missing recordId or fields" }, { status: 400 });
    }

    // Map friendly field names to Airtable field names
    const fieldMap: Record<string, string> = {
      owner: "Owner",
      email: "Email",
      secondaryEmail: "Secondary Email",
      currency: "Preferred Currency",
      pmFeeUSD: "PM Fee (USD)",
      pmFeeMXN: "PM Fee (MXN)",
      landscapingFeeUSD: "Landscaping Fee (USD)",
      landscapingFeeMXN: "Landscaping Fee (MXN)",
      poolFeeUSD: "Pool Monthly Fee (USD)",
      poolFeeMXN: "Pool Monthly Fee (MXN)",
      includedCleans: "Included Cleans",
      hskFeeUSD: "Housekeeping Fee USD",
      hskFeeMXN: "Housekeeping Fee MXN",
      housemanFeeUSD: "Houseman Fee USD",
      housemanFeeMXN: "Houseman Fee MXN",
      setupNotes: "Setup Notes",
    };

    const airtableFields: Record<string, any> = {};
    for (const [key, value] of Object.entries(fields)) {
      const airtableName = fieldMap[key];
      if (airtableName) {
        airtableFields[airtableName] = typeof value === "string" && !isNaN(Number(value)) && key !== "owner" && key !== "email" && key !== "secondaryEmail"
          ? Number(value)
          : value;
      }
    }

    const res = await fetch(`https://api.airtable.com/v0/${tenant.baseId}/${tenant.tables.properties}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ records: [{ id: recordId, fields: airtableFields }] }),
    });

    if (!res.ok) {
      const errData = await res.json();
      console.error("Airtable update error:", errData);
      return NextResponse.json({ error: "Failed to update property" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Properties update error:", error);
    return NextResponse.json({ error: "Failed to update property" }, { status: 500 });
  }
}


export async function POST(request: Request) {
  try {
    const tenant = await getTenant();
    const body = await request.json();
    const { name, owner, email, currency } = body;

    if (!name || !owner) {
      return NextResponse.json({ error: "Missing required fields: name, owner" }, { status: 400 });
    }

    const fields: Record<string, any> = {
      "House Name": name,
      "Owner": owner,
      "Status": "Active",
    };
    if (email) fields["Email"] = email;
    if (currency) fields["Preferred Currency"] = currency;

    const res = await fetch(`https://api.airtable.com/v0/${tenant.baseId}/${tenant.tables.properties}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ records: [{ fields }], typecast: true }),
    });

    if (!res.ok) {
      const errData = await res.json();
      console.error("Airtable create error:", errData);
      return NextResponse.json({ error: "Failed to create property" }, { status: 500 });
    }

    const data = await res.json();
    return NextResponse.json({ success: true, record: data.records[0] });
  } catch (error) {
    console.error("Create property error:", error);
    return NextResponse.json({ error: "Failed to create property" }, { status: 500 });
  }
}