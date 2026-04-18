import { NextResponse } from "next/server";
import { getTenant } from "@/lib/getTenant";

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN!;

async function airtableGet(baseId: string, tableId: string, params: URLSearchParams) {
  const url = `https://api.airtable.com/v0/${baseId}/${tableId}?${params}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }, cache: "no-store" });
  if (!res.ok) throw new Error(`Airtable ${res.status}`);
  return res.json();
}

export async function GET(request: Request) {
  try {
    const tenant = await getTenant();
    const { searchParams } = new URL(request.url);
    const house = searchParams.get("house") || "";
    const month = searchParams.get("month") || "";
    // status: "Approved" (default, what reports/balances see), "Pending" (approval queue), "all"
    const status = searchParams.get("status") || "Approved";

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
    params.append("fields[]", "FX Rate");
    params.append("fields[]", "Hide Receipt from Owner");
    params.append("fields[]", "Approval Status");
    params.set("sort[0][field]", "Date");
    params.set("sort[0][direction]", "desc");
    params.set("pageSize", "100");

    // Status filter: treat blank/missing as Approved so legacy rows continue to surface.
    // "all" skips the status clause entirely.
    const statusClause =
      status === "all"
        ? ""
        : status === "Approved"
          ? `OR({Approval Status}="Approved", {Approval Status}="", NOT({Approval Status}))`
          : `{Approval Status}="${status}"`;

    const clauses: string[] = [];
    if (statusClause) clauses.push(statusClause);
    if (house) clauses.push(`FIND("${house}", ARRAYJOIN({House Name}, ","))`);
    if (house && month && month !== "all") clauses.push(`{Month and Year}="${month}"`);

    if (clauses.length === 1) params.set("filterByFormula", clauses[0]);
    else if (clauses.length > 1) params.set("filterByFormula", `AND(${clauses.join(",")})`);

    const data = await airtableGet(tenant.baseId, tenant.tables.expenses, params);

    const expenses = data.records.map((r: any) => {
      const f = r.fields;
      const catRaw = f["Expense Category"];
      const curRaw = f["Currency"];
      const statusRaw = f["Approval Status"];
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
        fxRate: f["FX Rate"] || 0,
        hideReceipt: !!f["Hide Receipt from Owner"],
        status: (typeof statusRaw === "string" ? statusRaw : statusRaw?.name) || "Approved",
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
    const tenant = await getTenant();
    const body = await request.json();
    const { propertyId, date, category, amount, currency, description, supplier, receiptUrl, rentalId, fxRate, hideReceipt, status } = body;

    if (!propertyId || !date || !category || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Tenant auto-approve override: if configured, force Approved even when caller requested Pending.
    let resolvedStatus: "Approved" | "Pending" = status === "Pending" ? "Pending" : "Approved";
    if (resolvedStatus === "Pending" && tenant.autoApproveExpenses) resolvedStatus = "Approved";

    const fields: Record<string, any> = {
      "House": [propertyId],
      "Date": date,
      "Expense Category": category,
      "Total": parseFloat(amount),
      "Currency": currency || "MXN",
      "Approval Status": resolvedStatus,
    };
    if (description) fields["Description"] = description;
    if (supplier) fields["Supplier"] = supplier;
    if (receiptUrl) fields["Receipt URL"] = receiptUrl;
    if (rentalId) fields["Guest Rentals"] = [rentalId];
    if (fxRate !== undefined && fxRate !== null && fxRate !== "") {
      const rate = parseFloat(fxRate);
      if (isFinite(rate) && rate > 0) fields["FX Rate"] = rate;
    }
    if (hideReceipt) fields["Hide Receipt from Owner"] = true;

    const res = await fetch(`https://api.airtable.com/v0/${tenant.baseId}/${tenant.tables.expenses}`, {
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
    const tenant = await getTenant();
    const body = await request.json();
    const { id, date, category, amount, currency, description, supplier, propertyId, fxRate, hideReceipt, status } = body;
    if (!id) return NextResponse.json({ error: "Missing record id" }, { status: 400 });

    const fields: Record<string, any> = {};
    if (date) fields["Date"] = date;
    if (category) fields["Expense Category"] = category;
    if (amount !== undefined) fields["Total"] = parseFloat(amount);
    if (currency) fields["Currency"] = currency;
    if (description !== undefined) fields["Description"] = description;
    if (supplier !== undefined) fields["Supplier"] = supplier;
    if (propertyId) fields["House"] = [propertyId];
    if (status === "Approved" || status === "Pending" || status === "Rejected") fields["Approval Status"] = status;
    if (fxRate !== undefined) {
      if (fxRate === null || fxRate === "") {
        fields["FX Rate"] = null;
      } else {
        const rate = parseFloat(fxRate);
        if (isFinite(rate) && rate > 0) fields["FX Rate"] = rate;
      }
    }
    if (hideReceipt !== undefined) fields["Hide Receipt from Owner"] = !!hideReceipt;

    const res = await fetch(`https://api.airtable.com/v0/${tenant.baseId}/${tenant.tables.expenses}`, {
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

export async function DELETE(request: Request) {
  try {
    const tenant = await getTenant();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const res = await fetch(`https://api.airtable.com/v0/${tenant.baseId}/${tenant.tables.expenses}/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
    });
    if (!res.ok) return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete expense error:", error);
    return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 });
  }
}
