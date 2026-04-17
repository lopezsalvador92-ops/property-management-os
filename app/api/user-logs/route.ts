import { NextResponse } from "next/server";
import { getTenant } from "@/lib/getTenant";

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN!;

export async function GET() {
  try {
    const tenant = await getTenant();
    const params = new URLSearchParams();
    [
      "Summary",
      "Timestamp",
      "Actor Email",
      "Actor Role",
      "Action",
      "Target Email",
      "Target Role",
      "Details",
    ].forEach((f) => params.append("fields[]", f));
    params.set("sort[0][field]", "Timestamp");
    params.set("sort[0][direction]", "desc");
    params.set("pageSize", "100");

    const res = await fetch(
      `https://api.airtable.com/v0/${tenant.baseId}/${tenant.tables.activityLogs}?${params}`,
      {
        headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
        cache: "no-store",
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Airtable ${res.status}`);
    }
    const data = await res.json();

    const logs = (data.records || [])
      .map((r: any) => ({
        id: r.id,
        summary: r.fields["Summary"] || "",
        timestamp: r.fields["Timestamp"] || "",
        actorEmail: r.fields["Actor Email"] || "",
        actorRole: r.fields["Actor Role"] || "",
        action: r.fields["Action"] || "",
        targetEmail: r.fields["Target Email"] || "",
        targetRole: r.fields["Target Role"] || "",
        details: r.fields["Details"] || "",
      }))
      // Hide any entry where actor or target is system_admin.
      .filter(
        (l: any) => l.actorRole !== "system_admin" && l.targetRole !== "system_admin"
      );

    return NextResponse.json({ logs });
  } catch (error: any) {
    console.error("user-logs GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
