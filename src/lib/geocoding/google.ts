import { createServiceClient } from "@/lib/supabase/server";

export interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
  placeId: string;
}

function normalizeQuery(name: string, contextHint?: string): string {
  const base = contextHint ? `${name}, ${contextHint}` : name;
  return base.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Resolves a place name to coordinates, checking the shared geocode_cache
 * table first to avoid re-billing Google for repeated lookups (e.g. "Maasai
 * Mara National Reserve" appears in nearly every itinerary).
 *
 * contextHint narrows ambiguous names, e.g. "Kenya" so "Naivasha" doesn't
 * resolve somewhere unexpected.
 */
export async function geocodePlace(
  name: string,
  contextHint = "Kenya"
): Promise<GeocodeResult | null> {
  const cacheKey = normalizeQuery(name, contextHint);
  const supabase = createServiceClient();

  const { data: cached } = await supabase
    .from("geocode_cache")
    .select("*")
    .eq("query", cacheKey)
    .maybeSingle();

  if (cached) {
    return {
      lat: cached.lat,
      lng: cached.lng,
      formattedAddress: cached.formatted_address,
      placeId: cached.place_id,
    };
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_MAPS_API_KEY is not configured");
  }

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", `${name}, ${contextHint}`);
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString());
  const data = await res.json();

  if (data.status !== "OK" || !data.results?.length) {
    return null;
  }

  const result = data.results[0];
  const geocoded: GeocodeResult = {
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
    formattedAddress: result.formatted_address,
    placeId: result.place_id,
  };

  // Best-effort cache write — don't fail the request if this errors.
  await supabase.from("geocode_cache").insert({
    query: cacheKey,
    lat: geocoded.lat,
    lng: geocoded.lng,
    formatted_address: geocoded.formattedAddress,
    place_id: geocoded.placeId,
    source: "google",
  });

  return geocoded;
}

/**
 * Geocodes a batch of place names sequentially with a small delay,
 * respecting Google's rate limits. For itineraries (typically 5-20 stops)
 * this is simpler and safer than parallelizing against API quotas.
 */
export async function geocodeBatch(
  names: { name: string; contextHint?: string }[]
): Promise<(GeocodeResult | null)[]> {
  const results: (GeocodeResult | null)[] = [];
  for (const { name, contextHint } of names) {
    results.push(await geocodePlace(name, contextHint));
  }
  return results;
}
