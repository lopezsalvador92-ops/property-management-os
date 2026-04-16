# Cape PM OS — Project Context

## Business
Salvador Lopez runs Axvia Solutions from Los Cabos, Mexico. This is a Property Management Operating System for Cape Property Management (Cape PM), managing 15 active luxury villas in Los Cabos. Pricing: current $35/property, targeting $55 (Phase 1), $75-85 (Phase 2/3). The real admin user is **Sofia** (not Ana). The owner of Cape PM is **Alan**.

## Tech Stack
- **Framework:** Next.js 16.2.1 (TypeScript, App Router)
- **Auth:** Clerk (dev keys, production deploy pending)
- **Database:** Airtable (all data reads/writes go through Airtable REST API)
- **Hosting:** Vercel (auto-deploys from main branch)
- **GitHub:** lopezsalvador92-ops/cape-pm-os

## Project Structure
```
cape-pm-os/
├── app/
│   ├── page.tsx                 ← Root: role-based redirect (admin/system_admin → /admin, owner → /owner)
│   ├── admin/page.tsx           ← Admin panel (~115KB, all 7 modules in one file)
│   ├── owner/page.tsx           ← Owner Portal (financials, statement-style expenses, YTD)
│   ├── system/page.tsx          ← System Admin settings (role/module toggles, only system_admin)
│   ├── sign-in/[[...sign-in]]/page.tsx  ← Clerk sign-in (dark theme, Cape PM logo)
│   ├── api/
│   │   ├── properties/route.ts
│   │   ├── properties-detail/route.ts   ← GET/PATCH/POST for property config
│   │   ├── expenses/route.ts            ← GET + POST (create expenses)
│   │   ├── deposits/route.ts            ← GET + POST
│   │   ├── balances/route.ts            ← GET with pagination
│   │   ├── reports/route.ts             ← GET + PATCH (status, charges, exchange rate)
│   │   ├── housekeeping/route.ts        ← GET + PATCH (approve/reject, weekly breakdown)
│   │   ├── owner/route.ts              ← GET owner data (all expenses + YTD)
│   │   ├── users/route.ts              ← Clerk REST API (GET/POST/PATCH/DELETE, filters out system_admin)
│   │   └── platform-config/route.ts    ← GET/PATCH role configs from Platform Roles table
│   ├── globals.css
│   └── layout.tsx
├── proxy.ts                     ← Clerk auth proxy (protects /admin, /owner, /system)
├── public/cape-logo.png
├── .env.local
└── package.json
```

## Airtable Base: Cape PM (appuSAGHCslHSwMsE)

### Tables & IDs
- **Expenses:** tblHeiBjXhsKW9Opj (2000+ records) — Fields: Description, Total, Total Amount (USD), Expense Category, Date, Receipt URL, House Name (lookup), Month and Year (formula), House (linked to Properties), Currency, Supplier
- **Properties:** tblCTRtMtVNv0F63W (22 records, 15 Active) — Fields: House Name, Owner, Email, Preferred Currency, Status, PM Fee USD/MXN, various fee fields, Included Cleans, HSK Fixed Fee
- **Deposits:** tblVrgidgJKKfdFQ2 — Fields: Date, House Name (linked), Amount, Notes, Deposit Month and Year
- **Monthly Reports:** tblBei4KzIMDMT87X (116 records) — Fields: Report Name, House Name (linked), Month and Year, Status, Starting Balance, Total Expenses MXN/USD, Total Deposits, Final Balance MXN/USD, Monthly Exchange Rate, category rollups
- **Housekeeping Log:** tblG8udG0Wdo6Wms6 — Fields: Housekeeper Name, Start of the Week, Mon-Sun Houses (formulas), Approval Status, Expenses Created?, Comments
- **Guest Rentals:** tblAG4GqV5jCgAC7x
- **Platform Roles:** tblsc0oGX6dygiY3U — Fields: Role ID, Display Name, Modules (JSON array), Active (checkbox)
- **Visits:** tblJ1iEgHCeJy2CnR — Fields: Visit Name, Guest Name, Visit Type, Check-in Date, Check-out Date, Status, Property (linked), Notes, Checklist
- **Vendors:** tblqm6eBgSSYcGcyl — Fields: Name, Category, Contact, Location, Tags, Notes
- **Itinerary Events:** tblppsIgEI1hrM3wR — Fields: Event Name, Visit (linked), Vendor (linked), Date, Time, Details, Status

### Expense Categories
Cleaning Supplies, Groceries, Maintenance, Miscellaneous, Utilities, Villa Staff, Others, Rental Expenses

### Key Airtable Patterns
- Linked record fields require `FIND("Name", ARRAYJOIN({Field}, ","))` not equality checks
- Balances API must paginate with offset tokens when records exceed 100
- Monthly reports must be sorted with a monthToSortKey function (e.g., "March 2026" → 202603) not alphabetically
- Preferred Currency field can be string or object with .name property — always handle both

## Auth System (Clerk)
- Clerk REST API at api.clerk.com/v1 preferred over SDK for server-side user management
- Roles stored in publicMetadata: system_admin, admin, owner, house_manager (future)
- system_admin users are hidden from the admin Users page
- proxy.ts protects /admin, /owner, /system routes
- Sign-in page has custom dark theme with OTP code field styling

## Completed Modules

### Admin Panel (7 modules)
1. **Dashboard** — Action cards: pending reports, negative balances, missing deposits, financial pulse per property
2. **Expenses** — Two tabs: "All Expenses" (table with filters) and "+ Add Expense" (form writes to Airtable)
3. **Deposits** — Record form + recent deposits list + account balances
4. **Reports** — Month selector, status cards, bulk actions, accordion preview, FX rate input, generate charges
5. **Housekeeping** — Individual Logs (weekly grid with property pills, approve/reject), Weekly Overview, Monthly Summary (table with per-week Included/Extra columns, alternating teal backgrounds)
6. **Properties** — Card grid, add property form, detail view with 4 tabs (Overview, Fee Config, HSK Config, Financial History)
7. **Users** — Clerk user management, add user form with role + linked property, Reset PW and Delete buttons

### Owner Portal
- Sidebar: Cape PM logo, property card, Home + Financials navigation, theme toggle, UserButton
- **Home:** Text header (no gradient), stat cards, recent activity feed
- **Financials:** Month selector with arrows, stat cards (Deposits, Total Charges, Exchange Rate for USD only, Final Balance), Account Summary card, statement-style expense list (individual line items chronologically with receipt links), deposits for month, category breakdown bar chart, YTD spending rollup, balance history

### System Admin (/system)
- Role & Module Configuration page
- Toggle switches per role/module
- Reads/writes to Platform Roles Airtable table
- Only accessible to system_admin role

### Features
- Light/dark theme toggle (light default) on admin and owner portal
- Cape PM logo in sidebar (replaced SVG)

## CRITICAL Dev Rules
- **NEVER use sed commands, Python terminal scripts, or find-and-replace instructions to patch files** — these have caused file corruption and wasted hours
- Always run `killall node` before `npm run dev` to avoid port conflicts
- `rm -rf .next` to clear cache when things get stuck
- Admin page is ~115KB single file — needs refactoring into components eventually
- Salvador uses the system Terminal app (not VS Code terminal) for git/npm commands
- Salvador is newer to Node.js/VS Code/Next.js — needs clear step-by-step instructions
- Uses Mac (MacBook Air), git email: salvador.lopez@axviasolutions.com
- Vercel auto-deploys from main branch

## Adding a New Module (always do this — nav gate is live)
Admin + owner pages filter `navItems` by `enabledModules` (see `app/admin/page.tsx` ~line 847 and 861). `enabledModules` is populated from the `Platform Roles` Airtable table (`tblsc0oGX6dygiY3U`) in the `fetch("/api/platform-config")` effect (~line 358). `system_admin` bypasses the check and sees everything, but every other role is strictly gated. **A new nav entry will be invisible to `admin`/`owner`/`house_manager` until its id is added to the role's `Modules` JSON array.**

Checklist when adding a top-level module (admin or owner):
1. Add the `{ id, icon, label }` entry to `navItems` in the relevant page.
2. Add the module's rendering branch: `{activePage === "<id>" && (...)}`.
3. Add the new `id` to the "PLACEHOLDER" guard in `app/admin/page.tsx` (currently ~line 5178). It's a long `activePage !== "..."` chain that renders a "Coming soon" stub for unknown pages. Miss this and the stub renders underneath the real module.
4. Add the module to the hardcoded list in `app/system/page.tsx` — `ALL_ADMIN_MODULES` for admin-panel modules, `ALL_OWNER_MODULES` for owner-portal modules. Without this the toggle won't render in /system.
5. Update the `Modules` JSON array on each role in the `Platform Roles` Airtable table that should see it:
   - `admin` (`recMBstawdoWHxA4y`) — for admin-panel modules
   - `system_admin` (`recmAuKRfuo2QviF8`) — mirror for consistency
   - `owner` (`recBSSvG1qU9FIms9`) — for owner-portal modules
   - `house_manager` (`rec1PPXoZyyyf5843`) — if scoped to them
6. Preferred: use the Airtable MCP `update_records_for_table` (field id `fldIF3Xg877ArAVl6`). Salvador can also toggle it in /system once step 4 is done.
7. Module order inside the JSON array + ALL_*_MODULES should mirror the nav order so the /system toggles read naturally.

## Pending Work
1. Build new modules: Availability Calendar, Documents Vault (behind feature flags)
2. Production deploy (Clerk prod keys + custom domain)
3. Refactor admin page into separate component files
4. Mobile responsiveness (needs different approach — file transfers corrupt the code)
5. Delete empty record accidentally created in Properties table
