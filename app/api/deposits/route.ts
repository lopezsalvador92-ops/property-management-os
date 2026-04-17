import { NextResponse } from "next/server";

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;
const DEPOSITS_TABLE = process.env.AIRTABLE_TABLE_DEPOSITS!;
const PROPERTIES_TABLE = process.env.AIRTABLE_TABLE_PROPERTIES!;

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
    // Step 1: Fetch all properties to build ID → name map
    const propParams = new URLSearchParams();
    propParams.append("fields[]", "House Name");
    propParams.append("fields[]", "Owner");
    propParams.append("fields[]", "Preferred Currency");
    propParams.set("pageSize", "50");

    const propData = await airtableGet(PROPERTIES_TABLE, propParams);
    const propMap = new Map<string, { name: string; owner: string; currency: string }>();
    for (const rec of propData.records) {
      propMap.set(rec.id, {
        name: rec.fields["House Name"] || "",
        owner: rec.fields["Owner"] || "",
        currency: rec.fields["Preferred Currency"]?.name || rec.fields["Preferred Currency"] || "",
      });
    }

    // Step 2: Fetch deposits
    const depParams = new URLSearchParams();
    depParams.append("fields[]", "Date");
    depParams.append("fields[]", "House Name");
    depParams.append("fields[]", "Owner");
    depParams.append("fields[]", "Preferred Currency");
    depParams.append("fields[]", "Amount");
    depParams.append("fields[]", "Notes");
    depParams.append("fields[]", "Deposit Month and Year");
    depParams.set("pageSize", "100");
    depParams.set("sort[0][field]", "Date");
    depParams.set("sort[0][direction]", "desc");

    const depData = await airtableGet(DEPOSITS_TABLE, depParams);

    const deposits = depData.records.map((record: any) => {
      // House Name is a multipleRecordLinks field
      // REST API returns: ["recXYZ"] (array of ID strings)
      const houseField = record.fields["House Name"];
      let houseName = "";
      let houseId = "";
      let ownerFromProp = "";
      let currencyFromProp = "";

      if (Array.isArray(houseField) && houseField.length > 0) {
        // Could be string ID or object {id, name}
        const first = houseField[0];
        const linkedId = typeof first === "string" ? first : first?.id || "";
        houseId = linkedId;

        const prop = propMap.get(linkedId);
        if (prop) {
          houseName = prop.name;
          ownerFromProp = prop.owner;
          currencyFromProp = prop.currency;
        } else {
          // Fallback: if API returned {id, name} object
          houseName = first?.name || linkedId;
        }
      }

      // Owner lookup field
      const ownerField = record.fields["Owner"];
      let owner = ownerFromProp;
      if (!owner && ownerField) {
        if (typeof ownerField === "string") {
          owner = ownerField;
        } else if (Array.isArray(ownerField)) {
          owner = ownerField[0] || "";
        } else if (ownerField?.linkedRecordIds) {
          // MCP-style lookup response
          const firstId = ownerField.linkedRecordIds[0];
          if (firstId && ownerField.valuesByLinkedRecordId?.[firstId]) {
            const val = ownerField.valuesByLinkedRecordId[firstId];
            owner = Array.isArray(val) ? val[0] : val;
          }
        }
      }

      // Currency
      const currField = record.fields["Preferred Currency"];
      let currency = currencyFromProp;
      if (!currency && currField) {
        if (typeof currField === "string") {
          currency = currField;
        } else if (Array.isArray(currField)) {
          const f = currField[0];
          currency = typeof f === "string" ? f : f?.name || "";
        } else if (currField?.linkedRecordIds) {
          const firstId = currField.linkedRecordIds[0];
          if (firstId && currField.valuesByLinkedRecordId?.[firstId]) {
            const val = currField.valuesByLinkedRecordId[firstId];
            const item = Array.isArray(val) ? val[0] : val;
            currency = typeof item === "string" ? item : item?.name || "";
          }
        }
      }

      return {
        id: record.id,
        date: record.fields["Date"] || "",
        house: houseName,
        houseId: houseId,
        owner: typeof owner === "string" ? owner : "",
        currency: currency || "USD",
        amount: record.fields["Amount"] || 0,
        notes: record.fields["Notes"] || "",
        month: record.fields["Deposit Month and Year"] || "",
      };
    });

    return NextResponse.json({ deposits });
  } catch (error) {
    console.error("Deposits error:", error);
    return NextResponse.json({ error: "Failed to fetch deposits" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, houseId, amount, date, notes } = body;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const fields: Record<string, any> = {};
    if (houseId !== undefined) fields["House Name"] = [houseId];
    if (amount !== undefined && amount !== "") fields["Amount"] = parseFloat(amount);
    if (date !== undefined) fields["Date"] = date;
    if (notes !== undefined) fields["Notes"] = notes;

    const res = await fetch(
      `https://api.airtable.com/v0/${BASE_ID}/${DEPOSITS_TABLE}`,
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
      console.error("Airtable patch error:", errData);
      return NextResponse.json({ error: "Failed to update deposit" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update deposit error:", error);
    return NextResponse.json({ error: "Failed to update deposit" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const res = await fetch(
      `https://api.airtable.com/v0/${BASE_ID}/${DEPOSITS_TABLE}/${id}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
      }
    );
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error("Airtable delete error:", errData);
      return NextResponse.json({ error: "Failed to delete deposit" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete deposit error:", error);
    return NextResponse.json({ error: "Failed to delete deposit" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { houseId, amount, date, notes } = body;

    if (!houseId || !amount || !date) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const res = await fetch(
      `https://api.airtable.com/v0/${BASE_ID}/${DEPOSITS_TABLE}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${AIRTABLE_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          records: [{
            fields: {
              "House Name": [houseId],
              Amount: parseFloat(amount),
              Date: date,
              Notes: notes || "",
            },
          }],
        }),
      }
    );

    if (!res.ok) {
      const errData = await res.json();
      console.error("Airtable create error:", errData);
      return NextResponse.json({ error: "Failed to create deposit" }, { status: 500 });
    }

    const data = await res.json();
    return NextResponse.json({ success: true, record: data.records[0] });
  } catch (error) {
    console.error("Create deposit error:", error);
    return NextResponse.json({ error: "Failed to create deposit" }, { status: 500 });
  }
}