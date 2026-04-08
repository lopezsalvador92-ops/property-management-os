import { NextResponse } from "next/server";

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;
const HELP_TABLE = "tbliXqbGd7o02HnMY";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const audience = url.searchParams.get("audience") || "both";

    const params = new URLSearchParams();
    ["Title", "Slug", "Audience", "Category", "Body", "Order", "Published"].forEach(f => params.append("fields[]", f));
    params.set("sort[0][field]", "Order");
    params.set("sort[0][direction]", "asc");
    params.set("pageSize", "100");

    const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${HELP_TABLE}?${params}`, {
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
      cache: "no-store",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Airtable ${res.status}`);
    }
    const data = await res.json();

    const articles = (data.records || [])
      .map((r: any) => ({
        id: r.id,
        title: r.fields["Title"] || "",
        slug: r.fields["Slug"] || "",
        audience: r.fields["Audience"] || "both",
        category: r.fields["Category"] || "Getting Started",
        body: r.fields["Body"] || "",
        order: r.fields["Order"] || 0,
        published: r.fields["Published"] || false,
      }))
      .filter((a: any) => a.published)
      .filter((a: any) => audience === "both" ? true : (a.audience === audience || a.audience === "both"));

    return NextResponse.json({ articles });
  } catch (error: any) {
    console.error("Help GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
