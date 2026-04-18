import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 60;

const CATEGORIES = ["Linens", "Towels", "Bath Amenities", "Kitchen", "Cleaning Supplies", "Pool", "Office", "Other"];

const SYSTEM_PROMPT = `You identify inventory items in photos from a luxury villa property-management company in Los Cabos, Mexico. You are looking at supply closets, linen shelves, pool cabinets, pantries, etc.

Return ONLY a JSON object (no prose, no markdown fences) with this exact shape:
{
  "items": [
    {
      "item": string,           // short noun phrase, e.g. "Pool towels", "Hand soap", "Toilet paper rolls"
      "category": string,       // MUST be one of: ${CATEGORIES.join(", ")}
      "currentStock": number,   // your best visible count. If unclear, estimate conservatively.
      "unit": string,           // "each", "pair", "bottle", "roll", "pack", "box", etc.
      "notes": string           // optional short descriptor (color, brand visible, size) — empty string if nothing to add
    }
  ],
  "confidence": "high" | "medium" | "low"
}

Category rules:
- Linens: sheets, pillowcases, duvet covers, blankets
- Towels: bath, hand, pool, beach, kitchen towels
- Bath Amenities: shampoo, conditioner, soap, lotion, toilet paper, tissues
- Kitchen: dish soap, sponges, paper towels, foil, pantry items
- Cleaning Supplies: detergents, chemicals, mops, brooms, gloves
- Pool: chlorine, test kits, floats, pool-specific chemicals
- Office: pens, paper, batteries, light bulbs, stationery
- Other: anything that doesn't fit above

Rules:
- Group similar items (don't return 12 rows for 12 identical towels — return one row with currentStock: 12).
- Only include items you can actually see in the photo. Do not hallucinate items.
- If the photo is blurry, dark, or ambiguous, lower confidence and return fewer items you're certain about.
- Keep item names short and generic (not brand-specific unless the brand is critical).`;

export async function POST(request: Request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
    }

    const body = await request.json().catch(() => ({}));
    const imageUrls: string[] = Array.isArray(body.imageUrls) ? body.imageUrls : body.imageUrl ? [body.imageUrl] : [];
    if (imageUrls.length === 0) {
      return NextResponse.json({ error: "imageUrls required" }, { status: 400 });
    }

    const client = new Anthropic({ apiKey });

    const content: any[] = [];
    for (const url of imageUrls) {
      content.push({ type: "image", source: { type: "url", url } });
    }
    content.push({
      type: "text",
      text: "Identify every inventory item you can see. Return JSON per the schema. Aggregate duplicates.",
    });

    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 2048,
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

    if (!parsed || !Array.isArray(parsed.items)) {
      return NextResponse.json({ error: "Failed to parse AI response", raw }, { status: 502 });
    }

    parsed.items = parsed.items.map((it: any) => ({
      item: String(it.item || "").trim(),
      category: CATEGORIES.includes(it.category) ? it.category : "Other",
      currentStock: Number.isFinite(Number(it.currentStock)) ? Number(it.currentStock) : 1,
      unit: String(it.unit || "each").trim(),
      notes: String(it.notes || "").trim(),
    })).filter((it: any) => it.item);

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error("Inventory AI scan error:", error);
    return NextResponse.json({ error: error?.message || "AI scan failed" }, { status: 500 });
  }
}
