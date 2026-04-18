import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 60;

const CATEGORIES = [
  "Utilities",
  "Villa Staff",
  "Maintenance",
  "Cleaning Supplies",
  "Groceries",
  "Miscellaneous",
  "Others",
  "Rental Expenses",
];

const SYSTEM_PROMPT = `You extract structured data from a photo or PDF of a receipt/invoice for a luxury villa property-management company in Los Cabos, Mexico.

Return ONLY a JSON object (no prose, no markdown fences) with this exact shape:
{
  "vendor": string,           // store/supplier name as printed
  "date": string,             // YYYY-MM-DD. If only DD/MM/YYYY visible, convert. Prefer the transaction date, not the print date.
  "total": number,            // final total paid (after tax). Number only, no symbols.
  "currency": "MXN" | "USD",  // infer from $ symbol + country clues. MXN receipts often say "M.N.", "IVA", or are in Spanish.
  "category": string,         // MUST be one of: ${CATEGORIES.join(", ")}
  "tax": number | null,       // IVA or sales tax amount if broken out, else null
  "description": string,      // short line: what was bought (e.g. "Pool chemicals", "Plumber labor", "Staff groceries")
  "confidence": "high" | "medium" | "low"
}

Category rules:
- Cleaning Supplies: detergents, chemicals, sponges, pool chlorine
- Groceries: supermarket food/drink (Walmart, Soriana, Costco grocery)
- Utilities: CFE (electric), Telmex/Izzi (internet), water, gas (LP)
- Maintenance: repairs, parts, plumber/electrician labor, hardware stores
- Villa Staff: housekeeping pay, gardener pay, handyman labor (not materials)
- Rental Expenses: guest-specific costs (welcome baskets, airport transfers)
- Miscellaneous / Others: use only when nothing else fits

If a field is unreadable, use reasonable inference but lower the confidence. Never invent a total — if unreadable, return 0 and confidence "low".`;

export async function POST(request: Request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
    }

    const body = await request.json().catch(() => ({}));
    const imageUrl: string | undefined = body.imageUrl;
    if (!imageUrl) {
      return NextResponse.json({ error: "imageUrl required" }, { status: 400 });
    }

    const isPdf = imageUrl.toLowerCase().includes(".pdf");

    const client = new Anthropic({ apiKey });

    const content: any[] = [
      {
        type: isPdf ? "document" : "image",
        source: { type: "url", url: imageUrl },
      },
      {
        type: "text",
        text: "Extract the receipt data as JSON per the schema.",
      },
    ];

    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
    });

    const textBlock = response.content.find((b: any) => b.type === "text") as any;
    const raw = textBlock?.text || "";

    let parsed: any = null;
    try {
      const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        try { parsed = JSON.parse(match[0]); } catch {}
      }
    }

    if (!parsed) {
      return NextResponse.json({ error: "Failed to parse OCR response", raw }, { status: 502 });
    }

    if (!CATEGORIES.includes(parsed.category)) {
      parsed.category = "Miscellaneous";
      parsed.confidence = "low";
    }
    if (parsed.currency !== "USD" && parsed.currency !== "MXN") {
      parsed.currency = "MXN";
    }

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error("OCR error:", error);
    return NextResponse.json({ error: error?.message || "OCR failed" }, { status: 500 });
  }
}
