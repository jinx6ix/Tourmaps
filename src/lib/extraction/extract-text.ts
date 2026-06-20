import OpenAI from "openai";
import type { ExtractionResult } from "@/types/itinerary";

// NVIDIA NIM exposes an OpenAI-compatible /v1/chat/completions endpoint —
// same key/account as the Media Hub's vision API, just a different model.
// MiniMax-M3 is multimodal (text/image/video), though this extraction path
// only ever sends text content. Swapping models later is a one-line change
// to NIM_MODEL below.
const nvidia = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: "https://integrate.api.nvidia.com/v1",
});

const NIM_MODEL = "minimaxai/minimax-m3";

const EXTRACTION_SYSTEM_PROMPT = `You are an itinerary parser for an African safari and tour company. You will be given raw text from a travel itinerary (PDF, webpage, or free-text description) and must extract a structured, day-by-day list of stops.

Rules:
- Identify every distinct location mentioned: cities, game parks/reserves, accommodations (lodges/camps/hotels), airports/airstrips, and notable activities tied to a specific place.
- Assign each stop a "day" number matching the itinerary's day structure. If a stop spans multiple days (e.g. a 3-night lodge stay), use the day the guest arrives there, and set "nights" accordingly.
- Classify each stop's "type" as exactly one of: destination, accommodation, game_park, airport, activity.
- Set "arrivalMode" to "air" if the text indicates a flight, bush flight, or charter to reach that stop; "road" if it indicates driving or a road transfer; omit if unclear.
- Do not invent locations that are not mentioned in the text.
- Do not include coordinates — only names. A separate geocoding step will resolve coordinates.
- Write a short "description" (1 sentence) for each stop based on what the text says about it, in your own words.
- Produce a "title" summarizing the overall itinerary (e.g. "10-Day Kenya Highlights Safari") and a 1-2 sentence "summary".
- If any part of the itinerary is ambiguous or you're not confident in a particular day's parsing, note it in a "warnings" array of short strings. Do not guess wildly — flag uncertainty instead.

Respond with ONLY valid JSON matching this exact shape. No preamble, no markdown code fences, no reasoning or commentary before or after the JSON — the entire response body must be the JSON object itself:
{
  "title": string,
  "summary": string,
  "stops": [
    {
      "day": number,
      "type": "destination" | "accommodation" | "game_park" | "airport" | "activity",
      "name": string,
      "description": string,
      "nights": number | null,
      "arrivalMode": "road" | "air" | null
    }
  ],
  "warnings": string[]
}`;

function parseExtractionResponse(rawText: string): ExtractionResult {
  let cleaned = rawText.trim();

  // Some NIM models emit a <think>...</think> reasoning block before the
  // actual answer, even when instructed not to. Strip it if present.
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  // Defensive: strip markdown fences if the model adds them despite instructions.
  cleaned = cleaned.replace(/^```json\s*|\s*```$/g, "").trim();

  // Some models wrap the JSON with stray prose despite instructions — fall
  // back to extracting the outermost {...} block if direct parsing fails.
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("Extraction model did not return valid JSON");
    }
    parsed = JSON.parse(match[0]);
  }

  const result = parsed as Partial<ExtractionResult>;
  if (!result.title || !Array.isArray(result.stops)) {
    throw new Error("Extraction response did not match expected shape");
  }

  return result as ExtractionResult;
}

/**
 * Extracts structured itinerary stops from raw text — used by the PDF, URL,
 * and free-text ingestion paths, all of which reduce to "I have text, give
 * me stops." The structured form path skips this and maps directly.
 *
 * Uses NVIDIA NIM (free tier) rather than a paid provider. The free tier
 * carries a shared ~40 requests/minute cap across all NIM calls on the key
 * (including the Media Hub's vision API if it's the same key) — a 429 here
 * surfaces as a clear "try again shortly" error rather than a silent failure.
 */
export async function extractItineraryFromText(
  rawText: string
): Promise<ExtractionResult> {
  // Truncate extremely long documents to keep latency bounded — most
  // itinerary PDFs are well under this, this guards against outliers.
  const truncated = rawText.slice(0, 60000);

  let response;
  try {
    response = await nvidia.chat.completions.create({
      model: NIM_MODEL,
      max_tokens: 8192,
      // Note: 1.0 is high for a data-extraction task — at this temperature
      // the model is more likely to vary stop names/wording between runs
      // or occasionally drift from the requested JSON shape. The fallback
      // parsing below absorbs minor formatting drift, but if extraction
      // quality gets inconsistent in practice, dropping this toward
      // 0.2-0.4 is the first thing to try.
      temperature: 1.0,
      top_p: 0.95,
      messages: [
        { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
        { role: "user", content: `Here is the itinerary text:\n\n${truncated}` },
      ],
    });
  } catch (err) {
    const status = (err as { status?: number })?.status;
    if (status === 429) {
      throw new Error(
        "The extraction model is rate-limited right now (NVIDIA NIM free tier). Wait a minute and try again."
      );
    }
    throw err;
  }

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from extraction model");
  }

  return parseExtractionResponse(content);
}
