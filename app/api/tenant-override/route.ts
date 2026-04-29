import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { currentUser } from "@clerk/nextjs/server";
import { TENANTS } from "@/lib/tenants";
import { TENANT_OVERRIDE_COOKIE } from "@/lib/getTenant";

async function requireSystemAdmin() {
  const user = await currentUser();
  const role = (user?.publicMetadata as { role?: string } | undefined)?.role;
  if (role !== "system_admin") return null;
  return user;
}

export async function GET() {
  const user = await requireSystemAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const homeSlug = (user.publicMetadata as { tenant?: string }).tenant || "demo";
  const override = (await cookies()).get(TENANT_OVERRIDE_COOKIE)?.value || null;
  const active = override && TENANTS[override] ? override : homeSlug;

  return NextResponse.json({
    active,
    homeSlug,
    override,
    tenants: Object.values(TENANTS).map(t => ({ slug: t.slug, displayName: t.displayName })),
  });
}

export async function POST(req: Request) {
  if (!(await requireSystemAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const slug = typeof body.slug === "string" ? body.slug : "";

  const jar = await cookies();
  if (!slug) {
    jar.delete(TENANT_OVERRIDE_COOKIE);
    return NextResponse.json({ ok: true, override: null });
  }

  if (!TENANTS[slug]) {
    return NextResponse.json({ error: `Unknown tenant "${slug}"` }, { status: 400 });
  }

  jar.set(TENANT_OVERRIDE_COOKIE, slug, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return NextResponse.json({ ok: true, override: slug });
}
