// Tenant registry: maps a tenant slug to its Airtable config.
//
// A user's tenant is stored in Clerk publicMetadata.tenant and resolved at
// request time via lib/getTenant.ts. Users without a tenant fall back to "demo".
//
// To onboard a new customer:
//   1. Clone the demo Airtable base into their workspace.
//   2. Add an entry to TENANTS below (or set the env vars it reads from).
//   3. Set publicMetadata.tenant = "<slug>" on their Clerk users.

export type TenantConfig = {
  slug: string;
  displayName: string;
  baseId: string;
  // "monthly": single FX rate per monthly report, applied to all MXN expenses in that month.
  // "per-expense": each expense carries its own FX Rate; monthly report shows a blended rate for context.
  fxMode: "monthly" | "per-expense";
  tables: {
    properties: string;
    expenses: string;
    deposits: string;
    monthlyReports: string;
    housekeeping: string;
    housekeepers: string;
    rentals: string;
    roles: string;
    visits: string;
    vendors: string;
    itinerary: string;
    maintenance: string;
    maintenanceConfig: string;
    help: string;
    activityLogs: string;
  };
};

// Demo tenant reads from existing env vars so nothing breaks during migration.
// This is also the default fallback for any user without a tenant assigned.
const demo: TenantConfig = {
  slug: "demo",
  displayName: "Demo (Axvia)",
  baseId: process.env.AIRTABLE_BASE_ID!,
  fxMode: "per-expense",
  tables: {
    properties: process.env.AIRTABLE_TABLE_PROPERTIES!,
    expenses: process.env.AIRTABLE_TABLE_EXPENSES!,
    deposits: process.env.AIRTABLE_TABLE_DEPOSITS!,
    monthlyReports: process.env.AIRTABLE_TABLE_REPORTS!,
    housekeeping: process.env.AIRTABLE_TABLE_HOUSEKEEPING!,
    housekeepers: process.env.AIRTABLE_TABLE_HOUSEKEEPERS!,
    rentals: process.env.AIRTABLE_TABLE_RENTALS!,
    roles: process.env.AIRTABLE_TABLE_ROLES!,
    visits: process.env.AIRTABLE_TABLE_VISITS!,
    vendors: process.env.AIRTABLE_TABLE_VENDORS!,
    itinerary: process.env.AIRTABLE_TABLE_ITINERARY!,
    maintenance: process.env.AIRTABLE_TABLE_MAINTENANCE!,
    maintenanceConfig: process.env.AIRTABLE_TABLE_MAINTENANCE_CONFIG!,
    help: process.env.AIRTABLE_TABLE_HELP!,
    activityLogs: process.env.AIRTABLE_TABLE_ACTIVITY_LOGS!,
  },
};

// Placeholder for the second customer. Fill in once their Airtable base is cloned.
// Until all fields are populated, any request resolving to this tenant will error loudly
// (which is what we want — better than silently reading the demo base).
// const tenant2: TenantConfig = {
//   slug: "tenant2",
//   displayName: "TODO Rename",
//   baseId: "appTODO",
//   fxMode: "per-expense",
//   tables: {
//     properties: "tblTODO",
//     expenses: "tblTODO",
//     deposits: "tblTODO",
//     monthlyReports: "tblTODO",
//     housekeeping: "tblTODO",
//     housekeepers: "tblTODO",
//     rentals: "tblTODO",
//     roles: "tblTODO",
//     visits: "tblTODO",
//     vendors: "tblTODO",
//     itinerary: "tblTODO",
//     maintenance: "tblTODO",
//     maintenanceConfig: "tblTODO",
//     help: "tblTODO",
//     activityLogs: "tblTODO",
//   },
// };

export const TENANTS: Record<string, TenantConfig> = {
  demo,
  // tenant2,
};

export const DEFAULT_TENANT_SLUG = "demo";
