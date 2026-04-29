import { currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { TENANTS, DEFAULT_TENANT_SLUG, type TenantConfig } from "./tenants";

export const TENANT_OVERRIDE_COOKIE = "tenant_override";

// Resolves the tenant for the currently authenticated request.
// Reads Clerk publicMetadata.tenant; falls back to the demo tenant.
// Throws if the slug is present but not registered — prevents silent cross-tenant reads.
//
// system_admin users can override their tenant by setting the `tenant_override`
// cookie via /api/tenant-override. The role check happens server-side, so a
// regular admin/owner can't escalate by setting the cookie themselves.
export async function getTenant(): Promise<TenantConfig> {
  const user = await currentUser();
  const meta = user?.publicMetadata as { tenant?: string; role?: string } | undefined;

  let slug = meta?.tenant || DEFAULT_TENANT_SLUG;

  if (meta?.role === "system_admin") {
    const override = (await cookies()).get(TENANT_OVERRIDE_COOKIE)?.value;
    if (override && TENANTS[override]) {
      slug = override;
    }
  }

  const tenant = TENANTS[slug];
  if (!tenant) {
    throw new Error(
      `Unknown tenant "${slug}" — add it to lib/tenants.ts or fix the user's publicMetadata.tenant`
    );
  }
  return tenant;
}
