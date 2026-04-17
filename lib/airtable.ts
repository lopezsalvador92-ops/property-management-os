const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;

const TABLES = {
  properties: process.env.AIRTABLE_TABLE_PROPERTIES!,
  expenses: process.env.AIRTABLE_TABLE_EXPENSES!,
  deposits: process.env.AIRTABLE_TABLE_DEPOSITS!,
  monthlyReports: process.env.AIRTABLE_TABLE_REPORTS!,
  housekeepingLog: process.env.AIRTABLE_TABLE_HOUSEKEEPING!,
  guestRentals: process.env.AIRTABLE_TABLE_RENTALS!,
};

export async function airtableFetch(
  tableId: string,
  options?: {
    fields?: string[];
    pageSize?: number;
    sort?: { field: string; direction: "asc" | "desc" }[];
    filterFormula?: string;
  }
) {
  const params = new URLSearchParams();

  if (options?.fields) {
    options.fields.forEach((f) => params.append("fields[]", f));
  }
  if (options?.pageSize) {
    params.set("pageSize", options.pageSize.toString());
  }
  if (options?.sort) {
    options.sort.forEach((s, i) => {
      params.set(`sort[${i}][field]`, s.field);
      params.set(`sort[${i}][direction]`, s.direction);
    });
  }
  if (options?.filterFormula) {
    params.set("filterByFormula", options.filterFormula);
  }

  const url = `https://api.airtable.com/v0/${BASE_ID}/${tableId}?${params}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${AIRTABLE_TOKEN}`,
    },
    next: { revalidate: 30 },
  });

  if (!res.ok) {
    throw new Error(`Airtable error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export { TABLES };