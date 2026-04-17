/**
 * seed-demo.ts — populate the Property Management OS demo base with
 * ~3 months of synthetic expenses + deposits + one monthly report per property.
 *
 * Usage:
 *   1) Fill .env.local with the new demo base id + token + all AIRTABLE_TABLE_*
 *      ids from the duplicated base.
 *   2) npx tsx scripts/seed-demo.ts
 *
 * Safe to re-run? No. It's additive — records accumulate on each run.
 * If you want a clean slate, empty the target tables in Airtable first.
 *
 * What it writes (per Active property):
 *   - ~12 expenses per month × 3 months (Jan / Feb / Mar of the current year)
 *     spread across all expense categories, ~70% MXN / 30% USD
 *   - 1 deposit per month × 3 months
 *   - 1 Monthly Report per month × 3 months with rolled-up totals
 *
 * This script intentionally writes in small batches (10 records per POST — the
 * Airtable API cap) and sleeps briefly between calls to stay under the 5 req/s
 * per-base rate limit.
 */

import { config } from "dotenv";
import path from "node:path";

config({ path: path.join(process.cwd(), ".env.local") });

// ---------- env ----------
const TOKEN = required("AIRTABLE_TOKEN");
const BASE = required("AIRTABLE_BASE_ID");
const T = {
  properties: required("AIRTABLE_TABLE_PROPERTIES"),
  expenses: required("AIRTABLE_TABLE_EXPENSES"),
  deposits: required("AIRTABLE_TABLE_DEPOSITS"),
  reports: required("AIRTABLE_TABLE_REPORTS"),
};

function required(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env var: ${key}`);
  return v;
}

// ---------- demo config ----------
const YEAR = new Date().getFullYear();
const MONTHS = [0, 1, 2]; // Jan, Feb, Mar
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const CATEGORIES = [
  "Cleaning Supplies", "Groceries", "Maintenance", "Miscellaneous",
  "Utilities", "Villa Staff", "Others",
];

const SUPPLIERS = [
  "Chedraui", "La Comer", "Home Depot", "Costco", "CFE",
  "Telmex", "Pool Service Co", "Garden Crew", "Handyman MX", "Amazon MX",
];

const FX_RATE = 17.2; // MXN per USD for the demo

// ---------- helpers ----------
async function airtable(
  table: string,
  method: "GET" | "POST",
  body?: unknown,
  query?: Record<string, string>,
) {
  const qs = query ? "?" + new URLSearchParams(query).toString() : "";
  const res = await fetch(`https://api.airtable.com/v0/${BASE}/${table}${qs}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Airtable ${method} ${table} ${res.status}: ${txt}`);
  }
  return res.json();
}

async function createBatch(table: string, records: { fields: Record<string, any> }[]) {
  // Airtable allows up to 10 records per POST.
  const out: any[] = [];
  for (let i = 0; i < records.length; i += 10) {
    const chunk = records.slice(i, i + 10);
    const data = await airtable(table, "POST", { records: chunk, typecast: true });
    out.push(...data.records);
    await sleep(250);
  }
  return out;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const round2 = (n: number) => Math.round(n * 100) / 100;

function randomDate(year: number, month: number): string {
  const day = 1 + Math.floor(Math.random() * 28);
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// ---------- fetchers ----------
async function listActiveProperties() {
  const params = new URLSearchParams();
  ["House Name", "Preferred Currency", "Status"].forEach((f) => params.append("fields[]", f));
  params.set("filterByFormula", `{Status} = 'Active'`);
  params.set("pageSize", "100");

  const all: { id: string; name: string; currency: string }[] = [];
  let offset: string | undefined;
  do {
    const q: Record<string, string> = {};
    params.forEach((v, k) => (q[k] = v));
    if (offset) q.offset = offset;
    const data = await airtable(T.properties, "GET", undefined, q);
    for (const rec of data.records) {
      const currRaw = rec.fields["Preferred Currency"];
      const currency = typeof currRaw === "string" ? currRaw : currRaw?.name || "MXN";
      all.push({
        id: rec.id,
        name: rec.fields["House Name"] || "",
        currency,
      });
    }
    offset = data.offset;
  } while (offset);
  return all;
}

// ---------- generators ----------
function buildExpensesFor(
  property: { id: string; name: string; currency: string },
  year: number,
  month: number,
) {
  const count = 10 + Math.floor(Math.random() * 5); // 10–14 per month
  const records: { fields: Record<string, any> }[] = [];
  for (let i = 0; i < count; i++) {
    const isUSD = Math.random() < 0.3;
    const currency = isUSD ? "USD" : "MXN";
    const category = pick(CATEGORIES);
    const amount = round2(
      isUSD ? rand(20, 400) : rand(300, 8000),
    );
    const amountUSD = isUSD ? amount : round2(amount / FX_RATE);
    records.push({
      fields: {
        "Description": `${category} — ${pick(SUPPLIERS)}`,
        "Total": amount,
        "Total Amount (USD)": amountUSD,
        "Expense Category": category,
        "Date": randomDate(year, month),
        "Currency": currency,
        "Supplier": pick(SUPPLIERS),
        "House": [property.id],
      },
    });
  }
  return records;
}

function buildDepositFor(
  property: { id: string; name: string; currency: string },
  year: number,
  month: number,
) {
  const isUSD = property.currency === "USD";
  const amount = round2(isUSD ? rand(1500, 5000) : rand(30000, 90000));
  return {
    fields: {
      "Date": `${year}-${String(month + 1).padStart(2, "0")}-05`,
      "House Name": [property.id],
      "Amount": amount,
      "Notes": `Demo deposit — ${MONTH_NAMES[month]} ${year}`,
    },
  };
}

function buildReportFor(
  property: { id: string; name: string; currency: string },
  year: number,
  month: number,
  totals: { expensesMXN: number; expensesUSD: number; deposits: number },
) {
  const isUSD = property.currency === "USD";
  const startingBalance = round2(isUSD ? rand(500, 3000) : rand(5000, 25000));
  const finalBalance = round2(
    startingBalance + totals.deposits - (isUSD ? totals.expensesUSD : totals.expensesMXN),
  );
  return {
    fields: {
      "House Name": [property.id],
      "Month and Year": `${MONTH_NAMES[month]} ${year}`,
      "Status": "Draft",
      "Starting Balance": startingBalance,
      "Total Expenses MXN": round2(totals.expensesMXN),
      "Total Expenses USD": round2(totals.expensesUSD),
      "Total Deposits": round2(totals.deposits),
      "Final Balance MXN": isUSD ? 0 : finalBalance,
      "Final Balance USD": isUSD ? finalBalance : 0,
      "Monthly Exchange Rate": FX_RATE,
    },
  };
}

// ---------- main ----------
async function main() {
  console.log(`[seed] base=${BASE}`);
  const properties = await listActiveProperties();
  console.log(`[seed] found ${properties.length} active properties`);
  if (properties.length === 0) {
    console.error("No active properties in the base. Seed those manually first.");
    process.exit(1);
  }

  for (const prop of properties) {
    console.log(`\n[seed] ${prop.name} (${prop.currency})`);
    for (const month of MONTHS) {
      const expenseRecs = buildExpensesFor(prop, YEAR, month);
      const created = await createBatch(T.expenses, expenseRecs);

      let expensesMXN = 0;
      let expensesUSD = 0;
      for (const rec of created) {
        const total = rec.fields["Total"] || 0;
        const totalUSD = rec.fields["Total Amount (USD)"] || 0;
        if (rec.fields["Currency"] === "USD") {
          expensesUSD += total;
          expensesMXN += totalUSD * FX_RATE;
        } else {
          expensesMXN += total;
          expensesUSD += totalUSD;
        }
      }

      const depositRec = buildDepositFor(prop, YEAR, month);
      await createBatch(T.deposits, [depositRec]);
      const deposits = depositRec.fields["Amount"];

      const reportRec = buildReportFor(prop, YEAR, month, {
        expensesMXN,
        expensesUSD,
        deposits,
      });
      await createBatch(T.reports, [reportRec]);

      console.log(
        `  ${MONTH_NAMES[month]}: ${created.length} expenses, 1 deposit, 1 report`,
      );
    }
  }

  console.log("\n[seed] done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
