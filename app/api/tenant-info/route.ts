import { NextResponse } from "next/server";
import { getTenant } from "@/lib/getTenant";

export async function GET() {
  try {
    const tenant = await getTenant();
    return NextResponse.json({
      slug: tenant.slug,
      displayName: tenant.displayName,
      fxMode: tenant.fxMode,
      autoApproveExpenses: !!tenant.autoApproveExpenses,
    });
  } catch (error) {
    console.error("Tenant info error:", error);
    return NextResponse.json({ error: "Failed to load tenant info" }, { status: 500 });
  }
}
