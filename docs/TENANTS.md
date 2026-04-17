# Tenant Onboarding

How to add a new customer to the multi-tenant platform.

## Architecture (why this works)

- **`lib/tenants.ts`** — registry. One entry per customer with their Airtable base ID + table IDs.
- **`lib/getTenant.ts`** — at request time, reads `publicMetadata.tenant` off the logged-in Clerk user and returns that tenant's config. Falls back to `demo`.
- **API routes** — call `getTenant()` instead of reading `process.env.AIRTABLE_BASE_ID`. Everything else stays the same.

Each tenant has its own Airtable base. There is no shared data between tenants. Cross-tenant leaks are not possible unless a route forgets to call `getTenant()` — that's the only invariant to protect.

## Manual onboarding (today)

Time: ~20 minutes per customer, mostly waiting on Airtable base duplication.

### 1. Clone the Airtable base

In Airtable, duplicate the demo base (`app5CCSFpoc3Sgjv6`). Airtable assigns a new base ID like `appXXXXXXXXXXXXXX`. Open each table and copy its table ID from the URL (`tblXXXXXXXXXXXXXX`).

### 2. Add the tenant to `lib/tenants.ts`

Open [lib/tenants.ts](../lib/tenants.ts). There's a commented-out `tenant2` block — copy it, rename the const, fill in real IDs, and register it in the `TENANTS` object. Example:

```ts
const acmevillas: TenantConfig = {
  slug: "acmevillas",
  displayName: "Acme Villas",
  baseId: "appAAAAAAAAAAAAAA",
  tables: {
    properties: "tblPPPPPPPPPPPPPP",
    expenses:   "tblEEEEEEEEEEEEEE",
    deposits:   "tblDDDDDDDDDDDDDD",
    // ...all 15 tables
  },
};

export const TENANTS: Record<string, TenantConfig> = {
  demo,
  acmevillas,
};
```

Commit, push, Vercel redeploys.

### 3. Set up Clerk users

For each user this customer needs:

1. Clerk dashboard → Users → Create user with their email.
2. Edit **Public metadata** JSON:
   ```json
   {
     "role": "admin",
     "tenant": "acmevillas"
   }
   ```
3. For owner users, also add `"linkedProperty": "recXXXXXXX"` (the property record ID from their Airtable base).

The `tenant` value must match a slug in `lib/tenants.ts` exactly. If it doesn't, the app throws a loud error — not a silent leak.

### 4. Seed their Platform Roles table

The new tenant's cloned base has its own `Platform Roles` table. Review the `Modules` JSON arrays per role — the defaults carry over from the demo clone, which is usually fine. If the customer has different module entitlements, edit them there.

### 5. Smoke test

Sign in as one of their users. Confirm the admin/owner portal loads their data (not the demo data). Check expenses, properties, and reports each return records from the right base.

## Automating this (Phase 2)

The manual process is fine for 2–5 customers. Past that, automate in this order:

**Level 1 — Script-assisted base clone** (~1 day of work)
A `scripts/onboard-tenant.ts` script that:
- Takes a slug, display name, and source base ID as args.
- Uses the Airtable Meta API to clone the base and read back all table IDs.
- Appends a new entry to `lib/tenants.ts` via AST edit (not regex — TS files are fragile).
- Opens a PR with the change.

Saves the "copy 15 table IDs by hand" step. The user still manually creates Clerk users.

**Level 2 — Tenants Airtable control base** (~2 days)
Move the `TENANTS` registry out of code and into a dedicated "Control" Airtable base with a `Tenants` table. `getTenant()` reads from there (cached 60s). Onboarding becomes: add a row in the Control base, done. No code changes, no deploy.

Downside: one more API call per request. Cache makes it ~free in practice.

**Level 3 — `/system` onboarding UI** (~3 days)
A form inside the System Admin page: enter customer name, click "Clone base," click "Create admin user." Writes to the Control base and Clerk in one flow. This is the end state — self-serve for Salvador, no engineer touch required.

**Level 4 — Supabase migration**
Once 3+ customers exist and Airtable's rate limits or row caps start hurting, migrate data to Postgres. The `getTenant()` abstraction means every API route keeps working unchanged — only the implementation inside `getTenant()` and the route bodies' data fetches need to switch from Airtable REST to Supabase client. Plan for this around Phase 2/3 pricing ($75–85/property).

## Gotchas

- **New API routes must call `getTenant()`.** Forgetting to means that route always reads the demo base. A lint rule or a code-review checklist item would catch this — for now, just remember it.
- **Clerk JWT template:** `currentUser()` fetches from the Clerk API on every request. If latency becomes a problem, configure a JWT template in Clerk that includes `publicMetadata` in session claims, and switch `getTenant()` to read from `auth().sessionClaims`. Avoids the extra API call.
- **The `demo` fallback is deliberate.** Users without a tenant assignment (old users, misconfigured users) see the demo base rather than crashing. If you ever want this to hard-fail instead, remove `DEFAULT_TENANT_SLUG` in `lib/getTenant.ts`.
- **Activity logs live per-tenant.** Each tenant's base has its own `Activity Logs` table. There is no cross-tenant audit log. If/when that matters, build it into the Control base.
