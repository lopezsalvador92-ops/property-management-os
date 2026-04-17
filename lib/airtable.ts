// Generic Airtable GET helper. Tenant-agnostic — caller passes baseId + tableId,
// typically sourced from getTenant().
//
// For routes that need POST/PATCH/DELETE, just call fetch directly —
// this helper only covers the read-with-query-params case.

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN!;

export async function airtableFetch(
  baseId: string,
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

  const url = `https://api.airtable.com/v0/${baseId}/${tableId}?${params}`;

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
