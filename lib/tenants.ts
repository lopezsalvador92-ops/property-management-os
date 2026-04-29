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
  // When true, scanned/submitted expenses skip the approval queue and land as Approved.
  // Use for single-operator tenants (e.g. one owner managing their own house) where
  // review would be pointless. Default false — all scanned receipts await approval.
  autoApproveExpenses?: boolean;
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
    sections: string;
    assets: string;
    inventory: string;
  };
};

// Demo tenant reads from existing env vars so nothing breaks during migration.
// This is also the default fallback for any user without a tenant assigned.
const demo: TenantConfig = {
  slug: "demo",
  displayName: "Demo (Axvia)",
  baseId: process.env.AIRTABLE_BASE_ID!,
  fxMode: "per-expense",
  autoApproveExpenses: false,
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
    sections: process.env.AIRTABLE_TABLE_SECTIONS!,
    assets: process.env.AIRTABLE_TABLE_ASSETS!,
    inventory: process.env.AIRTABLE_TABLE_INVENTORY!,
  },
};

const signature: TenantConfig = {
  slug: "signature",
  displayName: "Signature PM Cabo",
  baseId: "appCEQ4qXfOOgzFj9",
  fxMode: "per-expense",
  autoApproveExpenses: false,
  tables: {
    properties: "tblCTRtMtVNv0F63W",
    expenses: "tblHeiBjXhsKW9Opj",
    deposits: "tblVrgidgJKKfdFQ2",
    monthlyReports: "tblBei4KzIMDMT87X",
    housekeeping: "tblG8udG0Wdo6Wms6",
    housekeepers: "tblHxw0Mqcs5X76cL",
    rentals: "tblAG4GqV5jCgAC7x",
    roles: "tblsc0oGX6dygiY3U",
    visits: "tblJ1iEgHCeJy2CnR",
    vendors: "tblqm6eBgSSYcGcyl",
    itinerary: "tblppsIgEI1hrM3wR",
    maintenance: "tblC5Muegq8fVfuQf",
    maintenanceConfig: "tbl94Yp43rz6nLhLW",
    help: "tbliXqbGd7o02HnMY",
    activityLogs: "tblr0LqK8DMptTnDN",
    sections: "tbltEtTFDPxEVXQXj",
    assets: "tbl9GVSjmUT3Q2lem",
    inventory: "tblVrmAsEW9o4tcPR",
  },
};

export const TENANTS: Record<string, TenantConfig> = {
  demo,
  signature,
};

export const DEFAULT_TENANT_SLUG = "demo";
