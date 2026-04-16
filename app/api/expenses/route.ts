import { NextResponse } from "next/server";

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;
const EXPENSES_TABLE = "tblHeiBjXhsKW9Opj";
const PROPERTIES_TABLE = "tblCTRtMtVNv0F63W";

async function airtableGet(tableId: string, params: URLSearchParams) {
  const url = `https://api.airtable.com/v0/${BASE_ID}/${tableId}?${params}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }, cache: "no-store" });
  if (!res.ok) throw new Error(`Airtable ${res.status}`);
  return res.json();
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const house = searchParams.get("house") || "";
    const month = searchParams.get("month") || "";

    const params = new URLSearchParams();
    params.append("fields[]", "Receipt No");
    params.append("fields[]", "Description");
    params.append("fields[]", "Total");
    params.append("fields[]", "Total Amount (USD)");
    params.append("fields[]", "Expense Category");
    params.append("fields[]", "Date");
    params.append("fields[]", "Receipt URL");
    params.append("fields[]", "House Name");
    params.append("fields[]", "House");
    params.append("fields[]", "Supplier");
    params.append("fields[]", "Currency");
    params.set("sort[0][field]", "Date");
    params.set("sort[0][direction]", "desc");
    params.set("pageSize", "100");

    if (house && month && month !== "all") {
      params.set("filterByFormula", `AND(FIND("${house}", ARRAYJOIN({House Name}, ",")), {Month and Year}="${month}")`);
    } else if (house) {
      params.set("filterByFormula", `FIND("${house}", ARRAYJOIN({House Name}, ","))`);
    }

    const data = await airtableGet(EXPENSES_TABLE, params);

    const expenses = data.records.map((r: any) => {
      const f = r.fields;
      const catRaw = f["Expense Category"];
      const curRaw = f["Currency"];
      return {
        id: r.id,
        receiptNo: f["Receipt No"] || "",
        description: f["Description"] || "",
        total: f["Total"] || 0,
        amountUSD: f["Total Amount (USD)"] || 0,
        amount: f["Total"] || 0,
        category: typeof catRaw === "string" ? catRaw : catRaw?.name || "",
        currency: typeof curRaw === "string" ? curRaw : curRaw?.name || "",
        date: f["Date"] || "",
        receiptUrl: f["Receipt URL"] || "",
        house: Array.isArray(f["House Name"]) ? f["House Name"].join(", ") : f["House Name"] || "",
        houseId: (f["House"] || [])[0] || "",
        supplier: f["Supplier"] || "",
      };
    });

    return NextResponse.json({ expenses });
  } catch (error) {
    console.error("Expenses error:", error);
    return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { propertyId, date, category, amount, currency, description, supplier, receiptUrl, rentalId } = body;

    if (!propertyId || !date || !category || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const fields: Record<string, any> = {
      "House": [propertyId],
      "Date": date,
      "Expense Category": category,
      "Total": parseFloat(amount),
      "Currency": currency || "MXN",
    };
    if (description) fields["Description"] = description;
    if (supplier) fields["Supplier"] = supplier;
    if (receiptUrl) fields["Receipt URL"] = receiptUrl;
    if (rentalId) fields["Guest Rentals"] = [rentalId];

    const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${EXPENSES_TABLE}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ records: [{ fields }], typecast: true }),
    });

    if (!res.ok) {
      const errData = await res.json();
      console.error("Airtable create expense error:", errData);
      return NextResponse.json({ error: "Failed to create expense" }, { status: 500 });
    }

    const data = await res.json();
    return NextResponse.json({ success: true, record: data.records[0] });
  } catch (error) {
    console.error("Create expense error:", error);
    return NextResponse.json({ error: "Failed to create expense" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, date, category, amount, currency, description, supplier, propertyId } = body;
    if (!id) return NextResponse.json({ error: "Missing record id" }, { status: 400 });

    const fields: Record<string, any> = {};
    if (date) fields["Date"] = date;
    if (category) fields["Expense Category"] = category;
    if (amount !== undefined) fields["Total"] = parseFloat(amount);
    if (currency) fields["Currency"] = currency;
    if (description !== undefined) fields["Description"] = description;
    if (supplier !== undefined) fields["Supplier"] = supplier;
    if (propertyId) fields["House"] = [propertyId];

    const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${EXPENSES_TABLE}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ records: [{ id, fields }], typecast: true }),
    });

    if (!res.ok) {
      const errData = await res.json();
      console.error("Airtable update expense error:", errData);
      return NextResponse.json({ error: "Failed to update expense" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update expense error:", error);
    return NextResponse.json({ error: "Failed to update expense" }, { status: 500 });
  }
}