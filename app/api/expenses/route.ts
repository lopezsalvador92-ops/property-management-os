import { NextResponse } from "next/server";
import { airtableFetch, TABLES } from "@/lib/airtable";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const house = searchParams.get("house");
    const sortField = searchParams.get("sortField") || "Date";
    const sortDir = searchParams.get("sortDir") || "desc";

    const options: any = {
      fields: [
        "Receipt No",
        "Date",
        "Expense Category",
        "Supplier",
        "House Name",
        "Total",
        "Currency",
        "Total Amount (USD)",
        "Description",
        "Receipt URL",
        "Owner",
        "Preferred Currency",
      ],
      pageSize: 100,
      sort: [{ field: sortField, direction: sortDir as "asc" | "desc" }],
    };

    if (house && house !== "all") {
      options.filterFormula = `FIND("${house}", {House Name})`;
    }

    const data = await airtableFetch(TABLES.expenses, options);

    const expenses = data.records.map((record: any) => ({
      id: record.id,
      receiptNo: record.fields["Receipt No"] || "",
      date: record.fields["Date"] || "",
      category: record.fields["Expense Category"]?.name || record.fields["Expense Category"] || "",
      supplier: record.fields["Supplier"] || "",
      house: Array.isArray(record.fields["House Name"])
        ? record.fields["House Name"][0]
        : record.fields["House Name"] || "",
      total: record.fields["Total"] || 0,
      currency: record.fields["Currency"]?.name || record.fields["Currency"] || "",
      totalUSD: record.fields["Total Amount (USD)"] || null,
      description: record.fields["Description"] || "",
      receiptUrl: record.fields["Receipt URL"] || "",
      owner: Array.isArray(record.fields["Owner"])
        ? record.fields["Owner"][0]
        : record.fields["Owner"] || "",
      preferredCurrency: Array.isArray(record.fields["Preferred Currency"])
        ? record.fields["Preferred Currency"][0]
        : record.fields["Preferred Currency"] || "",
    }));

    return NextResponse.json({ expenses });
  } catch (error) {
    console.error("Airtable error:", error);
    return NextResponse.json(
      { error: "Failed to fetch expenses" },
      { status: 500 }
    );
  }
}