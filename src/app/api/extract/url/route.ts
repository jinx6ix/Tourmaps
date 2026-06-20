import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchUrlText } from "@/lib/extraction/url";
import { extractItineraryFromText } from "@/lib/extraction/extract-text";
import { resolveStopCoordinates, computeRouteSegments } from "@/lib/pipeline";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { url } = await request.json();
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Missing URL" }, { status: 400 });
  }

  try {
    const rawText = await fetchUrlText(url);
    const extraction = await extractItineraryFromText(rawText);

    const resolvedStops = await resolveStopCoordinates(extraction.stops);
    const segments = await computeRouteSegments(resolvedStops);

    return NextResponse.json({
      title: extraction.title,
      summary: extraction.summary,
      warnings: extraction.warnings ?? [],
      stops: resolvedStops,
      segments,
      sourceType: "url" as const,
      sourceReference: url,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Extraction failed";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
