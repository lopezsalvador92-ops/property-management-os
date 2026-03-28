import { NextResponse } from "next/server";
import { airtableFetch, TABLES } from "@/lib/airtable";

export async function GET() {
  try {
    const data = await airtableFetch(TABLES.properties, {
      fields: [
        "House Name",
        "Owner",
        "Status",
        "Preferred Currency",
        "PM Fee (USD)",
        "PM Fee (MXN)",
      ],
      pageSize: 50,
    });

    const properties = data.records.map((record: any) => ({
      id: record.id,
      name: record.fields["House Name"] || "",
      owner: record.fields["Owner"] || "",
      status: record.fields["Status"]?.name || record.fields["Status"] || "",
      currency: record.fields["Preferred Currency"]?.name || record.fields["Preferred Currency"] || "",
      pmFee: record.fields["PM Fee (USD)"] || record.fields["PM Fee (MXN)"] || 0,
    }));

    return NextResponse.json({ properties });
  } catch (error) {
    console.error("Airtable error:", error);
    return NextResponse.json(
      { error: "Failed to fetch properties" },
      { status: 500 }
    );
  }
}