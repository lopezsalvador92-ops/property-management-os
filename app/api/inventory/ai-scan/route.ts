import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 60;

const SUGGESTED_CATEGORIES = ["Linens", "Towels", "Bath Amenities", "Kitchen", "Cleaning Supplies", "Pool", "Office", "Appliance", "Electronics", "Tools", "Outdoor", "Pantry"];

const SYSTEM_PROMPT = `You identify inventory items in photos from a luxury villa property-management company in Los Cabos, Mexico. You are looking at supply closets, linen shelves, pool cabinets, pantries, utility rooms, etc.

Return ONLY a JSON object (no prose, no markdown fences) with this exact shape:
{
  "items": [
    {
      "item": string,           // Title Case noun phrase, e.g. "Pool Towels", "Hand Soap", "Gas Water Heater". Capitalize every significant word.
      "trackingType": "asset" | "inventory",  // See rules below — asset = individually tracked with its own repair history + QR; inventory = fungible consumable counted in bulk.
      "category": string,       // Be specific. Prefer these when they fit: ${SUGGESTED_CATEGORIES.join(", ")}. If none fits, propose your own 1-2 word category (e.g. "HVAC", "Plumbing", "Safety").
      "brand": string,          // Visible brand name if clearly readable on the item (e.g. "Samsung", "Bosch", "Flux"). Empty string if not visible.
      "model": string,          // Visible model name/number if readable (e.g. "TL-18", "WF45T6000AW"). Empty string if not visible.
      "count": number,          // How many of this exact item are visible. For assets, each gets its own record. For inventory, this is the stock level.
      "unit": string,           // Only meaningful for inventory. Use: "roll", "bottle", "pack", "bar", "pair", "box", "bag", "tube", "set". Use "unit" generically. NEVER return "each".
      "notes": string           // optional short descriptor (color, size, material) — empty string if nothing useful to add. Don't duplicate brand/model here.
    }
  ],
  "confidence": "high" | "medium" | "low"
}

Tracking type rules (critical — this decides the data model):
- "asset": durable, individually-tracked, repairable items that deserve their own repair history and QR code. Examples: water heaters, A/C units, TVs, washers, dryers, microwaves, fridges, pool pumps, routers, furniture, tools. If there are 4 water heaters, the user wants 4 separate asset records.
- "inventory": fungible consumables counted in bulk. Examples: towels, sheets, soap, toilet paper, pool chlorine, kitchen supplies, cleaning chemicals, batteries, pantry items. 24 pool towels is ONE inventory row with count 24, not 24 rows.
- When in doubt for high-value or branded items (>$100 and individually identifiable), prefer "asset".

Category guidance:
- Linens: sheets, pillowcases, duvet covers, blankets
- Towels: bath, hand, pool, beach, kitchen towels
- Bath Amenities: shampoo, conditioner, soap, lotion, toilet paper, tissues
- Kitchen: dish soap, sponges, paper towels, foil, cookware
- Cleaning Supplies: detergents, chemicals, mops, brooms, gloves
- Pool: chlorine, test kits, floats, pool-specific chemicals
- Office: pens, paper, batteries, light bulbs, stationery
- Appliance: water heaters, washers, dryers, microwaves, A/C units, fridges
- Electronics: TVs, speakers, routers, remotes
- Pantry: dry goods, canned goods, oils, spices
- If you see something that clearly fits a different bucket (HVAC, Safety, Plumbing, Furniture, Decor), use that word.

Rules:
- Group similar items (don't return 12 rows for 12 identical towels — return one row with currentStock: 12).
- Only include items you can actually see in the photo. Do not hallucinate items.
- If the photo is blurry, dark, or ambiguous, lower confidence and return fewer items you're certain about.
- Keep item names short and generic, unless a visible brand/model is useful (e.g. "Gas water heater — FluxTL").
- Never use "each" as a unit — pick something more specific or use "unit".`;

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

    const titleCase = (s: string) => s
      .split(/(\s+)/)
      .map(tok => {
        if (/^\s+$/.test(tok)) return tok;
        if (/^(a|an|and|or|the|of|for|in|on|to|by|with)$/i.test(tok)) return tok.toLowerCase();
        return tok.charAt(0).toUpperCase() + tok.slice(1).toLowerCase();
      })
      .join("")
      .replace(/^./, c => c.toUpperCase());

    const ASSET_HINTS = /heater|hvac|a\/c|air cond|fridge|refriger|washer|dryer|oven|microwave|dishwasher|tv|television|speaker|router|modem|pump|sofa|couch|chair|desk|bed frame|mattress|lamp|fan|grill|bbq/i;
    const INVENTORY_HINTS = /towel|sheet|linen|pillow|soap|shampoo|conditioner|lotion|toilet paper|tissue|paper towel|detergent|chlorine|battery|bulb|sponge|glove|wipe|trash bag|napkin/i;

    parsed.items = parsed.items.map((it: any) => {
      let unit = String(it.unit || "").trim();
      if (!unit || unit.toLowerCase() === "each") unit = "unit";
      const rawCount = Number(it.count ?? it.currentStock);
      const count = Number.isFinite(rawCount) && rawCount > 0 ? Math.round(rawCount) : 1;
      const name = titleCase(String(it.item || "").trim());
      let trackingType: "asset" | "inventory" = it.trackingType === "asset" ? "asset" : it.trackingType === "inventory" ? "inventory" : "inventory";
      if (!it.trackingType) {
        if (ASSET_HINTS.test(name)) trackingType = "asset";
        else if (INVENTORY_HINTS.test(name)) trackingType = "inventory";
      }
      return {
        item: name,
        trackingType,
        category: String(it.category || "").trim(),
        brand: String(it.brand || "").trim(),
        model: String(it.model || "").trim(),
        count,
        unit,
        notes: String(it.notes || "").trim(),
      };
    }).filter((it: any) => it.item);

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error("Inventory AI scan error:", error);
    return NextResponse.json({ error: error?.message || "AI scan failed" }, { status: 500 });
  }
}
