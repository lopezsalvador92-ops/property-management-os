const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;

const TABLES = {
  properties: "tblCTRtMtVNv0F63W",
  expenses: "tblHeiBjXhsKW9Opj",
  deposits: "tblVrgidgJKKfdFQ2",
  monthlyReports: "tblBei4KzIMDMT87X",
  housekeepingLog: "tblG8udG0Wdo6Wms6",
  guestRentals: "tblAG4GqV5jCgAC7x",
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