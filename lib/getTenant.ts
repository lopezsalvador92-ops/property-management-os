import { currentUser } from "@clerk/nextjs/server";
import { TENANTS, DEFAULT_TENANT_SLUG, type TenantConfig } from "./tenants";

// Resolves the tenant for the currently authenticated request.
// Reads Clerk publicMetadata.tenant; falls back to the demo tenant.
// Throws if the slug is present but not registered — prevents silent cross-tenant reads.
export async function getTenant(): Promise<TenantConfig> {
  const user = await currentUser();
  const slug =
    (user?.publicMetadata as { tenant?: string } | undefined)?.tenant ||
    DEFAULT_TENANT_SLUG;

  const tenant = TENANTS[slug];
  if (!tenant) {
    throw new Error(
      `Unknown tenant "${slug}" — add it to lib/tenants.ts or fix the user's publicMetadata.tenant`
    );
  }
  return tenant;
}
