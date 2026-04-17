import { NextResponse } from "next/server";
import { getTenant } from "@/lib/getTenant";

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN!;

async function airtableGet(baseId: string, rolesTable: string, params: URLSearchParams) {
  const url = `https://api.airtable.com/v0/${baseId}/${rolesTable}?${params}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }, cache: "no-store" });
  if (!res.ok) throw new Error(`Airtable ${res.status}`);
  return res.json();
}

export async function GET() {
  try {
    const tenant = await getTenant();
    const params = new URLSearchParams();
    params.append("fields[]", "Role ID");
    params.append("fields[]", "Display Name");
    params.append("fields[]", "Modules");
    params.append("fields[]", "Active");
    params.set("pageSize", "20");
    const data = await airtableGet(tenant.baseId, tenant.tables.roles, params);

    const roles = data.records.map((r: any) => {
      let modules: string[] = [];
      try {
        modules = JSON.parse(r.fields["Modules"] || "[]");
      } catch { modules = []; }
      return {
        id: r.id,
        roleId: r.fields["Role ID"] || "",
        displayName: r.fields["Display Name"] || "",
        modules,
        active: r.fields["Active"] || false,
      };
    });

    return NextResponse.json({ roles });
  } catch (error) {
    console.error("Platform config error:", error);
    return NextResponse.json({ error: "Failed to fetch config" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const tenant = await getTenant();
    const body = await request.json();
    const { recordId, modules } = body;

    if (!recordId || !modules) {
      return NextResponse.json({ error: "Missing recordId or modules" }, { status: 400 });
    }

    const res = await fetch(`https://api.airtable.com/v0/${tenant.baseId}/${tenant.tables.roles}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        records: [{ id: recordId, fields: { "Modules": JSON.stringify(modules) } }],
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Platform config update error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
